"use client";
import { AnimatePresence, motion } from "motion/react";
import type { Call } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { timeHM } from "@/lib/format";

export function Ticker({ calls, selected, onSelect, empty }: { calls: Call[]; selected: string | null; onSelect: (id: string) => void; empty: string }) {
  const rows = [...calls].filter((c) => c.endedAt).sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt))).slice(0, 120);
  if (!rows.length) return <div className="px-4 py-8 text-center text-[14px] text-ink-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-line" aria-live="polite" aria-label="Completed calls, newest first">
      <AnimatePresence initial={false}>
        {rows.map((c) => (
          <motion.li key={c.SK} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", visualDuration: 0.3, bounce: 0 }}>
            <button onClick={() => onSelect(c.residentId)} aria-pressed={selected === c.residentId} className={`grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-2 text-left hover:bg-surface-2 ${selected === c.residentId ? "bg-surface-2" : ""}`}>
              <span className="truncate text-[14px] font-semibold">{c.name}{c.attempt > 1 && <span className="ml-1 text-ink-muted">· 2nd try</span>}{c.carrier === "browser" && <span className="ml-1 text-accent">· browser</span>}</span>
              <StatusChip status={c.outcome} />
              <span className="mono truncate text-[12px] text-ink-muted">{c.decision?.evidenceQuote ? `“${c.decision.evidenceQuote}”` : c.outcome === "NO_ANSWER" ? "no pick-up" : ""}</span>
              <span className="mono text-[12px] text-ink-muted">{timeHM(c.endedAt)}</span>
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
