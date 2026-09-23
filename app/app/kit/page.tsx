import { StatusChip } from "@/components/StatusChip";
import { Mark, Wordmark } from "@/components/Wordmark";
import { AlertBanner } from "@/components/AlertBanner";
import { Shell } from "@/components/Shell";
const statuses = ["OK", "NEEDS", "URGENT", "UNSURE", "NO_ANSWER", "IN_PROGRESS", "PENDING"] as const;
export default function Kit() {
  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-10 px-4 py-10">
        <section><h2 className="text-[22px] font-extrabold">Marks</h2><div className="mt-3 flex flex-wrap items-end gap-6">{[16, 32, 128].map((s) => <div key={s} className="flex flex-col items-center gap-2"><Mark size={s} /><span className="mono text-[11px] text-ink-muted">{s}px</span></div>)}<Wordmark /><Wordmark live /></div></section>
        <section><h2 className="text-[22px] font-extrabold">Type</h2><p className="text-[40px] font-extrabold leading-none md:text-[56px]">Display 56</p><p className="text-[28px] font-extrabold">Heading 28</p><p className="text-[16px]">Body 16, Funnel Sans, measure 60ch. Buttons name their result.</p><p className="mono text-[14px]">Mono 14 · 04:12 · $0.0122 · tabular</p></section>
        <section><h2 className="text-[22px] font-extrabold">Status chips</h2><div className="mt-3 flex flex-wrap gap-2">{statuses.map((s) => <StatusChip key={s} status={s} />)}</div></section>
        <section><h2 className="text-[22px] font-extrabold">Buttons</h2><div className="mt-3 flex flex-wrap gap-3"><button className="btn btn-primary">Declare heat drill</button><button className="btn btn-primary" disabled>Declaring…</button><button className="btn btn-secondary">Mark resolved</button><button className="btn btn-ghost">Reset demo world</button><button className="btn btn-primary btn-lg">Answer the call</button></div></section>
        <section><h2 className="text-[22px] font-extrabold">Inputs</h2><div className="mt-3 flex max-w-sm flex-col gap-2"><input className="input" placeholder="Rosa" /><input className="input" defaultValue="+1415555" aria-invalid="true" style={{ borderColor: "var(--danger)" }} /><p className="text-[13px] text-danger">Enter a US, Canadian, UK or Mexican number in international format.</p></div></section>
        <section><h2 className="text-[22px] font-extrabold">Alert banner</h2><div className="mt-3 flex flex-col gap-2"><AlertBanner alert={{ zone: "AZZ544", checkedAt: new Date().toISOString(), active: [], heat: false }} drill={null} /><AlertBanner alert={{ zone: "AZZ544", checkedAt: new Date().toISOString(), active: [], heat: true, heatAlerts: [{ event: "Extreme Heat Warning", headline: "" }] }} drill={null} /><AlertBanner alert={null} drill={{ id: "x", startedAt: "", completedAt: null, status: "running", trigger: "manual", mode: "simulate", alertId: null, alertEvent: null, alertHeadline: null, total: 100, counts: null, metrics: null, running: true }} reached={38} /></div></section>
        <section><h2 className="text-[22px] font-extrabold">Skeleton, empty, error</h2><div className="mt-3 grid gap-3 md:grid-cols-3"><div className="sk h-20" /><div className="card p-4 text-center text-ink-muted">No open escalations. Everyone reached said they were fine.</div><div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-4 text-[14px]">Couldn't reach the API. Showing the last data. <button className="btn btn-secondary ml-2 h-8 px-3 text-[13px]">Retry</button></div></div></section>
      </div>
    </Shell>
  );
}
