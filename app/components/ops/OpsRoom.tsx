"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getJSON, postJSON, isDemo, forcedState } from "@/lib/api";
import type { Call, Config, Resident, StateResponse } from "@/lib/types";
import { Shell } from "@/components/Shell";
import { MapView } from "./MapView";
import { Ticker } from "./Ticker";
import { Queue } from "./Queue";
import { Drawer } from "./Drawer";
import { StatusPanel, ReachPanel } from "./Panels";

type Tab = "calls" | "queue";

export function OpsRoom() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCalls, setSelectedCalls] = useState<Call[]>([]);
  const [tab, setTab] = useState<Tab>("calls");
  const [busy, setBusy] = useState<"drill" | "reset" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const forced = typeof window !== "undefined" ? forcedState() : null;
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try { const s = await getJSON<StateResponse>("/state"); setState(s); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    if (forced === "loading") return;
    if (forced === "error") { setError("Couldn't reach the API."); return; }
    getJSON<Config>("/config").then(setConfig).catch(() => setConfig(null));
    refresh();
    const pre = new URLSearchParams(window.location.search).get("select");
    if (pre) setSelected(pre);
  }, [refresh, forced]);

  const running = !!state?.drill?.running;
  useEffect(() => {
    if (forced) return;
    const tick = () => { if (document.visibilityState === "visible") refresh(); };
    timer.current = window.setInterval(tick, running ? 2000 : 10000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [running, refresh, forced]);

  useEffect(() => {
    if (!selected) { setSelectedCalls([]); return; }
    const fromState = state?.calls.filter((c) => c.residentId === selected) || [];
    setSelectedCalls(fromState);
    if (!fromState.length && state?.residents.find((r) => r.id === selected)?.last) getJSON<{ calls: Call[] }>(`/residents/${selected}`).then((r) => setSelectedCalls(r.calls)).catch(() => {});
  }, [selected, state]);

  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 4000); };
  const declare = async () => {
    setBusy("drill");
    try { await postJSON("/drills", { trigger: "manual" }); notify("Heat drill declared. Eight lines are dialing."); await refresh(); }
    catch (e) { notify((e as Error).message); } finally { setBusy(null); }
  };
  const reset = async () => {
    if (!window.confirm("Reset the demo world? This clears every drill, re-seeds the 100 residents, and runs a fresh drill.")) return;
    setBusy("reset");
    try { await postJSON("/reset", { drill: true }); setSelected(null); notify("Register re-seeded. A fresh drill is running."); await refresh(); }
    catch (e) { notify((e as Error).message); } finally { setBusy(null); }
  };
  const resolve = async (sk: string) => { await postJSON("/escalations/resolve", { sk }); await refresh(); };

  const residents = useMemo(() => (forced === "empty" ? [] : state?.residents || []), [state, forced]);
  const selectedResident: Resident | null = residents.find((r) => r.id === selected) || null;
  const escalations = forced === "empty" ? [] : state?.escalations || [];
  const calls = forced === "empty" ? [] : state?.calls || [];
  const loading = !state && !error;
  const openCount = escalations.filter((e) => e.status === "open").length;
  const doneCount = calls.filter((c) => c.endedAt).length;

  const rail = (
    <>
      <div className="flex" role="tablist">
        {(["calls", "queue"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative flex-1 py-2.5 text-[13px] font-semibold ${tab === t ? "text-accent" : "text-ink-muted"}`}>
            <span className="label normal-case tracking-normal" style={{ color: "inherit", fontSize: 13 }}>{t === "calls" ? "Dispatch log" : "Queue"}</span>
            <span className="mono ml-2 text-[11px] text-ink-muted">{t === "calls" ? doneCount || "" : openCount || ""}</span>
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin hairline max-h-[42vh] min-h-0 flex-1 overflow-y-auto md:max-h-none">
        {loading ? <div className="flex flex-col gap-2 p-4">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="sk h-10" />)}</div> : tab === "calls" ? (
          <Ticker calls={calls} selected={selected} onSelect={setSelected} empty={running ? "Ringing the first eight lines…" : "No calls yet. Declare a heat drill to reach everyone on the register."} />
        ) : (
          <Queue items={escalations} onResolve={resolve} onSelect={setSelected} empty="No open escalations. Everyone reached said they were fine." />
        )}
      </div>
      {state?.drill && (
        <div className="hairline flex items-center gap-2 px-4 py-2">
          <span className="mono truncate text-[11px] text-ink-muted">drill {state.drill.id}{config ? ` · NLU ${config.lex}` : ""}{isDemo() ? " · demo fixtures" : ""}</span>
          <Link href={`/report/?drill=${encodeURIComponent(state.drill.id)}${isDemo() ? "&demo=1" : ""}`} className="btn btn-secondary ml-auto h-8 px-3 text-[13px]">Report</Link>
        </div>
      )}
    </>
  );

  return (
    <Shell full live={running} right={
      <>
        <button className="btn btn-ghost hidden h-9 px-2 text-[13px] lg:inline-flex" onClick={reset} disabled={busy !== null}>{busy === "reset" ? "Resetting…" : "Reset demo world"}</button>
        <Link href={`/answer/${isDemo() ? "?demo=1" : ""}`} className="btn btn-secondary hidden sm:inline-flex">Get called yourself</Link>
        <button className="btn btn-primary" onClick={declare} disabled={busy !== null || running} title={running ? "A drill is already running" : undefined}>{busy === "drill" ? "Declaring…" : "Declare heat drill"}</button>
      </>
    }>
      {error && (
        <div role="alert" className="mx-3 mt-3 flex items-center gap-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[14px]">
          <span>Couldn't reach the API ({error}). Showing the last data.</span>
          <button className="btn btn-secondary ml-auto h-8 px-3 text-[13px]" onClick={refresh}>Retry</button>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col md:block">
        <div className="relative h-[56vh] min-h-[360px] md:absolute md:inset-0 md:h-auto md:min-h-0">
          {loading ? <div className="sk absolute inset-0 rounded-none" aria-label="Loading register" /> : residents.length ? (
            <MapView residents={residents} center={config?.center || { lat: 33.492, lon: -112.19 }} styleUrl={config?.mapStyle || null} selected={selected} onSelect={setSelected} running={running} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center text-ink-muted"><div><p className="text-[16px] text-ink">No residents on the register.</p><p className="text-[14px]">Reset the demo world to seed 100.</p></div></div>
          )}
                    <div className="pointer-events-none absolute left-3 top-3 flex w-[min(360px,calc(100%-24px))] flex-col gap-2 [&>*]:pointer-events-auto">
            <StatusPanel alert={state?.alert || null} drill={state?.drill || null} zone={config?.zone || "AZZ544"} town={config?.town || "Maryvale, Phoenix AZ"} reached={state?.drill?.reached} />
            <ReachPanel counts={state?.drill?.counts || null} metrics={state?.drill?.metrics || null} reached={state?.drill?.reached} running={running} loading={loading} />
          </div>
          <aside className="panel absolute right-3 top-3 bottom-3 z-10 hidden w-[380px] flex-col overflow-hidden md:flex" aria-label="Dispatch log and queue">{rail}</aside>
          <Drawer resident={selectedResident} calls={selectedCalls} onClose={() => setSelected(null)} />
        </div>
        <aside className="flex min-h-0 flex-col border-t border-line bg-surface-1 md:hidden" aria-label="Dispatch log and queue">{rail}</aside>
      </div>
      {toast && <div role="status" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-md bg-ink px-4 py-2 text-[14px] text-white" style={{ boxShadow: "var(--shadow-2)" }}>{toast}</div>}
    </Shell>
  );
}
