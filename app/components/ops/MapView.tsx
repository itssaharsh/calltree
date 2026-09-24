"use client";
import { useEffect, useRef } from "react";
import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type ErrorEvent } from "maplibre-gl";
import type { Resident } from "@/lib/types";
import { STATUS_COLOR, STATUS_HEIGHT } from "@/lib/format";

// Raster basemap: cheap to render at a pitch, so the 3D columns (the data) stay smooth on weak GPUs and in headless capture.
const LIGHT_STYLE = {
  version: 8 as const,
  sources: {
    esri: { type: "raster" as const, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 16, attribution: "Tiles © Esri, HERE, Garmin, OpenStreetMap contributors" },
    labels: { type: "raster" as const, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 16 },
  },
  layers: [
    { id: "esri", type: "raster" as const, source: "esri", paint: { "raster-brightness-max": 0.98, "raster-saturation": -0.2 } },
    { id: "labels", type: "raster" as const, source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
};
type Feat = { id: string; status: string; color: string; h: number; target: number; from: number; t0: number; selected: boolean; dialing: boolean; visitor: boolean; noAnswer: boolean; lon: number; lat: number };

/** A small octagon around a point, in degrees, so it can be extruded into a column. */
function octagon(lon: number, lat: number, r: number) {
  const dLat = r / 111320, dLon = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat]; });
  return { type: "Polygon" as const, coordinates: [ring] };
}
const heightFor = (status: string, selected: boolean) => (STATUS_HEIGHT[status as keyof typeof STATUS_HEIGHT] ?? 5) + (selected ? 14 : 0);

export function MapView({ residents, center, styleUrl, selected, onSelect, running, orbit = false, interactive = true, zoom = 14.1 }: {
  residents: Resident[]; center: { lat: number; lon: number }; styleUrl: string | null; selected: string | null; onSelect: (id: string | null) => void; running?: boolean; orbit?: boolean; interactive?: boolean; zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const feats = useRef<Map<string, Feat>>(new Map());
  const latest = useRef({ residents, selected, running });
  latest.current = { residents, selected, running };
  const raf = useRef<number | null>(null);

  const build = (now: number) => ({
    type: "FeatureCollection" as const,
    features: [...feats.current.values()].map((f) => {
      const p = Math.min(1, (now - f.t0) / 650); const e = 1 - Math.pow(1 - p, 3);
      let h = f.from + (f.target - f.from) * e;
      if (f.dialing && latest.current.running) h = f.target + 10 * Math.abs(Math.sin(now / 240));
      f.h = h;
      return { type: "Feature" as const, geometry: octagon(f.lon, f.lat, f.visitor ? 19 : 15), properties: { id: f.id, status: f.status, color: f.color, h, selected: f.selected, noAnswer: f.noAnswer, visitor: f.visitor } };
    }),
  });
  const bases = () => ({ type: "FeatureCollection" as const, features: [...feats.current.values()].map((f) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [f.lon, f.lat] }, properties: { id: f.id, color: f.color, selected: f.selected, noAnswer: f.noAnswer } })) });

  useEffect(() => {
    if (!el.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: el.current, style: styleUrl || LIGHT_STYLE, center: [center.lon, center.lat], zoom, pitch: 52, bearing: -18, maxPitch: 62, renderWorldCopies: false, fadeDuration: 0, attributionControl: interactive ? { compact: true } : false, cooperativeGestures: false, interactive, canvasContextAttributes: { antialias: true } });
    if (interactive) m.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-left");
    m.on("error", (e: ErrorEvent) => { if (styleUrl && String(e?.error?.message || "").match(/style|403|401/i)) { try { m.setStyle(LIGHT_STYLE); } catch { /* ignore */ } } });
    m.on("load", () => {
      try { m.setLight({ anchor: "viewport", color: "#ffffff", intensity: 0.45, position: [1.15, 200, 35] }); } catch { /* older API */ }
      m.addSource("bases", { type: "geojson", data: bases() });
      m.addLayer({ id: "bases", type: "circle", source: "bases", paint: { "circle-radius": 11, "circle-color": ["get", "color"], "circle-opacity": 0.22, "circle-stroke-color": ["case", ["get", "selected"], "#1F3BD6", ["get", "noAnswer"], "#E3402C", "rgba(0,0,0,0)"], "circle-stroke-width": 2, "circle-pitch-alignment": "map" } });
      m.addSource("columns", { type: "geojson", data: build(performance.now()) });
      m.addLayer({ id: "columns", type: "fill-extrusion", source: "columns", paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0, "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": true } });
      if (interactive) {
        m.on("click", "columns", (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => { const f = e.features?.[0]; if (f) onSelect(String(f.properties?.id)); });
        m.on("click", (e: MapMouseEvent) => { const fs = m.queryRenderedFeatures(e.point, { layers: ["columns", "bases"] }); if (!fs.length) onSelect(null); });
        m.on("mouseenter", "columns", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "columns", () => { m.getCanvas().style.cursor = ""; });
      }
      ready.current = true;
      sync();
    });
    map.current = m;
    return () => { if (raf.current) cancelAnimationFrame(raf.current); m.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const m = map.current; if (!m || !ready.current) return;
    const now = performance.now();
    const seen = new Set<string>();
    for (const r of latest.current.residents) {
      const status = r.last?.outcome || "PENDING";
      const sel = r.id === latest.current.selected;
      const target = heightFor(status, sel);
      const prev = feats.current.get(r.id);
      seen.add(r.id);
      if (!prev) feats.current.set(r.id, { id: r.id, status, color: STATUS_COLOR[status as keyof typeof STATUS_COLOR] || STATUS_COLOR.PENDING, h: 0, from: 0, target, t0: now, selected: sel, dialing: status === "IN_PROGRESS", visitor: r.kind === "visitor", noAnswer: status === "NO_ANSWER", lon: r.lon, lat: r.lat });
      else if (prev.status !== status || prev.selected !== sel) Object.assign(prev, { status, color: STATUS_COLOR[status as keyof typeof STATUS_COLOR] || STATUS_COLOR.PENDING, from: prev.h, target, t0: now, selected: sel, dialing: status === "IN_PROGRESS", noAnswer: status === "NO_ANSWER" });
    }
    for (const k of [...feats.current.keys()]) if (!seen.has(k)) feats.current.delete(k);
    (m.getSource("bases") as GeoJSONSource | undefined)?.setData(bases());
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = now;
    const loop = (t: number) => {
      (m.getSource("columns") as GeoJSONSource | undefined)?.setData(build(t));
      if (orbit && !reduce) m.setBearing(m.getBearing() + 0.045);
      const animating = [...feats.current.values()].some((f) => t - f.t0 < 700 || (f.dialing && latest.current.running));
      if (!reduce && (animating || orbit || t - t0 < 700)) raf.current = requestAnimationFrame(loop);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  };

  useEffect(() => { sync(); return () => { if (raf.current) cancelAnimationFrame(raf.current); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residents, selected, running]);

  useEffect(() => {
    const m = map.current; if (!m || !selected) return;
    const r = residents.find((x) => x.id === selected);
    if (r) m.easeTo({ center: [r.lon, r.lat], duration: 600, zoom: Math.max(m.getZoom(), 14.6), padding: { right: 480 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="absolute inset-0" role="region" aria-label="3D map of registered residents; each column's colour and height is the call outcome">
      <div ref={el} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#EFECE5" }} />
    </div>
  );
}
