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
type Anim = { id: string; status: string; color: string; h: number; from: number; target: number; t0: number; dialing: boolean };

/** A small octagon around a point, in degrees, so it can be extruded into a column. */
function octagon(lon: number, lat: number, r: number) {
  const dLat = r / 111320, dLon = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat]; });
  return { type: "Polygon" as const, coordinates: [ring] };
}
const heightFor = (status: string, selected: boolean) => (STATUS_HEIGHT[status as keyof typeof STATUS_HEIGHT] ?? 5) + (selected ? 14 : 0);
const colorFor = (status: string) => STATUS_COLOR[status as keyof typeof STATUS_COLOR] || STATUS_COLOR.PENDING;

export function MapView({ residents, center, styleUrl, selected, onSelect, running, orbit = false, interactive = true, zoom = 14.1 }: {
  residents: Resident[]; center: { lat: number; lon: number }; styleUrl: string | null; selected: string | null; onSelect: (id: string | null) => void; running?: boolean; orbit?: boolean; interactive?: boolean; zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const anims = useRef<Map<string, Anim>>(new Map());
  const geomIds = useRef<string>("");
  const latest = useRef({ residents, selected, running });
  latest.current = { residents, selected, running };
  const raf = useRef<number | null>(null);

  // Geometry is uploaded only when the set of residents changes; everything that moves lives in feature-state.
  const geometry = () => ({
    type: "FeatureCollection" as const,
    features: latest.current.residents.map((r) => ({ type: "Feature" as const, id: r.id, geometry: octagon(r.lon, r.lat, r.kind === "visitor" ? 19 : 15), properties: { id: r.id, h0: 5, color: colorFor(r.last?.outcome || "PENDING") } })),
  });
  const bases = () => ({ type: "FeatureCollection" as const, features: latest.current.residents.map((r) => ({ type: "Feature" as const, id: r.id, geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] }, properties: { id: r.id, color: colorFor(r.last?.outcome || "PENDING") } })) });

  useEffect(() => {
    if (!el.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: el.current, style: styleUrl || LIGHT_STYLE, center: [center.lon, center.lat], zoom, pitch: 52, bearing: -18, maxPitch: 62, renderWorldCopies: false, fadeDuration: 0, attributionControl: interactive ? { compact: true } : false, cooperativeGestures: false, interactive, canvasContextAttributes: { antialias: true } });
    if (interactive) m.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-left");
    m.on("error", (e: ErrorEvent) => { if (styleUrl && String(e?.error?.message || "").match(/style|403|401/i)) { try { m.setStyle(LIGHT_STYLE); } catch { /* ignore */ } } });
    m.on("load", () => {
      try { m.setLight({ anchor: "viewport", color: "#ffffff", intensity: 0.45, position: [1.15, 200, 35] }); } catch { /* older API */ }
      m.addSource("bases", { type: "geojson", data: bases(), promoteId: "id" });
      m.addLayer({ id: "bases", type: "circle", source: "bases", paint: { "circle-radius": 11, "circle-color": ["coalesce", ["feature-state", "color"], ["get", "color"]], "circle-opacity": 0.22, "circle-stroke-color": ["case", ["boolean", ["feature-state", "selected"], false], "#1F3BD6", ["boolean", ["feature-state", "noAnswer"], false], "#E3402C", "rgba(0,0,0,0)"], "circle-stroke-width": 2, "circle-pitch-alignment": "map" } });
      m.addSource("columns", { type: "geojson", data: geometry(), promoteId: "id" });
      m.addLayer({ id: "columns", type: "fill-extrusion", source: "columns", paint: { "fill-extrusion-color": ["coalesce", ["feature-state", "color"], ["get", "color"]], "fill-extrusion-height": ["coalesce", ["feature-state", "h"], ["get", "h0"]], "fill-extrusion-base": 0, "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": true } });
      geomIds.current = latest.current.residents.map((r) => r.id).join(",");
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
    const ids = latest.current.residents.map((r) => r.id).join(",");
    if (ids !== geomIds.current) { (m.getSource("columns") as GeoJSONSource | undefined)?.setData(geometry()); (m.getSource("bases") as GeoJSONSource | undefined)?.setData(bases()); geomIds.current = ids; }
    const changed: Anim[] = [];
    for (const r of latest.current.residents) {
      const status = r.last?.outcome || "PENDING";
      const sel = r.id === latest.current.selected;
      const target = heightFor(status, sel);
      const prev = anims.current.get(r.id);
      const a: Anim = prev || { id: r.id, status: "", color: "", h: 0, from: 0, target: 0, t0: now, dialing: false };
      if (!prev || a.status !== status || a.target !== target) { a.from = a.h; a.target = target; a.t0 = now; a.status = status; a.color = colorFor(status); a.dialing = status === "IN_PROGRESS"; anims.current.set(r.id, a); changed.push(a); }
      m.setFeatureState({ source: "columns", id: r.id }, { color: a.color });
      m.setFeatureState({ source: "bases", id: r.id }, { color: a.color, selected: sel, noAnswer: status === "NO_ANSWER" });
    }
    for (const k of [...anims.current.keys()]) if (!latest.current.residents.some((r) => r.id === k)) anims.current.delete(k);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const loop = (t: number) => {
      let busy = false;
      for (const a of anims.current.values()) {
        const p = Math.min(1, (t - a.t0) / 650); const e = 1 - Math.pow(1 - p, 3);
        let h = a.from + (a.target - a.from) * e;
        if (a.dialing && latest.current.running) { h = a.target + 10 * Math.abs(Math.sin(t / 240)); busy = true; }
        if (p < 1) busy = true;
        if (p < 1 || a.dialing) { a.h = h; m.setFeatureState({ source: "columns", id: a.id }, { h }); }
        else if (a.h !== a.target) { a.h = a.target; m.setFeatureState({ source: "columns", id: a.id }, { h: a.target }); }
      }
      if (orbit && !reduce) { m.setBearing(m.getBearing() + 0.045); busy = true; }
      if (!reduce && busy) raf.current = requestAnimationFrame(loop);
    };
    if (reduce) { for (const a of anims.current.values()) { a.h = a.target; m.setFeatureState({ source: "columns", id: a.id }, { h: a.target }); } return; }
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
