import type {
  FeatureType,
  FeatureStatus,
  ReportType,
  Severity,
  ReportStatus,
} from "@/generated/prisma/client";

export type FeatureDTO = {
  id: string;
  type: FeatureType;
  name: string;
  lat: number;
  lng: number;
  status: FeatureStatus;
  notes: string | null;
};

export type ReportDTO = {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  description: string;
  severity: Severity;
  status: ReportStatus;
  photoUrl: string | null;
  aiAnalysis: unknown | null;
  votes: number;
  createdAt: string;
};
