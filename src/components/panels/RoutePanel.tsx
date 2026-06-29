"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { RouteProfile, RouteResult } from "@/lib/routing";
import {
  Loader2,
  Navigation,
  ShieldCheck,
  TriangleAlert,
  Accessibility,
  Baby,
  Footprints,
} from "lucide-react";

type LatLng = { lat: number; lng: number };
type Place = { label: string; lat: number; lng: number };

type Props = {
  onRoute: (
    result: RouteResult,
    origin: LatLng,
    destination: LatLng,
  ) => void;
  onClear: () => void;
  result: RouteResult | null;
};

const PROFILES: { value: RouteProfile; label: string; icon: typeof Accessibility }[] =
  [
    { value: "wheelchair", label: "Wheelchair", icon: Accessibility },
    { value: "stroller", label: "Stroller", icon: Baby },
    { value: "walking", label: "Walking", icon: Footprints },
  ];

function LocationInput({
  label,
  initialLabel,
  onSelect,
}: {
  label: string;
  initialLabel: string;
  onSelect: (p: Place | null) => void;
}) {
  const [text, setText] = useState(initialLabel);
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setText(v);
    onSelect(null);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(v)}`);
        const data = (await res.json()) as Place[];
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search address or place"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-2.5 size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full z-[1100] mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(r);
                setText(r.label);
                setOpen(false);
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoutePanel({ onRoute, onClear, result }: Props) {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [profile, setProfile] = useState<RouteProfile>("wheelchair");
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function planRoute() {
    if (!origin || !destination)
      return toast.error("Set both a start and destination");
    setLoading(true);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          originLabel: origin.label,
          destinationLabel: destination.label,
          profile,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not compute a route");
      }
      const data = (await res.json()) as RouteResult;
      onRoute(
        data,
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng },
      );
      if (data.detoured) {
        toast.success(
          `Accessible route found — avoiding ${data.barriersAvoided.length} barrier(s)`,
        );
      } else if (data.barriersOnRoute.length > 0) {
        toast.warning(
          `Route found, but ${data.barriersOnRoute.length} barrier(s) remain on the way`,
        );
      } else {
        toast.success("Step-free route found — no known barriers");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not compute a route");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setOrigin(null);
    setDestination(null);
    setFormKey((k) => k + 1);
    onClear();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Plan an accessible route
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Routes are weighted to avoid reported barriers and out-of-service
          elevators.
        </p>
      </div>

      <LocationInput
        key={`origin-${formKey}`}
        label="Start"
        initialLabel={origin?.label ?? ""}
        onSelect={setOrigin}
      />
      <LocationInput
        key={`dest-${formKey}`}
        label="Destination"
        initialLabel={destination?.label ?? ""}
        onSelect={setDestination}
      />

      <div className="flex flex-col gap-1.5">
        <Label>Mobility profile</Label>
        <Select
          value={profile}
          onValueChange={(v) => setProfile(v as RouteProfile)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROFILES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={planRoute} disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Navigation className="size-4" />
          )}
          Find route
        </Button>
        {result && (
          <Button variant="outline" onClick={clearAll}>
            Clear
          </Button>
        )}
      </div>

      {result && (
        <>
          <Separator />
          <RouteSummary result={result} />
        </>
      )}
    </div>
  );
}

function RouteSummary({ result }: { result: RouteResult }) {
  const km = (result.distanceMeters / 1000).toFixed(1);
  const min = Math.round(result.durationSeconds / 60);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold">{km} km</div>
          <div className="text-xs text-muted-foreground">Distance</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold">{min} min</div>
          <div className="text-xs text-muted-foreground">Est. travel</div>
        </div>
      </div>

      {result.barriersAvoided.length > 0 && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
            <ShieldCheck className="size-4" />
            Avoided {result.barriersAvoided.length} barrier
            {result.barriersAvoided.length > 1 ? "s" : ""}
          </div>
          <ul className="flex flex-col gap-1">
            {result.barriersAvoided.map((b) => (
              <li key={b.id} className="text-xs text-muted-foreground">
                • {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.barriersOnRoute.length > 0 && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
            <TriangleAlert className="size-4" />
            {result.barriersOnRoute.length} barrier
            {result.barriersOnRoute.length > 1 ? "s" : ""} still on this route
          </div>
          <ul className="flex flex-col gap-1">
            {result.barriersOnRoute.map((b) => (
              <li key={b.id} className="text-xs text-muted-foreground">
                • {b.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Badge variant="outline" className="w-fit">
        via {result.provider === "openrouteservice" ? "OpenRouteService" : "OSRM"}
      </Badge>
    </div>
  );
}
