"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { Call, Resident } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { RULE_LABEL, ESC_LABEL, timeHM } from "@/lib/format";

function Transcript({ call }: { call: Call }) {
  const d = call.decision;
  return (
    <ol className="flex flex-col gap-3" aria-label={`Transcript, attempt ${call.attempt}`}>
      {call.turns.map((t) => {
        const isEvidence = d && d.evidenceQ === t.q && d.evidenceQuote;
        return (
          <li key={t.q} className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-muted"><span className="mono text-[11px] uppercase tracking-[0.08em]">Calltree</span> · {t.prompt}</p>
            <p className="text-[15px]">
              <span className="mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{call.name.split(" ")[0]}</span>{" "}
              {t.transcript ? (isEvidence ? <mark className="bg-transparent text-ink underline decoration-accent decoration-2 underline-offset-4">“{t.transcript}”</mark> : <>“{t.transcript}”</>) : <span className="text-ink-muted">(nothing understood)</span>}
            </p>
            <p className="mono text-[11px] text-ink-muted">{t.intent} · {Math.round(t.confidence * 100)}% · {t.sentiment?.toLowerCase()} · {t.nlu}</p>
          </li>
        );
      })}
      {!call.turns.length && <li className="text-[14px] text-ink-muted">No answer after 25 seconds of ringing.</li>}
    </ol>
  );
}

export function Drawer({ resident, calls, onClose, returnFocusTo }: { resident: Resident | null; calls: Call[]; onClose: () => void; returnFocusTo?: HTMLElement | null }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!resident) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); (returnFocusTo || prev)?.focus?.(); };
  }, [resident, onClose, returnFocusTo]);
  const latest = [...calls].sort((a, b) => b.attempt - a.attempt)[0];
  return (
    <AnimatePresence>
      {resident && (
        <motion.aside ref={panel} key={resident.id} role="dialog" aria-modal="false" aria-label={`${resident.name} details`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", visualDuration: 0.35, bounce: 0 }} className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[480px] flex-col border-l border-line-strong bg-surface-1 shadow-none">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[22px] font-extrabold">{resident.name}{resident.age ? <span className="text-ink-muted">, {resident.age}</span> : null}</h2>
              <p className="truncate text-[13px] text-ink-muted">{resident.address}{resident.livesAlone ? " · lives alone" : ""}{resident.conditions?.length ? ` · ${resident.conditions.join(", ")}` : ""}</p>
            </div>
            <button className="btn btn-ghost h-9 w-9 px-0" onClick={onClose} aria-label="Close details">✕</button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
            <section className="card mb-4 p-4" aria-label="Decision">
              <div className="flex items-center gap-2">
                <StatusChip status={resident.last?.outcome || "PENDING"} />
                <span className="text-[13px] text-ink-muted">{resident.last ? RULE_LABEL[resident.last.rule || ""] || resident.last.rule : "not yet called"}</span>
                <span className="ml-auto mono text-[12px] text-ink-muted">{resident.last ? timeHM(resident.last.at) : ""}</span>
              </div>
              {resident.last?.quote && <p className="mt-2 text-[15px]">“{resident.last.quote}”</p>}
              {resident.last?.escalation && (
                <p className="mt-2 text-[13px]"><span className="mono text-[11px] uppercase tracking-[0.08em] text-accent">{ESC_LABEL[resident.last.escalation.type]}</span> · {resident.last.escalation.label}{resident.last.escalation.type === "neighbour" && resident.backupName ? ` · ${resident.backupName} (${resident.backupRelation})` : ""}</p>
              )}
              {resident.last?.outcome === "OK" && <p className="mt-2 text-[13px] text-ink-muted">Marked OK only because all three answers were clear affirmatives.</p>}
            </section>
            {calls.length ? [...calls].sort((a, b) => a.attempt - b.attempt).map((c) => (
              <section key={c.SK} className="mb-4" aria-label={`Attempt ${c.attempt}`}>
                <h3 className="mb-2 mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">Attempt {c.attempt} · {c.carrier} · {timeHM(c.startedAt)}{c.endedAt ? ` to ${timeHM(c.endedAt)}` : ""}</h3>
                <Transcript call={c} />
              </section>
            )) : <p className="text-[14px] text-ink-muted">No calls yet in this drill.</p>}
            <section className="card p-4 text-[13px] text-ink-muted" aria-label="Register entry">
              <p><span className="text-ink">Phone</span> {resident.phone}</p>
              <p><span className="text-ink">Backup</span> {resident.backupName} ({resident.backupRelation}) {resident.backupPhone}</p>
              <p><span className="text-ink">Language</span> {resident.lang === "es" ? "Spanish (prompts in English for this demo)" : "English"} · consent on file</p>
            </section>
          </div>
          <div className="flex gap-2 border-t border-line px-5 py-3">
            <Link href={`/answer/?as=${encodeURIComponent(resident.name.split(" ")[0])}`} className="btn btn-secondary">Answer as {resident.name.split(" ")[0]}</Link>
            {latest && <span className="ml-auto self-center mono text-[12px] text-ink-muted">{latest.durationMs ? `${Math.round(latest.durationMs / 1000)} s call` : ""}</span>}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
