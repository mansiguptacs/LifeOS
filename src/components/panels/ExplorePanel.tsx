"use client";

import type { FeatureDTO, ReportDTO } from "@/lib/types";
import type { FeatureType } from "@/generated/prisma/client";
import {
  FEATURE_META,
  REPORT_META,
  SEVERITY_META,
  REPORT_STATUS_META,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, AlertTriangle, TriangleAlert } from "lucide-react";

type Props = {
  features: FeatureDTO[];
  reports: ReportDTO[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onVote: (id: string) => void;
  activeFeatureTypes: Set<FeatureType>;
  onToggleFeatureType: (t: FeatureType) => void;
  showReports: boolean;
  onToggleReports: () => void;
};

export function ExplorePanel({
  features,
  reports,
  loading,
  error,
  onRefresh,
  onVote,
  activeFeatureTypes,
  onToggleFeatureType,
  showReports,
  onToggleReports,
}: Props) {
  const featureTypes = Object.keys(FEATURE_META) as FeatureType[];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Explore the map
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          aria-label="Refresh map data"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Accessible features"
          value={features.length}
          tone="ok"
        />
        <StatCard label="Active barriers" value={reports.length} tone="warn" />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Accessibility layers
        </h3>
        <div className="flex flex-col gap-1.5">
          {featureTypes.map((t) => {
            const meta = FEATURE_META[t];
            const active = activeFeatureTypes.has(t);
            const count = features.filter((f) => f.type === t).length;
            return (
              <button
                key={t}
                onClick={() => onToggleFeatureType(t)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm transition ${
                  active
                    ? "border-transparent bg-accent"
                    : "border-border bg-background opacity-55 hover:opacity-80"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex size-5 items-center justify-center rounded-full text-[11px]"
                    style={{ background: meta.color }}
                  >
                    {meta.emoji}
                  </span>
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </button>
            );
          })}

          <button
            onClick={onToggleReports}
            aria-pressed={showReports}
            className={`mt-1 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm transition ${
              showReports
                ? "border-transparent bg-accent"
                : "border-border bg-background opacity-55 hover:opacity-80"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-[11px] text-white">
                <TriangleAlert className="size-3" />
              </span>
              Reported barriers
            </span>
            <span className="text-xs text-muted-foreground">
              {reports.length}
            </span>
          </button>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent barrier reports
        </h3>
        <div className="flex flex-col gap-2">
          {reports.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No barriers reported yet.
            </p>
          )}
          {reports.slice(0, 8).map((r) => {
            const meta = REPORT_META[r.type];
            const sev = SEVERITY_META[r.severity];
            const st = REPORT_STATUS_META[r.status];
            return (
              <div
                key={r.id}
                className="rounded-md border p-2.5 text-sm"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {meta.emoji} {meta.label}
                  </span>
                  <button
                    onClick={() => onVote(r.id)}
                    className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    aria-label="Confirm this barrier"
                  >
                    ▲ {r.votes}
                  </button>
                </div>
                <p className="mb-1.5 text-muted-foreground">{r.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    style={{ background: sev.color }}
                    className="text-white"
                  >
                    {sev.label}
                  </Badge>
                  <Badge
                    style={{ background: st.color }}
                    className="text-white"
                  >
                    {st.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border p-3">
      <div
        className={`text-2xl font-bold ${
          tone === "ok" ? "text-green-600" : "text-orange-600"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
