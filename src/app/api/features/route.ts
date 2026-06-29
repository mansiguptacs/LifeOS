import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const features = await prisma.accessibilityFeature.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(
    features.map((f) => ({
      id: f.id,
      type: f.type,
      name: f.name,
      lat: f.lat,
      lng: f.lng,
      status: f.status,
      notes: f.notes,
    })),
  );
}
