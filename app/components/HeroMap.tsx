"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Resident, StateResponse, Status } from "@/lib/types";
import seed from "@/lib/seed.json";

const MapView = dynamic(() => import("@/components/ops/MapView").then((m) => m.MapView), { ssr: false });
const OUTCOME: Record<string, string> = { fine: "OK", needs: "NEEDS", urgent: "URGENT", unclear: "UNSURE", noanswer: "NO_ANSWER" };

/** The real product, seeded, orbiting slowly: the last drill's columns over Maryvale. */
export function HeroMap() {
  const [residents, setResidents] = useState<Resident[] | null>(null);
  useEffect(() => {
    fetch("/fixtures/state.json").then((r) => r.json()).then((s: StateResponse) => setResidents(s.residents.filter((r) => r.kind === "seed"))).catch(() => {
      const raw = (seed as unknown as { residents: Array<Omit<Resident, "last">> }).residents;
      const rs: Resident[] = raw.map((r) => ({ ...r, last: { outcome: OUTCOME[r.persona?.kind || "fine"] as Status, drillId: "seed", attempt: 1, at: new Date().toISOString(), quote: "", callSK: "" } }));
      setResidents(rs);
    });
  }, []);
  const center = (seed as { center: { lat: number; lon: number } }).center;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] border border-line bg-surface-2" style={{ boxShadow: "var(--shadow-2)" }}>
      {residents ? <MapView residents={residents} center={center} styleUrl={null} selected={null} onSelect={() => {}} running={false} orbit interactive={false} zoom={14.3} /> : <div className="sk absolute inset-0 rounded-none" aria-label="Loading the map" />}
      <div className="panel-blue blueprint absolute left-3 top-3 px-3 py-2">
        <span className="label text-chalk-muted">last drill · maryvale</span>
        <div className="numeral mt-0.5 text-[30px] text-chalk">98<span className="text-chalk-muted"> / 100</span></div>
      </div>
      <p className="absolute bottom-3 left-3 rounded-full bg-surface-1/90 px-3 py-1 text-[12px] text-ink-muted">Column height is how urgently a person is needed. Red is tallest.</p>
    </div>
  );
}
