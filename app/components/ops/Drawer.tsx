"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { Call, Resident } from "@/lib/types";
import { STATUS_LABEL, RULE_LABEL, ESC_LABEL, timeHM } from "@/lib/format";
import { Quote } from "./Ticker";

function Transcript({ call }: { call: Call }) {
  const d = call.decision;
  return (
    <ol className="flex flex-col" aria-label={`Transcript, attempt ${call.attempt}`}>
      {call.turns.map((t) => {
        const isEvidence = d && d.evidenceQ === t.q && d.evidenceQuote;
        return (
          <li key={t.q} className="hairline grid grid-cols-[58px_1fr] gap-x-3 py-3 first:border-t-0">
            <span className="mono pt-1 text-[11px] text-ink-muted">{timeHM(t.at).slice(0, 8)}</span>
            <div className="min-w-0">
              <p className="text-[13px] text-ink-muted"><span className="label">calltree</span> {t.prompt}</p>
              <p className="mt-1 text-[16px] leading-snug">
                <span className="label mr-1">{call.name.split(" ")[0].toLowerCase()}</span>
                {t.transcript ? (isEvidence ? <Quote text={t.transcript} phrase={d?.evidencePhrase || t.transcript} /> : <>“{t.transcript}”</>) : <span className="text-ink-muted">(nothing understood)</span>}
              </p>
              <p className="mono mt-1 text-[11px] text-ink-muted">{t.intent} · {Math.round(t.confidence * 100)}% · {t.sentiment?.toLowerCase()} · {t.nlu === "lex" ? "Amazon Lex" : "keyword twin"}</p>
            </div>
          </li>
        );
      })}
      {!call.turns.length && <li className="py-3 text-[14px] text-ink-muted">No answer after 25 seconds of ringing.</li>}
    </ol>
  );
}

export function Drawer({ resident, calls, onClose }: { resident: Resident | null; calls: Call[]; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!resident) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [resident, onClose]);
  const status = resident?.last?.outcome || "PENDING";
  return (
    <AnimatePresence>
      {resident && (
        <motion.aside ref={panel} key={resident.id} role="dialog" aria-modal="false" aria-label={`${resident.name} details`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", visualDuration: 0.35, bounce: 0 }} className="panel absolute inset-y-0 right-0 z-20 flex w-full max-w-[480px] flex-col rounded-none border-y-0 border-r-0 md:inset-y-3 md:right-3 md:rounded-[14px] md:border" style={{ boxShadow: "var(--shadow-2)" }}>
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <p className="label">{resident.kind === "visitor" ? "visitor" : `register · ${resident.id}`}</p>
              <h2 className="mt-1 truncate text-[26px] font-extrabold">{resident.name}{resident.age ? <span className="text-ink-muted">, {resident.age}</span> : null}</h2>
              <p className="truncate text-[13px] text-ink-muted">{resident.address}{resident.livesAlone ? " · lives alone" : ""}{resident.conditions?.length ? ` · ${resident.conditions.join(", ")}` : ""}</p>
            </div>
            <button className="btn btn-ghost h-9 w-9 px-0" onClick={onClose} aria-label="Close details">✕</button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-4">
            <section className="mt-4 rounded-md border border-line bg-white p-4" aria-label="Decision">
              <div className="flex items-end justify-between gap-3">
                <span className={`stamp stamp-${status} text-[34px]`}>{STATUS_LABEL[status]}</span>
                <span className="mono text-[12px] text-ink-muted">{resident.last ? timeHM(resident.last.at) : "not called yet"}</span>
              </div>
              <p className="mt-2 text-[14px] text-ink-muted">{resident.last ? (RULE_LABEL[resident.last.rule || ""] || resident.last.rule) : "waiting for the next drill"}</p>
              {resident.last?.quote && <p className="mt-3 text-[18px] leading-snug"><Quote text={resident.last.quote} phrase={resident.last.rule === "never-ok-phrase" || resident.last.rule === "not-fine-phrase" || resident.last.rule === "no-cooling" || resident.last.rule === "request-phrase" ? (calls.find((c) => c.SK === resident.last?.callSK)?.decision?.evidencePhrase || null) : null} /></p>}
              {resident.last?.escalation && (
                <p className="mt-3 text-[13px]"><span className="label text-accent">{ESC_LABEL[resident.last.escalation.type]}</span> <span className="text-ink-muted">·</span> {resident.last.escalation.label}{resident.last.escalation.type === "neighbour" && resident.backupName ? ` · ${resident.backupName} (${resident.backupRelation})` : ""}</p>
              )}
              {status === "OK" && <p className="mt-3 text-[13px] text-ink-muted">OK only because all three answers were clear affirmatives.</p>}
            </section>
            {calls.length ? [...calls].sort((a, b) => a.attempt - b.attempt).map((c) => (
              <section key={c.SK} className="mt-5" aria-label={`Attempt ${c.attempt}`}>
                <p className="label">attempt {c.attempt} · {c.carrier} · {c.durationMs ? `${Math.round(c.durationMs / 1000)} s` : "in progress"}</p>
                <Transcript call={c} />
              </section>
            )) : <p className="mt-5 text-[14px] text-ink-muted">No calls yet in this drill.</p>}
            <section className="hairline mt-5 pt-4 text-[13px] text-ink-muted" aria-label="Register entry">
              <p className="label mb-1">register entry</p>
              <p>Phone {resident.phone} · Backup {resident.backupName} ({resident.backupRelation}) {resident.backupPhone}</p>
              <p>{resident.lang === "es" ? "Spanish speaker, prompts in English for this demo" : "English"} · consent on file</p>
            </section>
          </div>
          <div className="hairline flex gap-2 px-5 py-3">
            <Link href={`/answer/?as=${encodeURIComponent(resident.name.split(" ")[0])}`} className="btn btn-secondary">Answer as {resident.name.split(" ")[0]}</Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
