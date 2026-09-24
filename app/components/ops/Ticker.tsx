"use client";
import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Call } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { timeHM } from "@/lib/format";

export function Quote({ text, phrase, className = "" }: { text: string; phrase?: string | null; className?: string }) {
  if (!text) return null;
  if (!phrase) return <span className={className}>“{text}”</span>;
  const i = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (i < 0) return <span className={className}>“{text}”</span>;
  return <span className={className}>“{text.slice(0, i)}<mark className="evidence bg-transparent">{text.slice(i, i + phrase.length)}</mark>{text.slice(i + phrase.length)}”</span>;
}

export function Ticker({ calls, selected, onSelect, empty }: { calls: Call[]; selected: string | null; onSelect: (id: string) => void; empty: string }) {
  const rows = [...calls].filter((c) => c.endedAt).sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt))).slice(0, 120);
  const firstRender = useRef(true);
  const stagger = firstRender.current; firstRender.current = false;
  if (!rows.length) return <div className="px-4 py-10 text-center text-[14px] text-ink-muted">{empty}</div>;
  return (
    <ul aria-live="polite" aria-label="Completed calls, newest first">
      <AnimatePresence initial={stagger}>
        {rows.map((c, i) => (
          <motion.li key={c.SK} layout="position" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", visualDuration: 0.3, bounce: 0, delay: stagger ? Math.min(i, 24) * 0.03 : 0 }} className="hairline first:border-t-0">
            <button data-resident={c.residentId} onClick={() => onSelect(c.residentId)} aria-pressed={selected === c.residentId} className={`grid w-full grid-cols-[58px_1fr_auto] items-start gap-x-3 px-4 py-2.5 text-left hover:bg-surface-2 ${selected === c.residentId ? "bg-accent-soft" : ""}`}>
              <span className="mono pt-0.5 text-[11px] text-ink-muted">{timeHM(c.endedAt).slice(0, 8)}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold">{c.name}{c.attempt > 1 && <span className="ml-1 font-normal text-ink-muted">· 2nd try</span>}{c.carrier === "browser" && <span className="ml-1 font-normal text-accent">· browser</span>}</span>
                <span className="block truncate text-[13px] text-ink-muted"><Quote text={c.decision?.evidenceQuote || ""} phrase={c.decision?.evidencePhrase} />{!c.decision?.evidenceQuote && (c.outcome === "NO_ANSWER" ? "no pick-up after 25 s" : "")}</span>
              </span>
              <StatusChip status={c.outcome} />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
