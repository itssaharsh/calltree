"use client";
import { useEffect, useRef } from "react";
import { Map as MLMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type ErrorEvent } from "maplibre-gl";
import type { Resident } from "@/lib/types";
import { STATUS_COLOR } from "@/lib/format";

const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function toGeoJSON(residents: Resident[], selected: string | null, now: number) {
  return {
    type: "FeatureCollection" as const,
    features: residents.map((r) => {
      const status = r.last?.outcome || "PENDING";
      const recent = r.last?.at ? now - new Date(r.last.at).getTime() < 4000 : false;
      return { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] }, properties: { id: r.id, name: r.name, status, color: STATUS_COLOR[status as keyof typeof STATUS_COLOR] || STATUS_COLOR.PENDING, selected: r.id === selected, recent, noAnswer: status === "NO_ANSWER", visitor: r.kind === "visitor" } };
    }),
  };
}

export function MapView({ residents, center, styleUrl, selected, onSelect }: { residents: Resident[]; center: { lat: number; lon: number }; styleUrl: string | null; selected: string | null; onSelect: (id: string | null) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const latest = useRef({ residents, selected });
  latest.current = { residents, selected };

  useEffect(() => {
    if (!el.current || map.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MLMap({ container: el.current, style: styleUrl || FALLBACK_STYLE, center: [center.lon, center.lat], zoom: 13.1, attributionControl: { compact: true }, cooperativeGestures: false });
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    m.on("error", (e: ErrorEvent) => { if (styleUrl && String(e?.error?.message || "").match(/style|403|401/i) && m.getStyle()?.name !== "fallback") { try { m.setStyle(FALLBACK_STYLE); } catch { /* ignore */ } } });
    m.on("load", () => {
      m.addSource("residents", { type: "geojson", data: toGeoJSON(latest.current.residents, latest.current.selected, Date.now()) });
      m.addLayer({ id: "pins-glow", type: "circle", source: "residents", paint: { "circle-radius": ["case", ["get", "recent"], 16, ["get", "selected"], 15, 0], "circle-color": ["get", "color"], "circle-opacity": 0.28 } });
      m.addLayer({ id: "pins", type: "circle", source: "residents", paint: { "circle-radius": ["case", ["get", "selected"], 8.5, ["get", "visitor"], 8, 6], "circle-color": ["get", "color"], "circle-stroke-color": ["case", ["get", "noAnswer"], "#FF7A7A", ["get", "selected"], "#FFA41B", "#0E1220"], "circle-stroke-width": ["case", ["get", "selected"], 3, 2] } });
      m.on("click", "pins", (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => { const f = e.features?.[0]; if (f) onSelect(String(f.properties?.id)); });
      m.on("click", (e: MapMouseEvent) => { const fs = m.queryRenderedFeatures(e.point, { layers: ["pins"] }); if (!fs.length) onSelect(null); });
      m.on("mouseenter", "pins", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "pins", () => { m.getCanvas().style.cursor = ""; });
      ready.current = true;
    });
    map.current = m;
    return () => { m.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current; if (!m || !ready.current) return;
    const src = m.getSource("residents") as GeoJSONSource | undefined;
    src?.setData(toGeoJSON(residents, selected, Date.now()));
    const t = setTimeout(() => src?.setData(toGeoJSON(residents, selected, Date.now())), 4200); // clears the recent glow
    return () => clearTimeout(t);
  }, [residents, selected]);

  useEffect(() => {
    const m = map.current; if (!m || !selected) return;
    const r = residents.find((x) => x.id === selected);
    if (r) m.easeTo({ center: [r.lon, r.lat], duration: 500, zoom: Math.max(m.getZoom(), 13.4) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="absolute inset-0" role="region" aria-label="Map of registered residents; pins are coloured by call outcome">
      <div ref={el} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
