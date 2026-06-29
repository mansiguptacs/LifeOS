import { haversineMeters, squareAround, type LatLng } from "@/lib/geo";

export type RouteProfile = "wheelchair" | "stroller" | "walking";

export type RouteBarrier = {
  id: string;
  kind: "report" | "feature";
  label: string;
  lat: number;
  lng: number;
  severity: "low" | "medium" | "high";
};

export type RouteResult = {
  provider: "openrouteservice" | "osrm";
  profile: RouteProfile;
  coordinates: [number, number][]; // [lng, lat]
  distanceMeters: number;
  durationSeconds: number;
  barriersAvoided: RouteBarrier[];
  barriersOnRoute: RouteBarrier[];
  detoured: boolean;
};

const AVOID_RADIUS_M = 45; // a barrier this close to the path is "on the route"
const DETOUR_OFFSET_M = 160; // how far to push a detour waypoint off the barrier

// ---- geometry helpers ----

function toXY(p: LatLng, origin: LatLng): { x: number; y: number } {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (p.lng - origin.lng) * mPerDegLng,
    y: (p.lat - origin.lat) * mPerDegLat,
  };
}

function fromXY(x: number, y: number, origin: LatLng): LatLng {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return { lat: origin.lat + y / mPerDegLat, lng: origin.lng + x / mPerDegLng };
}

/** Minimum distance (m) from a point to a polyline, plus the nearest segment. */
function pointToPolyline(
  point: LatLng,
  line: [number, number][],
): { distance: number; segIndex: number; t: number } {
  let best = { distance: Infinity, segIndex: 0, t: 0 };
  const o = point;
  const p = toXY(point, o);
  for (let i = 0; i < line.length - 1; i++) {
    const a = toXY({ lng: line[i][0], lat: line[i][1] }, o);
    const b = toXY({ lng: line[i + 1][0], lat: line[i + 1][1] }, o);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * abx;
    const cy = a.y + t * aby;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < best.distance) best = { distance: d, segIndex: i, t };
  }
  return best;
}

/** A detour waypoint pushed perpendicular to the route at the barrier, on a given side. */
function detourWaypoint(
  barrier: LatLng,
  line: [number, number][],
  side: 1 | -1,
): LatLng {
  const { segIndex } = pointToPolyline(barrier, line);
  const o = barrier;
  const a = toXY({ lng: line[segIndex][0], lat: line[segIndex][1] }, o);
  const b = toXY(
    { lng: line[segIndex + 1][0], lat: line[segIndex + 1][1] },
    o,
  );
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  // Perpendicular direction.
  const px = -dy * side;
  const py = dx * side;
  return fromXY(px * DETOUR_OFFSET_M, py * DETOUR_OFFSET_M, o);
}

function countOnRoute(
  barriers: RouteBarrier[],
  line: [number, number][],
): RouteBarrier[] {
  return barriers.filter(
    (b) => pointToPolyline({ lat: b.lat, lng: b.lng }, line).distance <= AVOID_RADIUS_M,
  );
}

// ---- external routing providers ----

// Average travel speed (metres/second) by profile. Used to derive a realistic
// ETA from route distance: the public OSRM demo server only ships the driving
// profile, so its reported durations are car speeds and unusable for a
// pedestrian/wheelchair app. We always recompute the ETA from distance instead.
const PROFILE_SPEED_MPS: Record<RouteProfile, number> = {
  wheelchair: 0.9, // ~3.2 km/h — comfortable manual-wheelchair pace
  stroller: 1.15, // ~4.1 km/h
  walking: 1.35, // ~4.9 km/h — average adult walking pace
};

function estimateDuration(distanceMeters: number, profile: RouteProfile): number {
  return distanceMeters / PROFILE_SPEED_MPS[profile];
}

function osrmProfile(profile: RouteProfile): string {
  // Public OSRM demo reliably serves these; "foot" for pedestrian profiles.
  return profile === "walking" ? "foot" : "foot";
}


async function osrmRoute(
  waypoints: LatLng[],
  profile: RouteProfile,
): Promise<{
  coordinates: [number, number][];
  distance: number;
  duration: number;
} | null> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/${osrmProfile(
    profile,
  )}/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  return {
    coordinates: route.geometry.coordinates as [number, number][],
    distance: route.distance,
    duration: route.duration,
  };
}

function orsProfile(profile: RouteProfile): string {
  if (profile === "wheelchair") return "wheelchair";
  return "foot-walking";
}

async function orsRoute(
  origin: LatLng,
  destination: LatLng,
  profile: RouteProfile,
  avoid: RouteBarrier[],
  apiKey: string,
): Promise<{
  coordinates: [number, number][];
  distance: number;
  duration: number;
} | null> {
  const body: Record<string, unknown> = {
    coordinates: [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ],
  };
  if (avoid.length > 0) {
    body.options = {
      avoid_polygons: {
        type: "MultiPolygon",
        coordinates: avoid.map((b) => [
          squareAround({ lat: b.lat, lng: b.lng }, 30),
        ]),
      },
    };
  }
  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/${orsProfile(
      profile,
    )}/geojson`,
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const feat = data?.features?.[0];
  if (!feat) return null;
  return {
    coordinates: feat.geometry.coordinates as [number, number][],
    distance: feat.properties.summary.distance,
    duration: feat.properties.summary.duration,
  };
}

// ---- main entry ----

export async function buildRoute(
  origin: LatLng,
  destination: LatLng,
  profile: RouteProfile,
  barriers: RouteBarrier[],
): Promise<RouteResult | null> {
  const orsKey = process.env.ORS_API_KEY?.trim();

  // Preferred: OpenRouteService with native accessibility profile + avoidance.
  if (orsKey) {
    const ors = await orsRoute(origin, destination, profile, barriers, orsKey);
    if (ors) {
      const onRoute = countOnRoute(barriers, ors.coordinates);
      const avoided = barriers.filter(
        (b) => !onRoute.some((o) => o.id === b.id),
      );
      return {
        provider: "openrouteservice",
        profile,
        coordinates: ors.coordinates,
        distanceMeters: ors.distance,
        durationSeconds: estimateDuration(ors.distance, profile),
        barriersAvoided: avoided,
        barriersOnRoute: onRoute,
        detoured: barriers.length > 0,
      };
    }
  }

  // Fallback: OSRM direct route, then a detour waypoint around the worst barrier.
  const direct = await osrmRoute([origin, destination], profile);
  if (!direct) return null;

  const onDirect = countOnRoute(barriers, direct.coordinates);
  if (onDirect.length === 0) {
    return {
      provider: "osrm",
      profile,
      coordinates: direct.coordinates,
      distanceMeters: direct.distance,
      durationSeconds: estimateDuration(direct.distance, profile),
      barriersAvoided: [],
      barriersOnRoute: [],
      detoured: false,
    };
  }

  // Pick the most important barrier to route around.
  const sevRank = { high: 3, medium: 2, low: 1 };
  const worst = [...onDirect].sort(
    (a, b) => sevRank[b.severity] - sevRank[a.severity],
  )[0];

  let bestResult = {
    coordinates: direct.coordinates,
    distance: direct.distance,
    duration: direct.duration,
  };
  let bestOnRoute = onDirect;

  for (const side of [1, -1] as const) {
    const via = detourWaypoint(
      { lat: worst.lat, lng: worst.lng },
      direct.coordinates,
      side,
    );
    const detour = await osrmRoute([origin, via, destination], profile);
    if (!detour) continue;
    const onDetour = countOnRoute(barriers, detour.coordinates);
    // Prefer routes that clear more barriers without ballooning distance.
    const reasonable = detour.distance < direct.distance * 2.2;
    if (reasonable && onDetour.length < bestOnRoute.length) {
      bestResult = detour;
      bestOnRoute = onDetour;
    }
  }

  const avoided = onDirect.filter(
    (b) => !bestOnRoute.some((o) => o.id === b.id),
  );

  return {
    provider: "osrm",
    profile,
    coordinates: bestResult.coordinates,
    distanceMeters: bestResult.distance,
    durationSeconds: estimateDuration(bestResult.distance, profile),
    barriersAvoided: avoided,
    barriersOnRoute: bestOnRoute,
    detoured: avoided.length > 0,
  };
}

export { haversineMeters };
