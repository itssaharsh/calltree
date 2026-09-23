"use client";
import NumberFlow from "@number-flow/react";
import type { Counts, Metrics } from "@/lib/types";
import { minutes } from "@/lib/format";

function Tile({ label, value, tone, text }: { label: string; value?: number; tone?: string; text?: string }) {
  return (
    <div className="flex min-w-[112px] flex-col gap-1 rounded-md border border-line bg-surface-1 px-4 py-3">
      <span className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="num text-[26px] font-semibold leading-none" style={tone ? { color: tone } : undefined}>
        {text !== undefined ? text : <NumberFlow value={value ?? 0} />}
      </span>
    </div>
  );
}

export function Kpis({ counts, metrics, reached, loading }: { counts: Counts | null; metrics: Metrics | null; reached?: number; loading?: boolean }) {
  if (loading) return <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-6">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="sk h-[72px] min-w-[112px]" />)}</div>;
  const c = counts || { total: 0, OK: 0, NEEDS: 0, URGENT: 0, UNSURE: 0, NO_ANSWER: 0, IN_PROGRESS: 0 };
  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto px-4 py-3 md:px-6" role="list" aria-label="Drill totals">
      <Tile label="Reached" text={`${reached ?? 0} / ${c.total}`} />
      <Tile label="OK" value={c.OK} tone="#4CC38A" />
      <Tile label="Needs" value={c.NEEDS} tone="#FFD24A" />
      <Tile label="Urgent" value={c.URGENT} tone="#FF7A7A" />
      <Tile label="Unsure" value={c.UNSURE} />
      <Tile label="No answer" value={c.NO_ANSWER} tone="#9CA3AF" />
      <Tile label="Time to all" text={metrics?.minutesTotal != null ? minutes(metrics.minutesTotal) : c.IN_PROGRESS || (c.total && reached !== c.total) ? "running" : "—"} />
    </div>
  );
}
