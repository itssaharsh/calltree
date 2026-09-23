import type { AlertStatus, Drill } from "@/lib/types";
import { timeHM, ago } from "@/lib/format";
export function AlertBanner({ alert, drill, reached }: { alert: AlertStatus | null; drill: Drill | null; reached?: number }) {
  if (drill?.running) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink" role="status" aria-live="polite">
        <span className="pulse-dot h-2 w-2 rounded-full bg-accent-ink" aria-hidden />
        <span className="mono uppercase tracking-[0.08em]">Heat drill running</span>
        <span className="num">{reached ?? 0} of {drill.total || drill.counts?.total || 100} reached</span>
      </div>
    );
  }
  const heat = alert?.heat;
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-1.5 text-[13px] ${heat ? "border-danger/50 bg-danger/10 text-ink" : "border-line bg-surface-1 text-ink-muted"}`} role="status">
      <span className={`h-2 w-2 rounded-full ${heat ? "bg-danger" : "bg-success"}`} aria-hidden />
      {alert ? (
        heat ? <span><strong className="text-ink">{alert.heatAlerts?.[0]?.event || "Heat alert"}</strong> active for {alert.zone}</span> : <span>No active heat alert for {alert.zone} · checked {alert.checkedAt ? ago(alert.checkedAt) : "—"}</span>
      ) : <span>Checking NWS…</span>}
      {drill && !drill.running && <span className="hidden text-ink-muted md:inline">· last drill {timeHM(drill.completedAt || drill.startedAt)}</span>}
    </div>
  );
}
