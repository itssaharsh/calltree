"use client";
import { useState } from "react";
import type { Escalation } from "@/lib/types";
import { ESC_LABEL, timeHM } from "@/lib/format";

const TONE: Record<string, string> = { neighbour: "text-danger", staff: "text-ink", supply: "text-warning", visit: "text-ink-muted" };

export function Queue({ items, onResolve, onSelect, empty }: { items: Escalation[]; onResolve: (sk: string) => Promise<void>; onSelect: (id: string) => void; empty: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const open = items.filter((e) => e.status === "open");
  if (!open.length) return <div className="px-4 py-10 text-center text-[14px] text-ink-muted">{empty}</div>;
  return (
    <ul aria-label="Open escalations">
      {open.map((e) => (
        <li key={e.SK} className="hairline flex flex-col gap-1.5 px-4 py-3 first:border-t-0">
          <div className="grid grid-cols-[58px_1fr_auto] items-baseline gap-x-3">
            <span className="mono text-[11px] text-ink-muted">{timeHM(e.createdAt).slice(0, 8)}</span>
            <button className="truncate text-left text-[14px] font-semibold hover:underline" onClick={() => onSelect(e.residentId)}>{e.name}</button>
            <span className={`label ${TONE[e.type]}`}>{ESC_LABEL[e.type]}</span>
          </div>
          <p className="pl-[70px] text-[13px] leading-snug text-ink-muted">{e.message}</p>
          <div className="flex items-center gap-3 pl-[70px]">
            {e.notified?.length ? <span className="label">{e.notified.join(", ")} sent</span> : <span className="label">queue only</span>}
            <button className="btn btn-secondary ml-auto h-8 px-3 text-[13px]" disabled={busy === e.SK} onClick={async () => { setBusy(e.SK); try { await onResolve(e.SK); } finally { setBusy(null); } }}>{busy === e.SK ? "Marking…" : "Mark resolved"}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
