import type {
  FeatureType,
  FeatureStatus,
  ReportType,
  Severity,
  ReportStatus,
} from "@/generated/prisma/client";

export const FEATURE_META: Record<
  FeatureType,
  { label: string; emoji: string; color: string }
> = {
  elevator: { label: "Elevator", emoji: "🛗", color: "#2563eb" },
  ramp: { label: "Curb ramp", emoji: "♿", color: "#0891b2" },
  entrance: { label: "Accessible entrance", emoji: "🚪", color: "#16a34a" },
  restroom: { label: "Accessible restroom", emoji: "🚻", color: "#7c3aed" },
  crossing: { label: "Accessible crossing", emoji: "🚦", color: "#0d9488" },
  transit_station: { label: "Transit station", emoji: "🚉", color: "#4f46e5" },
};

export const FEATURE_STATUS_META: Record<
  FeatureStatus,
  { label: string; color: string }
> = {
  operational: { label: "Operational", color: "#16a34a" },
  out_of_service: { label: "Out of service", color: "#dc2626" },
  unknown: { label: "Unknown", color: "#a3a3a3" },
};

export const REPORT_META: Record<
  ReportType,
  { label: string; emoji: string }
> = {
  broken_elevator: { label: "Broken elevator", emoji: "🛗" },
  blocked_sidewalk: { label: "Blocked sidewalk", emoji: "🚧" },
  missing_ramp: { label: "Missing curb ramp", emoji: "⛔" },
  steep_incline: { label: "Steep incline", emoji: "⛰️" },
  stairs_only: { label: "Stairs only", emoji: "🪜" },
  no_accessible_restroom: { label: "No accessible restroom", emoji: "🚻" },
  other: { label: "Other barrier", emoji: "⚠️" },
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "#ca8a04" },
  medium: { label: "Medium", color: "#ea580c" },
  high: { label: "High", color: "#dc2626" },
};

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "#ea580c" },
  verified: { label: "Verified", color: "#dc2626" },
  resolved: { label: "Resolved", color: "#16a34a" },
};
