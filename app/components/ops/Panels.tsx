"use client";
import { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import type { AlertStatus, Counts, Drill, Metrics, Status } from "@/lib/types";
import { STATUS_COLOR, minutes, ago } from "@/lib/format";

function useNow(everyMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const f = () => setNow(Date.now()); f(); const i = setInterval(f, everyMs); return () => clearInterval(i); }, [everyMs]);
  return now;
}
export function Clock() {
  const now = useNow(1000);
  return <span className="mono text-[12px] text-ink-muted" aria-label="Local time" suppressHydrationWarning>{now ? new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}</span>;
}

export function StatusPanel({ alert, drill, zone, town }: { alert: AlertStatus | null; drill: Drill | null; zone: string; town: string }) {
  const running = !!drill?.running;
  const heat = !!alert?.heat;
  const now = useNow(15000);
  const checked = now && alert?.checkedAt ? ago(alert.checkedAt) : "…";
  return (
    <div className={`rounded-md border px-4 py-3 ${running ? "border-accent bg-accent text-accent-ink" : heat ? "border-danger/60 bg-danger/10" : "panel"}`} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className={`label ${running ? "text-accent-ink" : ""}`}>{running ? "heat drill running" : heat ? "heat alert active" : "no active heat alert"}</span>
        {running ? <span className="mono text-[12px] font-semibold" suppressHydrationWarning>{now ? new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span> : <Clock />}
      </div>
      <p className={`mt-1 text-[14px] ${running ? "" : "text-ink-muted"}`}>
        {running ? `Calling the register, eight lines at a time.` : heat ? <><strong className="text-ink">{alert?.heatAlerts?.[0]?.event}</strong> for zone {zone}</> : <>{town} · zone {zone} · NWS checked {checked}</>}
      </p>
    </div>
  );
}

const LEGEND: [Extract<Status, "OK" | "NEEDS" | "URGENT" | "UNSURE" | "NO_ANSWER">, string][] = [["OK", "fine"], ["NEEDS", "needs"], ["URGENT", "urgent"], ["UNSURE", "unsure"], ["NO_ANSWER", "no answer"]];

export function ReachPanel({ counts, metrics, reached, running, loading }: { counts: Counts | null; metrics: Metrics | null; reached?: number; running: boolean; loading?: boolean }) {
  if (loading) return <div className="panel p-4"><div className="sk h-16 w-40" /><div className="sk mt-3 h-4 w-64" /></div>;
  const c = counts || { total: 0, OK: 0, NEEDS: 0, URGENT: 0, UNSURE: 0, NO_ANSWER: 0, IN_PROGRESS: 0 };
  const total = c.total || 100;
  const dialing = Math.min(8, c.IN_PROGRESS || 0);
  return (
    <div className="panel px-4 py-3" aria-label="Drill totals">
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="label">reached</span>
          <div className="numeral text-[54px]"><NumberFlow value={reached ?? 0} /><span className="text-ink-muted"> / {total}</span></div>
        </div>
        <div className="text-right">
          <span className="label">{metrics?.minutesTotal != null ? "time to all" : running ? "elapsed" : "time to all"}</span>
          <div className="mono text-[18px] font-semibold">{metrics?.minutesTotal != null ? minutes(metrics.minutesTotal) : running ? "running" : "—"}</div>
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Outcomes">
        {LEGEND.map(([k, label]) => (
          <li key={k} className="mono flex items-center gap-1.5 text-[12px]"><span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[k] }} aria-hidden /><NumberFlow value={c[k] || 0} /><span className="text-ink-muted">{label}</span></li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex gap-1" aria-label={`${dialing} of 8 lines dialing`}>
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className={`h-3 w-2 rounded-[2px] ${i < dialing ? "dial bg-accent" : "bg-surface-3"}`} style={i < dialing ? { animationDelay: `${i * 90}ms` } : undefined} aria-hidden />)}
        </div>
        <span className="label">{running ? `${dialing} of 8 lines dialing` : "8 lines · idle"}</span>
      </div>
    </div>
  );
}
