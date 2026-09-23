"use client";
import { useState } from "react";
import type { Escalation } from "@/lib/types";
import { ESC_LABEL, timeHM } from "@/lib/format";

const GLYPH: Record<string, string> = { neighbour: "☎", staff: "↩", supply: "▣", visit: "⌂" };

export function Queue({ items, onResolve, onSelect, empty }: { items: Escalation[]; onResolve: (sk: string) => Promise<void>; onSelect: (id: string) => void; empty: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const open = items.filter((e) => e.status === "open");
  if (!open.length) return <div className="px-4 py-8 text-center text-[14px] text-ink-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-line" aria-label="Open escalations">
      {open.map((e) => (
        <li key={e.SK} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className={`mono text-[14px] ${e.type === "neighbour" ? "text-danger" : e.type === "supply" ? "text-warning" : "text-ink-muted"}`}>{GLYPH[e.type]}</span>
            <button className="truncate text-left text-[14px] font-semibold hover:underline" onClick={() => onSelect(e.residentId)}>{e.name}</button>
            <span className="ml-auto mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{ESC_LABEL[e.type]}</span>
          </div>
          <p className="text-[13px] text-ink-muted">{e.message}</p>
          <div className="flex items-center gap-3">
            <span className="mono text-[12px] text-ink-muted">{timeHM(e.createdAt)}{e.notified?.length ? ` · ${e.notified.join(", ")} sent` : ""}</span>
            <button className="btn btn-secondary ml-auto h-8 px-3 text-[13px]" disabled={busy === e.SK} onClick={async () => { setBusy(e.SK); try { await onResolve(e.SK); } finally { setBusy(null); } }}>{busy === e.SK ? "Marking…" : "Mark resolved"}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
