"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMapData } from "@/lib/useMapData";
import { useDeviceId } from "@/lib/useDeviceId";
import type { FeatureType } from "@/generated/prisma/client";
import { FEATURE_META } from "@/lib/constants";
import { ExplorePanel } from "@/components/panels/ExplorePanel";
import { ReportPanel } from "@/components/panels/ReportPanel";
import { RoutePanel } from "@/components/panels/RoutePanel";
import type { RouteResult } from "@/lib/routing";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accessibility, Loader2, Compass, Flag, Navigation } from "lucide-react";

type LatLng = { lat: number; lng: number };

const AccessibilityMap = dynamic(
  () => import("@/components/map/AccessibilityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const ALL_FEATURE_TYPES = Object.keys(FEATURE_META) as FeatureType[];

export function AccessMapApp() {
  const { features, reports, loading, error, refetch } = useMapData();
  const deviceId = useDeviceId();

  const [tab, setTab] = useState("explore");
  const [activeFeatureTypes, setActiveFeatureTypes] = useState<Set<FeatureType>>(
    new Set(ALL_FEATURE_TYPES),
  );
  const [showReports, setShowReports] = useState(true);

  const [pickMode, setPickMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<LatLng | null>(null);

  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeEndpoints, setRouteEndpoints] = useState<{
    origin: LatLng;
    destination: LatLng;
  } | null>(null);

  const visibleFeatures = useMemo(
    () => features.filter((f) => activeFeatureTypes.has(f.type)),
    [features, activeFeatureTypes],
  );
  const visibleReports = useMemo(
    () => (showReports ? reports : []),
    [reports, showReports],
  );

  function handleMapClick(point: LatLng) {
    if (tab === "report" && pickMode) {
      setPickedPoint(point);
      setPickMode(false);
    }
  }

  async function handleVote(id: string) {
    try {
      const res = await fetch(`/api/reports/${id}/vote`, { method: "POST" });
      if (!res.ok) throw new Error();
      await refetch();
    } catch {
      toast.error("Could not record your vote");
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <Accessibility className="size-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-semibold leading-none">AccessMap AI</h1>
          <p className="text-xs text-muted-foreground">
            Accessible navigation for everyone
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full flex-col overflow-hidden border-b bg-background md:w-[380px] md:border-b-0 md:border-r">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="explore">
                <Compass className="size-4" /> Explore
              </TabsTrigger>
              <TabsTrigger value="report">
                <Flag className="size-4" /> Report
              </TabsTrigger>
              <TabsTrigger value="route">
                <Navigation className="size-4" /> Route
              </TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="explore" className="mt-0">
                <ExplorePanel
                  features={features}
                  reports={reports}
                  loading={loading}
                  error={error}
                  onRefresh={refetch}
                  onVote={handleVote}
                  activeFeatureTypes={activeFeatureTypes}
                  onToggleFeatureType={(t) =>
                    setActiveFeatureTypes((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                  showReports={showReports}
                  onToggleReports={() => setShowReports((v) => !v)}
                />
              </TabsContent>

              <TabsContent value="report" className="mt-0">
                <ReportPanel
                  pickedPoint={pickedPoint}
                  pickMode={pickMode}
                  onTogglePick={() => setPickMode((v) => !v)}
                  onClearPick={() => {
                    setPickedPoint(null);
                    setPickMode(false);
                  }}
                  onSubmitted={refetch}
                  deviceId={deviceId}
                />
              </TabsContent>

              <TabsContent value="route" className="mt-0">
                <RoutePanel
                  result={routeResult}
                  onRoute={(res, origin, destination) => {
                    setRouteResult(res);
                    setRouteEndpoints({ origin, destination });
                  }}
                  onClear={() => {
                    setRouteResult(null);
                    setRouteEndpoints(null);
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </aside>

        <main className="relative min-h-[50vh] flex-1">
          <AccessibilityMap
            features={visibleFeatures}
            reports={visibleReports}
            pickMode={tab === "report" && pickMode}
            pickedPoint={tab === "report" ? pickedPoint : null}
            onMapClick={handleMapClick}
            routeCoords={routeResult?.coordinates}
            routeMarkers={routeEndpoints ?? undefined}
          />
          {tab === "report" && pickMode && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow">
              Click the map to set the barrier location
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
