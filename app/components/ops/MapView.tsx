"use client";
import { useEffect, useRef } from "react";
import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type ErrorEvent } from "maplibre-gl";
import type { Resident } from "@/lib/types";
import { STATUS_COLOR } from "@/lib/format";

const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function toGeoJSON(residents: Resident[], selected: string | null, since: number) {
  return {
    type: "FeatureCollection" as const,
    features: residents.map((r) => {
      const status = r.last?.outcome || "PENDING";
      const at = r.last?.at ? new Date(r.last.at).getTime() : 0;
      return { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] }, properties: { id: r.id, name: r.name, status, color: STATUS_COLOR[status as keyof typeof STATUS_COLOR] || STATUS_COLOR.PENDING, selected: r.id === selected, recent: at > since, dialing: status === "IN_PROGRESS", noAnswer: status === "NO_ANSWER", visitor: r.kind === "visitor" } };
    }),
  };
}

export function MapView({ residents, center, styleUrl, selected, onSelect, running }: { residents: Resident[]; center: { lat: number; lon: number }; styleUrl: string | null; selected: string | null; onSelect: (id: string | null) => void; running?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const latest = useRef({ residents, selected });
  latest.current = { residents, selected };
  const lastChange = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: el.current, style: styleUrl || FALLBACK_STYLE, center: [center.lon, center.lat], zoom: 13.15, attributionControl: { compact: true }, cooperativeGestures: false });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-left");
    m.on("error", (e: ErrorEvent) => { if (styleUrl && String(e?.error?.message || "").match(/style|403|401/i)) { try { m.setStyle(FALLBACK_STYLE); } catch { /* ignore */ } } });
    m.on("load", () => {
      m.addSource("residents", { type: "geojson", data: toGeoJSON(latest.current.residents, latest.current.selected, 0) });
      m.addLayer({ id: "pins-ring", type: "circle", source: "residents", paint: { "circle-radius": ["case", ["get", "recent"], 10, 0], "circle-color": ["get", "color"], "circle-opacity": 0.35 } });
      m.addLayer({ id: "pins", type: "circle", source: "residents", paint: { "circle-radius": ["case", ["get", "selected"], 9, ["get", "visitor"], 8.5, 6.2], "circle-color": ["get", "color"], "circle-opacity": 1, "circle-stroke-color": ["case", ["get", "noAnswer"], "#FF7A7A", ["get", "selected"], "#FFA41B", "#0E1220"], "circle-stroke-width": ["case", ["get", "selected"], 3, 2] } });
      m.on("click", "pins", (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => { const f = e.features?.[0]; if (f) onSelect(String(f.properties?.id)); });
      m.on("click", (e: MapMouseEvent) => { const fs = m.queryRenderedFeatures(e.point, { layers: ["pins"] }); if (!fs.length) onSelect(null); });
      m.on("mouseenter", "pins", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "pins", () => { m.getCanvas().style.cursor = ""; });
      ready.current = true;
    });
    map.current = m;
    return () => { if (raf.current) cancelAnimationFrame(raf.current); m.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data updates: pins that changed in the last poll get a ring that expands and fades; dialing pins blink
  useEffect(() => {
    const m = map.current; if (!m || !ready.current) return;
    const src = m.getSource("residents") as GeoJSONSource | undefined;
    const since = lastChange.current;
    lastChange.current = Date.now() - 100;
    src?.setData(toGeoJSON(residents, selected, since));
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const loop = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      try {
        m.setPaintProperty("pins-ring", "circle-radius", ["case", ["get", "recent"], 8 + 16 * p, 0]);
        m.setPaintProperty("pins-ring", "circle-opacity", 0.5 * (1 - p));
        const blink = running ? 0.35 + 0.65 * Math.abs(Math.sin(now / 260)) : 1;
        m.setPaintProperty("pins", "circle-opacity", ["case", ["get", "dialing"], blink, 1]);
      } catch { /* style not ready */ }
      if (!reduce && (p < 1 || running)) raf.current = requestAnimationFrame(loop);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [residents, selected, running]);

  useEffect(() => {
    const m = map.current; if (!m || !selected) return;
    const r = residents.find((x) => x.id === selected);
    if (r) m.easeTo({ center: [r.lon, r.lat], duration: 500, zoom: Math.max(m.getZoom(), 13.4), padding: { right: 480 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="absolute inset-0" role="region" aria-label="Map of registered residents; pins are coloured by call outcome">
      <div ref={el} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
