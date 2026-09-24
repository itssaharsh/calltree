"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { getJSON, forcedState } from "@/lib/api";
import type { Report } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { RULE_LABEL, ESC_LABEL, minutes, usd, pct, dateShort, timeHM } from "@/lib/format";

const LABELS = ["OK", "NEEDS", "URGENT", "UNSURE"] as const;

function Stat({ label, value, sub, big }: { label: string; value: React.ReactNode; sub?: string; big?: boolean }) {
  return <div className={`hairline flex flex-col gap-1 py-4 ${big ? "md:col-span-2" : ""}`}><span className="label">{label}</span><span className={`numeral ${big ? "text-[64px] text-accent md:text-[96px]" : "text-[40px]"}`}>{value}</span>{sub && <span className="text-[13px] text-ink-muted">{sub}</span>}</div>;
}

export function ReportClient() {
  const params = useSearchParams();
  const id = params.get("drill");
  const forced = forcedState();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (forced === "loading") return;
    if (forced === "error" || forced === "not-found") { setError(forced === "not-found" ? "Drill not found" : "Couldn't reach the API"); return; }
    if (!id) { getJSON<{ drills: { id: string }[] }>("/drills").then((d) => { if (d.drills[0]) window.location.replace(`/report/?drill=${d.drills[0].id}`); else setError("No drills yet."); }).catch((e) => setError(e.message)); return; }
    getJSON<Report>(`/report/${id}`).then(setReport).catch((e) => setError(e.message));
  }, [id, forced]);

  if (error) return <div className="mx-auto max-w-[720px] px-4 py-16 text-center"><p className="text-[18px]">{error}</p><Link href="/ops/" className="btn btn-secondary mt-4">Back to the ops room</Link></div>;
  if (!report) return <div className="mx-auto w-full max-w-[1100px] px-4 py-8"><div className="sk h-10 w-72" /><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk h-24" />)}</div></div>;

  const { drill, counts, metrics, evaluation } = report;
  const seedCalls = report.calls.filter((c) => c.carrier === "simulated");
  const download = () => { const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `calltree-${drill.id}.json`; a.click(); };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="label">After-action report · {report.town} · zone {report.zone}</p>
          <h1 className="mt-1 text-[32px] font-extrabold md:text-[40px]">Heat drill, {dateShort(drill.startedAt)}</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Trigger: {drill.trigger}{drill.alertEvent ? ` (${drill.alertEvent})` : ""} · {drill.completedAt ? `completed ${timeHM(drill.completedAt)}` : "still running"} · drill {drill.id}</p>
        </div>
        <div className="ml-auto flex gap-2"><Link href="/ops/" className="btn btn-secondary">Ops room</Link><button className="btn btn-primary" onClick={download}>Download JSON</button></div>
      </div>

      <section className="mt-8" aria-labelledby="proof">
        <h2 id="proof" className="text-[22px] font-extrabold">The numbers a city manager would ask for</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-8 md:grid-cols-4">
          <Stat big label="Reached" value={pct(report.reachRate)} sub={`${report.reached} of ${counts.total} answered, ${counts.NO_ANSWER} never picked up`} />
          <Stat big label="Time to every first attempt" value={minutes(metrics.minutesToFirstAttempt)} sub="8 lines in parallel, simulated calls" />
          <Stat label="Register" value={<NumberFlow value={counts.total} />} sub="residents with consent on file" />
          <Stat label="Time to all, with retries" value={minutes(metrics.minutesTotal)} sub={`${metrics.attempts} attempts`} />
          <Stat label="Projected with real phone lines" value={`${metrics.projectedPstnMinutes} min`} sub="45 s per call, 8 lines, one retry" />
          <Stat label="Escalated to a person" value={<NumberFlow value={metrics.escalations} />} sub={`${counts.URGENT} urgent · ${counts.UNSURE} unsure · ${counts.NEEDS} needs · ${counts.NO_ANSWER} visits`} />
          <Stat label="Cost per resident" value={usd(metrics.costPerResidentUsd, 4)} sub="Lex, Polly, Lambda, Step Functions list prices" />
          <Stat label="Drill cost" value={usd(metrics.costUsd, 2)} sub="a volunteer phone tree takes two days" />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="eval">
        <h2 id="eval" className="text-[22px] font-extrabold">Is the classifier allowed to say OK?</h2>
        <p className="mt-1 max-w-[70ch] text-[15px] text-ink-muted">Sixty labelled calls, each three spoken answers and the status a trained staff member assigned. The gate that matters: no call labelled URGENT or UNSURE may come out as OK. Understanding is Amazon Lex; the rules are code, not a prompt.</p>
        {evaluation ? (
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
            <div className="panel overflow-x-auto bg-white p-4">
              <table className="w-full text-[14px]">
                <thead><tr className="text-left text-[12px] uppercase tracking-[0.08em] text-ink-muted"><th className="pb-2">Labelled ↓ / classified →</th>{LABELS.map((l) => <th key={l} className="pb-2 pr-3 text-right">{l}</th>)}</tr></thead>
                <tbody>{LABELS.map((row) => <tr key={row} className="border-t border-line"><td className="py-2 font-semibold">{row}</td>{LABELS.map((col) => { const v = evaluation.matrix?.[row]?.[col] || 0; const unsafe = (row === "URGENT" || row === "UNSURE") && col === "OK" && v > 0; return <td key={col} className="py-1 pr-1"><span className={`num flex h-11 items-center justify-end rounded-sm px-3 text-[16px] ${row === col ? "bg-[#D6EFE0] text-success" : unsafe ? "bg-[#F8D5CF] text-danger" : v ? "bg-[#FBE7B8] text-warning" : "text-ink-muted"}`}>{v}</span></td>; })}</tr>)}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3">
              <Stat label="Safety gate" value={evaluation.unsafe === 0 ? "PASS" : "FAIL"} sub={`${evaluation.unsafe} urgent or unsure calls marked OK`} />
              <Stat label="Exact agreement" value={`${evaluation.correct} / ${evaluation.total}`} sub={`understanding by ${evaluation.nlu === "lex" ? "Amazon Lex (live bot)" : "offline keyword twin"} · ${dateShort(evaluation.at)}`} />
            </div>
          </div>
        ) : <p className="mt-3 text-[14px] text-ink-muted">The evaluation has not been published to this deployment yet. Run scripts/eval.mjs.</p>}
      </section>

      <section className="mt-10" aria-labelledby="calls">
        <h2 id="calls" className="text-[22px] font-extrabold">Every call, every decision</h2>
        <p className="mt-1 text-[14px] text-ink-muted">{seedCalls.length} simulated calls to the seeded register{report.calls.length - seedCalls.length ? ` and ${report.calls.length - seedCalls.length} browser calls from visitors` : ""}. Simulated calls use each resident's scripted answers; the understanding and the decision are the real pipeline.</p>
        <div className="panel mt-3 overflow-x-auto bg-white">
          <table className="w-full text-[14px]">
            <thead><tr className="text-left text-[12px] uppercase tracking-[0.08em] text-ink-muted"><th className="px-3 py-2">Resident</th><th className="px-3 py-2">Attempt</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2">Because</th><th className="px-3 py-2">Quote</th><th className="px-3 py-2">Next</th><th className="px-3 py-2 text-right">Ended</th></tr></thead>
            <tbody>{report.calls.map((c) => <tr key={c.SK} className="border-t border-line align-top"><td className="px-3 py-2 font-semibold">{c.name}</td><td className="num px-3 py-2">{c.attempt}</td><td className="px-3 py-2"><StatusChip status={c.outcome} /></td><td className="px-3 py-2 text-ink-muted">{RULE_LABEL[c.decision?.rule || ""] || c.decision?.rule}</td><td className="mono max-w-[320px] px-3 py-2 text-[12px]">{c.decision?.evidenceQuote ? `“${c.decision.evidenceQuote}”` : ""}</td><td className="px-3 py-2 text-ink-muted">{c.escalation ? ESC_LABEL[c.escalation.type] : "—"}</td><td className="num px-3 py-2 text-right text-ink-muted">{timeHM(c.endedAt)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="What is real and what is simulated">
        <div className="panel p-4"><h3 className="text-[16px] font-extrabold">What is real</h3><ul className="mt-2 list-disc pl-5 text-[14px] text-ink-muted"><li>Amazon Lex V2 understanding for every answer, with confidence and sentiment.</li><li>The decision rules, the escalations, the retries and the report, running on Lambda, Step Functions and DynamoDB.</li><li>The browser call: your voice through Lex, Polly speaking back.</li><li>The NWS alert watch for zone {report.zone} every 15 minutes.</li></ul></div>
        <div className="panel p-4"><h3 className="text-[16px] font-extrabold">What is simulated, and why</h3><ul className="mt-2 list-disc pl-5 text-[14px] text-ink-muted"><li>The 100 residents are synthetic and answer from a script. No real person's data is on this register.</li><li>The phone line. This AWS account is billed through AISPL, which cannot create Amazon Connect instances or Chime SDK phone numbers, so calls run in the browser; a Twilio number plugs into the same pipeline.</li><li>Ring time is compressed to seconds so the map moves in one sitting; the projected time uses 45 s per real call.</li></ul></div>
      </section>
    </div>
  );
}
