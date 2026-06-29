export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters between two points. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** A small square polygon (GeoJSON ring) around a point, sized in meters. */
export function squareAround(p: LatLng, halfSizeMeters: number): number[][] {
  const dLat = halfSizeMeters / 111_320;
  const dLng = halfSizeMeters / (111_320 * Math.cos(toRad(p.lat)));
  // GeoJSON uses [lng, lat] order and a closed ring.
  return [
    [p.lng - dLng, p.lat - dLat],
    [p.lng + dLng, p.lat - dLat],
    [p.lng + dLng, p.lat + dLat],
    [p.lng - dLng, p.lat + dLat],
    [p.lng - dLng, p.lat - dLat],
  ];
}

/** Demo anchor coordinates. */
export const SAN_JOSE_CONVENTION_CENTER: LatLng = {
  lat: 37.3296,
  lng: -121.8895,
};
export const SANTA_CLARA_CONVENTION_CENTER: LatLng = {
  lat: 37.4044,
  lng: -121.9783,
};

/** Map view centered on the demo corridor. */
export const DEMO_CENTER: LatLng = {
  lat: (SAN_JOSE_CONVENTION_CENTER.lat + SANTA_CLARA_CONVENTION_CENTER.lat) / 2,
  lng: (SAN_JOSE_CONVENTION_CENTER.lng + SANTA_CLARA_CONVENTION_CENTER.lng) / 2,
};
