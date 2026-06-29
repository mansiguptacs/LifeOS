"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_META, SEVERITY_META } from "@/lib/constants";
import type { ReportType, Severity } from "@/generated/prisma/client";
import { fileToCompressedDataUrl } from "@/lib/image";
import { MapPin, Crosshair, X, Loader2, Camera, Sparkles } from "lucide-react";

type LatLng = { lat: number; lng: number };

type AiResult = {
  type: ReportType;
  severity: Severity;
  description: string;
  confidence: number;
  simulated: boolean;
};

type Props = {
  pickedPoint: LatLng | null;
  pickMode: boolean;
  onTogglePick: () => void;
  onClearPick: () => void;
  onSubmitted: () => void;
  deviceId: string | null;
};

const REPORT_TYPES = Object.keys(REPORT_META) as ReportType[];
const SEVERITIES = Object.keys(SEVERITY_META) as Severity[];

export function ReportPanel({
  pickedPoint,
  pickMode,
  onTogglePick,
  onClearPick,
  onSubmitted,
  deviceId,
}: Props) {
  const [type, setType] = useState<ReportType | "">("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<AiResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      setPhotoUrl(url);
      setAi(null);
    } catch {
      toast.error("Could not process that image");
    }
  }

  async function analyzePhoto() {
    if (!photoUrl) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoUrl }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "AI analysis failed");
      }
      const data = (await res.json()) as AiResult;
      setAi(data);
      setType(data.type);
      setSeverity(data.severity);
      setDescription((prev) => prev || data.description);
      if (data.simulated) {
        toast.info("AI demo mode — add an OpenAI key for real analysis");
      } else {
        toast.success("AI analyzed the photo");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setType("");
    setSeverity("medium");
    setDescription("");
    setPhotoUrl(null);
    setAi(null);
    if (fileRef.current) fileRef.current.value = "";
    onClearPick();
  }

  async function submit() {
    if (!type) return toast.error("Choose a barrier type");
    if (!pickedPoint) return toast.error("Pick the barrier location on the map");
    if (description.trim().length < 3)
      return toast.error("Add a short description");

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          lat: pickedPoint.lat,
          lng: pickedPoint.lng,
          description,
          severity,
          photoUrl,
          aiAnalysis: ai ?? undefined,
          deviceId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to submit report");
      }
      toast.success("Barrier reported — thank you!");
      reset();
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Report a barrier
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Help others by flagging accessibility issues you encounter.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Location</Label>
        {pickedPoint ? (
          <div className="flex items-center justify-between rounded-md border bg-accent px-2.5 py-2 text-sm">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-purple-600" />
              {pickedPoint.lat.toFixed(5)}, {pickedPoint.lng.toFixed(5)}
            </span>
            <button
              onClick={onClearPick}
              aria-label="Clear location"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant={pickMode ? "default" : "outline"}
            onClick={onTogglePick}
            className="justify-start"
          >
            <Crosshair className="size-4" />
            {pickMode ? "Click the map to drop a pin…" : "Pick location on map"}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Barrier type</Label>
        <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a barrier type" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {REPORT_META[t].emoji} {REPORT_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Severity</Label>
        <Select
          value={severity}
          onValueChange={(v) => setSeverity(v as Severity)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {SEVERITY_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          placeholder="e.g. Elevator out of service, only stairs available"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo">Photo (optional)</Label>
        <input
          ref={fileRef}
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
        {photoUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="barrier preview"
              className="max-h-44 w-full rounded-md border object-cover"
            />
            <button
              onClick={() => {
                setPhotoUrl(null);
                setAi(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              aria-label="Remove photo"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="justify-start"
          >
            <Camera className="size-4" /> Add a photo
          </Button>
        )}

        {photoUrl && (
          <Button
            type="button"
            variant="secondary"
            onClick={analyzePhoto}
            disabled={analyzing}
            className="justify-start"
          >
            {analyzing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4 text-violet-600" />
            )}
            Analyze with AI
          </Button>
        )}

        {ai && (
          <div className="rounded-md border border-violet-200 bg-violet-50 p-2.5 text-xs dark:border-violet-900 dark:bg-violet-950">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-300">
              <Sparkles className="size-3.5" />
              AI assessment
              {ai.simulated ? (
                <span className="font-normal text-muted-foreground">
                  (demo mode)
                </span>
              ) : (
                <span className="font-normal text-muted-foreground">
                  {Math.round(ai.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{ai.description}</p>
          </div>
        )}
      </div>

      <Button onClick={submit} disabled={submitting}>
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MapPin className="size-4" />
        )}
        Submit report
      </Button>
    </div>
  );
}
