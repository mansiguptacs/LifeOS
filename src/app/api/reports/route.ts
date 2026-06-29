import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  ReportType,
  Severity,
} from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const VALID_TYPES: ReportType[] = [
  "broken_elevator",
  "blocked_sidewalk",
  "missing_ramp",
  "steep_incline",
  "stairs_only",
  "no_accessible_restroom",
  "other",
];
const VALID_SEVERITY: Severity[] = ["low", "medium", "high"];

export async function GET() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      type: r.type,
      lat: r.lat,
      lng: r.lng,
      description: r.description,
      severity: r.severity,
      status: r.status,
      photoUrl: r.photoUrl,
      aiAnalysis: r.aiAnalysis,
      votes: r.votes,
      createdAt: r.createdAt.toISOString(),
    })),
  );
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, lat, lng, description, severity, photoUrl, aiAnalysis, deviceId } =
    body as {
      type?: ReportType;
      lat?: number;
      lng?: number;
      description?: string;
      severity?: Severity;
      photoUrl?: string | null;
      aiAnalysis?: unknown;
      deviceId?: string | null;
    };

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "lat and lng are required numbers" },
      { status: 400 },
    );
  }
  if (!description || description.trim().length < 3) {
    return NextResponse.json(
      { error: "A short description is required" },
      { status: 400 },
    );
  }
  const sev: Severity =
    severity && VALID_SEVERITY.includes(severity) ? severity : "medium";

  const report = await prisma.report.create({
    data: {
      type,
      lat,
      lng,
      description: description.trim(),
      severity: sev,
      photoUrl: photoUrl ?? null,
      aiAnalysis: (aiAnalysis as object) ?? undefined,
      deviceId: deviceId ?? null,
    },
  });

  return NextResponse.json(
    {
      id: report.id,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      description: report.description,
      severity: report.severity,
      status: report.status,
      photoUrl: report.photoUrl,
      aiAnalysis: report.aiAnalysis,
      votes: report.votes,
      createdAt: report.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
