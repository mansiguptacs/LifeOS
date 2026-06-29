import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRoute, type RouteProfile, type RouteBarrier } from "@/lib/routing";

export const dynamic = "force-dynamic";

const VALID_PROFILES: RouteProfile[] = ["wheelchair", "stroller", "walking"];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const origin = body.origin as { lat: number; lng: number } | undefined;
  const destination = body.destination as
    | { lat: number; lng: number }
    | undefined;
  const profileInput = body.profile as RouteProfile | undefined;
  const originLabel = (body.originLabel as string) ?? "Start";
  const destinationLabel = (body.destinationLabel as string) ?? "Destination";

  if (
    !origin ||
    !destination ||
    typeof origin.lat !== "number" ||
    typeof destination.lat !== "number"
  ) {
    return NextResponse.json(
      { error: "origin and destination {lat,lng} are required" },
      { status: 400 },
    );
  }
  const profile =
    profileInput && VALID_PROFILES.includes(profileInput)
      ? profileInput
      : "wheelchair";

  // Barriers to avoid: open/verified reports + out-of-service elevators.
  const [reports, brokenFeatures] = await Promise.all([
    prisma.report.findMany({
      where: { status: { in: ["open", "verified"] } },
    }),
    prisma.accessibilityFeature.findMany({
      where: { status: "out_of_service" },
    }),
  ]);

  const barriers: RouteBarrier[] = [
    ...reports.map((r) => ({
      id: r.id,
      kind: "report" as const,
      label: r.description,
      lat: r.lat,
      lng: r.lng,
      severity: r.severity as "low" | "medium" | "high",
    })),
    ...brokenFeatures.map((f) => ({
      id: f.id,
      kind: "feature" as const,
      label: `${f.name} (out of service)`,
      lat: f.lat,
      lng: f.lng,
      severity: "high" as const,
    })),
  ];

  const result = await buildRoute(origin, destination, profile, barriers);
  if (!result) {
    return NextResponse.json(
      { error: "Could not compute a route right now. Please try again." },
      { status: 502 },
    );
  }

  // Best-effort logging; never block the response on it.
  prisma.routeLog
    .create({
      data: {
        originLabel,
        destinationLabel,
        profile,
        barriersAvoided: result.barriersAvoided.length,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
      },
    })
    .catch(() => {});

  return NextResponse.json(result);
}
