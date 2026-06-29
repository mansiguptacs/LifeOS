import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  FeatureType,
  FeatureStatus,
  ReportType,
  Severity,
  ReportStatus,
} from "../src/generated/prisma/client";
import { getPgPoolConfig } from "../src/lib/pgConfig";

const adapter = new PrismaPg(getPgPoolConfig());
const prisma = new PrismaClient({ adapter });

// Corridor: San Jose McEnery Convention Center -> Santa Clara Convention Center
// Points roughly follow the VTA light rail / N First St / Tasman Dr corridor.
const features: {
  type: FeatureType;
  name: string;
  lat: number;
  lng: number;
  status?: FeatureStatus;
  notes?: string;
}[] = [
  {
    type: FeatureType.entrance,
    name: "San Jose McEnery Convention Center — Accessible Entrance (San Carlos St)",
    lat: 37.3299,
    lng: -121.889,
    notes: "Step-free main entrance with automatic doors.",
  },
  {
    type: FeatureType.restroom,
    name: "Convention Center Accessible Restroom",
    lat: 37.3301,
    lng: -121.8888,
  },
  {
    type: FeatureType.transit_station,
    name: "Convention Center VTA Light Rail Station",
    lat: 37.3304,
    lng: -121.8884,
    notes: "Level boarding platform.",
  },
  {
    type: FeatureType.elevator,
    name: "Paseo de San Antonio Garage Elevator",
    lat: 37.3338,
    lng: -121.8865,
    status: FeatureStatus.operational,
  },
  {
    type: FeatureType.crossing,
    name: "Santa Clara St & 1st St — Accessible Crossing",
    lat: 37.3366,
    lng: -121.8902,
    notes: "Audible signals and curb ramps on all corners.",
  },
  {
    type: FeatureType.transit_station,
    name: "Santa Clara VTA Station (elevator access)",
    lat: 37.3401,
    lng: -121.8932,
  },
  {
    type: FeatureType.ramp,
    name: "Japantown Curb Ramp — N 1st St",
    lat: 37.3489,
    lng: -121.9005,
  },
  {
    type: FeatureType.elevator,
    name: "Gish Rd Transit Center Elevator",
    lat: 37.3666,
    lng: -121.9215,
    status: FeatureStatus.operational,
  },
  {
    type: FeatureType.entrance,
    name: "Metro/Airport Station — Accessible Entrance",
    lat: 37.3758,
    lng: -121.9335,
  },
  {
    type: FeatureType.crossing,
    name: "Tasman Dr & Great America Pkwy — Accessible Crossing",
    lat: 37.4011,
    lng: -121.9762,
  },
  {
    type: FeatureType.transit_station,
    name: "Great America VTA Station (level boarding)",
    lat: 37.4036,
    lng: -121.9768,
  },
  {
    type: FeatureType.entrance,
    name: "Santa Clara Convention Center — Accessible Entrance",
    lat: 37.4042,
    lng: -121.9779,
    notes: "Step-free entrance near Great America Pkwy with accessible parking.",
  },
  {
    type: FeatureType.restroom,
    name: "Santa Clara Convention Center Accessible Restroom",
    lat: 37.4046,
    lng: -121.9785,
  },
];

const reports: {
  type: ReportType;
  lat: number;
  lng: number;
  description: string;
  severity: Severity;
  status?: ReportStatus;
  votes?: number;
}[] = [
  {
    type: ReportType.broken_elevator,
    lat: 37.3401,
    lng: -121.8932,
    description:
      "Elevator at Santa Clara VTA Station is out of service — only stairs to the platform right now.",
    severity: Severity.high,
    status: ReportStatus.verified,
    votes: 12,
  },
  {
    type: ReportType.blocked_sidewalk,
    lat: 37.3558,
    lng: -121.9098,
    description:
      "Construction has closed the sidewalk on N 1st St near Hedding. No temporary accessible path.",
    severity: Severity.high,
    status: ReportStatus.open,
    votes: 7,
  },
  {
    type: ReportType.missing_ramp,
    lat: 37.3666,
    lng: -121.9215,
    description: "Curb ramp missing at the NE corner — 6 inch drop to the street.",
    severity: Severity.medium,
    status: ReportStatus.open,
    votes: 3,
  },
  {
    type: ReportType.steep_incline,
    lat: 37.3905,
    lng: -121.9601,
    description:
      "Ramp grade near Tasman is very steep and hard to manage in a manual wheelchair.",
    severity: Severity.medium,
    status: ReportStatus.open,
    votes: 2,
  },
  {
    type: ReportType.stairs_only,
    lat: 37.3338,
    lng: -121.8861,
    description:
      "Pedestrian bridge here is stairs-only; the nearest elevator is a block away.",
    severity: Severity.low,
    status: ReportStatus.open,
    votes: 1,
  },
];

async function main() {
  console.log("Seeding AccessMap AI demo data...");
  await prisma.report.deleteMany();
  await prisma.accessibilityFeature.deleteMany();

  await prisma.accessibilityFeature.createMany({
    data: features.map((f) => ({
      ...f,
      status: f.status ?? FeatureStatus.operational,
      source: "seed",
    })),
  });

  for (const r of reports) {
    await prisma.report.create({
      data: {
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        description: r.description,
        severity: r.severity,
        status: r.status ?? ReportStatus.open,
        votes: r.votes ?? 0,
        deviceId: "seed",
      },
    });
  }

  // Mark the matching feature as out_of_service so map + routing agree.
  await prisma.accessibilityFeature.updateMany({
    where: { name: { contains: "Santa Clara VTA Station" } },
    data: { status: FeatureStatus.out_of_service },
  });

  const fc = await prisma.accessibilityFeature.count();
  const rc = await prisma.report.count();
  console.log(`Seeded ${fc} accessibility features and ${rc} reports.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
