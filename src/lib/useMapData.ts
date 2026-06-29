"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeatureDTO, ReportDTO } from "@/lib/types";

export function useMapData() {
  const [features, setFeatures] = useState<FeatureDTO[]>([]);
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const [fRes, rRes] = await Promise.all([
        fetch("/api/features", { cache: "no-store" }),
        fetch("/api/reports", { cache: "no-store" }),
      ]);
      if (!fRes.ok || !rRes.ok) throw new Error("Failed to load map data");
      setFeatures(await fRes.json());
      setReports(await rRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { features, reports, loading, error, refetch, setReports };
}
