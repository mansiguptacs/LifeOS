"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { FeatureDTO, ReportDTO } from "@/lib/types";
import {
  FEATURE_META,
  FEATURE_STATUS_META,
  REPORT_META,
  SEVERITY_META,
  REPORT_STATUS_META,
} from "@/lib/constants";
import { DEMO_CENTER } from "@/lib/geo";

type LatLng = { lat: number; lng: number };

export type AccessibilityMapProps = {
  features: FeatureDTO[];
  reports: ReportDTO[];
  /** Route geometry as [lng, lat] pairs (GeoJSON order). */
  routeCoords?: [number, number][];
  /** Highlighted barriers the route avoided. */
  routeMarkers?: { origin?: LatLng; destination?: LatLng };
  pickMode?: boolean;
  pickedPoint?: LatLng | null;
  onMapClick?: (point: LatLng) => void;
};

function featureDivIcon(f: FeatureDTO): L.DivIcon {
  const meta = FEATURE_META[f.type];
  const ring =
    f.status === "out_of_service"
      ? FEATURE_STATUS_META.out_of_service.color
      : meta.color;
  return L.divIcon({
    className: "am-feature-icon",
    html: `<div style="background:${meta.color};border:3px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,.4)" class="am-pin">${meta.emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function reportDivIcon(r: ReportDTO): L.DivIcon {
  const meta = REPORT_META[r.type];
  const color = SEVERITY_META[r.severity].color;
  return L.divIcon({
    className: "am-report-icon",
    html: `<div style="background:${color}" class="am-report-pin">${meta.emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function featurePopup(f: FeatureDTO): string {
  const meta = FEATURE_META[f.type];
  const st = FEATURE_STATUS_META[f.status];
  return `<div class="am-popup">
    <div class="am-popup-title">${meta.emoji} ${escapeHtml(f.name)}</div>
    <div class="am-popup-row"><span>${meta.label}</span></div>
    <div class="am-popup-badge" style="background:${st.color}">${st.label}</div>
    ${f.notes ? `<div class="am-popup-note">${escapeHtml(f.notes)}</div>` : ""}
  </div>`;
}

function reportPopup(r: ReportDTO): string {
  const meta = REPORT_META[r.type];
  const sev = SEVERITY_META[r.severity];
  const st = REPORT_STATUS_META[r.status];
  const ai = r.aiAnalysis as { description?: string; simulated?: boolean } | null;
  const aiLine =
    ai && typeof ai.description === "string" && !ai.simulated
      ? `<div class="am-popup-ai">✨ ${escapeHtml(ai.description)}</div>`
      : "";
  return `<div class="am-popup">
    <div class="am-popup-title">${meta.emoji} ${meta.label}</div>
    <div class="am-popup-note">${escapeHtml(r.description)}</div>
    ${aiLine}
    <div class="am-popup-badges">
      <span class="am-popup-badge" style="background:${sev.color}">${sev.label} severity</span>
      <span class="am-popup-badge" style="background:${st.color}">${st.label}</span>
      <span class="am-popup-badge" style="background:#475569">▲ ${r.votes}</span>
    </div>
    ${r.photoUrl ? `<img class="am-popup-img" src="${escapeHtml(r.photoUrl)}" alt="report photo" />` : ""}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function AccessibilityMap(props: AccessibilityMapProps) {
  const {
    features,
    reports,
    routeCoords,
    routeMarkers,
    pickMode,
    pickedPoint,
    onMapClick,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const featureLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const reportLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const pickLayerRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Init map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [DEMO_CENTER.lat, DEMO_CENTER.lng],
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    featureLayerRef.current = (L as typeof L & {
      markerClusterGroup: (o?: object) => L.MarkerClusterGroup;
    })
      .markerClusterGroup({ maxClusterRadius: 45 })
      .addTo(map);
    reportLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    pickLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Cursor for pick mode.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // Render features.
  useEffect(() => {
    const layer = featureLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const f of features) {
      L.marker([f.lat, f.lng], { icon: featureDivIcon(f) })
        .bindPopup(featurePopup(f))
        .addTo(layer);
    }
  }, [features]);

  // Render reports.
  useEffect(() => {
    const layer = reportLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const r of reports) {
      L.marker([r.lat, r.lng], { icon: reportDivIcon(r), zIndexOffset: 1000 })
        .bindPopup(reportPopup(r))
        .addTo(layer);
    }
  }, [reports]);

  // Render route.
  useEffect(() => {
    const layer = routeLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (routeCoords && routeCoords.length > 1) {
      const latlngs = routeCoords.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );
      L.polyline(latlngs, {
        color: "#1d4ed8",
        weight: 6,
        opacity: 0.85,
      }).addTo(layer);
      if (routeMarkers?.origin) {
        L.marker([routeMarkers.origin.lat, routeMarkers.origin.lng], {
          icon: endpointIcon("A", "#16a34a"),
        }).addTo(layer);
      }
      if (routeMarkers?.destination) {
        L.marker([routeMarkers.destination.lat, routeMarkers.destination.lng], {
          icon: endpointIcon("B", "#dc2626"),
        }).addTo(layer);
      }
      map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
    }
  }, [routeCoords, routeMarkers]);

  // Render picked point.
  useEffect(() => {
    const layer = pickLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (pickedPoint) {
      L.marker([pickedPoint.lat, pickedPoint.lng], {
        icon: endpointIcon("📍", "#7c3aed"),
        zIndexOffset: 2000,
      }).addTo(layer);
    }
  }, [pickedPoint]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function endpointIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "am-endpoint-icon",
    html: `<div style="background:${color}" class="am-endpoint">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}
