-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('elevator', 'ramp', 'entrance', 'restroom', 'crossing', 'transit_station');

-- CreateEnum
CREATE TYPE "FeatureStatus" AS ENUM ('operational', 'out_of_service', 'unknown');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('broken_elevator', 'blocked_sidewalk', 'missing_ramp', 'steep_incline', 'stairs_only', 'no_accessible_restroom', 'other');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'verified', 'resolved');

-- CreateTable
CREATE TABLE "accessibility_feature" (
    "id" TEXT NOT NULL,
    "type" "FeatureType" NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" "FeatureStatus" NOT NULL DEFAULT 'operational',
    "source" TEXT NOT NULL DEFAULT 'seed',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessibility_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'medium',
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "photoUrl" TEXT,
    "aiAnalysis" JSONB,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_log" (
    "id" TEXT NOT NULL,
    "originLabel" TEXT NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "barriersAvoided" INTEGER NOT NULL DEFAULT 0,
    "distanceMeters" DOUBLE PRECISION,
    "durationSeconds" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accessibility_feature_lat_lng_idx" ON "accessibility_feature"("lat", "lng");

-- CreateIndex
CREATE INDEX "report_lat_lng_idx" ON "report"("lat", "lng");
