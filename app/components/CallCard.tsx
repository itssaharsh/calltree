"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { getJSON, postJSON, forcedState, isDemo } from "@/lib/api";
import type { BrowserTurnResponse, Decision, Turn } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";
import { Mark } from "@/components/Wordmark";
import { RULE_LABEL, ESC_LABEL } from "@/lib/format";

type Phase = "idle" | "ringing" | "speaking" | "listening" | "thinking" | "done" | "mic-denied" | "error";
interface StartResp { sessionId: string; residentId: string; drillId: string; q: number; say: string; audio: string; lexLive: boolean; questions: string[] }
interface Line { who: "calltree" | "you"; text: string; turn?: Turn }

function downsampleTo16k(chunks: Float32Array[], inRate: number): Int16Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total); let o = 0; for (const c of chunks) { input.set(c, o); o += c.length; }
  const ratio = inRate / 16000; const outLen = Math.floor(input.length / ratio); const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) { const start = Math.floor(i * ratio), end = Math.min(input.length, Math.floor((i + 1) * ratio)); let sum = 0, n = 0; for (let j = start; j < end; j++) { sum += input[j]; n++; } const v = n ? sum / n : 0; out[i] = Math.max(-1, Math.min(1, v)) * 0x7fff; }
  return out;
}
const toBase64 = (pcm: Int16Array) => { const bytes = new Uint8Array(pcm.buffer); let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };

export function CallCard({ presetName }: { presetName?: string }) {
  const forced = typeof window !== "undefined" ? forcedState() : null;
  const [name, setName] = useState(presetName || "");
  const [phase, setPhase] = useState<Phase>((forced as Phase) || "idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(forced === "done" ? { status: "URGENT", rule: "never-ok-phrase", evidenceQuote: "I'm fine, just a bit dizzy", evidenceQ: 1, evidencePhrase: "dizzy" } : null);
  const [escalation, setEscalation] = useState<BrowserTurnResponse["escalation"]>(null);
  const [typed, setTyped] = useState("");
  const [useText, setUseText] = useState(false);
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<StartResp | null>(null);
  const residentId = useRef<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lexLive = session.current?.lexLive ?? false;

  useEffect(() => { if (phase === "idle" || phase === "done" || phase === "error") return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [phase]);
  useEffect(() => () => { stopRef.current?.(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); }, []);

  const say = useCallback((text: string, audio: string) => new Promise<void>((resolve) => {
    setPhase("speaking");
    setLines((l) => [...l, { who: "calltree", text }]);
    if (audio) {
      const a = new Audio(`data:audio/mp3;base64,${audio}`); audioRef.current = a;
      a.onended = () => resolve(); a.onerror = () => resolve();
      a.play().catch(() => resolve());
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.onend = () => resolve(); u.onerror = () => resolve(); window.speechSynthesis.speak(u);
    } else resolve();
  }), []);

  const listen = useCallback(async () => {
    if (useText || !lexLive) { setPhase("listening"); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
    catch { setPhase("mic-denied"); setUseText(true); return; }
    setPhase("listening");
    const ctx = new AudioContext(); const src = ctx.createMediaStreamSource(stream); const proc = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = []; let spoke = false, silentMs = 0, totalMs = 0; const frameMs = (4096 / ctx.sampleRate) * 1000;
    const finish = () => { proc.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop()); ctx.close(); stopRef.current = null; setLevel(0); const pcm = downsampleTo16k(chunks, ctx.sampleRate); void send({ audio: toBase64(pcm) }); };
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0); chunks.push(new Float32Array(d));
      let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i]; const rms = Math.sqrt(sum / d.length); setLevel(Math.min(1, rms * 8));
      totalMs += frameMs;
      if (rms > 0.015) { spoke = true; silentMs = 0; } else if (spoke) silentMs += frameMs;
      if ((spoke && silentMs > 1200) || totalMs > 9000) finish();
    };
    src.connect(proc); proc.connect(ctx.destination);
    stopRef.current = finish;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useText, lexLive]);

  const send = useCallback(async (payload: { audio?: string; text?: string }) => {
    if (!session.current) return;
    setPhase("thinking");
    try {
      const r = await postJSON<BrowserTurnResponse>("/calls/browser/turn", { sessionId: session.current.sessionId, ...payload });
      if (r.turn) setLines((l) => [...l, { who: "you", text: r.turn!.transcript || "(nothing understood)", turn: r.turn }]);
      else if (payload.text) setLines((l) => [...l, { who: "you", text: payload.text! }]);
      if (r.done) { setDecision(r.decision || null); setEscalation(r.escalation || null); await say(r.say, r.audio); setPhase("done"); return; }
      setQ(r.q);
      await say(r.say, r.audio);
      await listen();
    } catch (e) { setError((e as Error).message); setPhase("error"); }
  }, [say, listen]);

  const start = async () => {
    setError(null); setLines([]); setDecision(null); setEscalation(null); setSeconds(0); setPhase("ringing");
    try {
      await new Promise((r) => setTimeout(r, 900));
      const s = await postJSON<StartResp>("/calls/browser/start", { name: name.trim() || "Visitor" });
      session.current = s; residentId.current = s.residentId; setQ(1);
      if (!s.lexLive) setUseText(true);
      await say(s.say, s.audio);
      await listen();
    } catch (e) { setError((e as Error).message); setPhase("error"); }
  };
  const hangup = () => { stopRef.current?.(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); setPhase("idle"); session.current = null; };
  const submitTyped = (e: React.FormEvent) => { e.preventDefault(); if (!typed.trim()) return; const t = typed; setTyped(""); void send({ text: t }); };

  const ringColor = phase === "listening" ? "#4CC38A" : phase === "speaking" ? "#FFA41B" : phase === "thinking" ? "#F3E6CF" : "#3E4766";
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-4 py-8">
      <div className="card relative overflow-hidden p-6">
        <div className="lamp pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 transition-colors duration-200" style={{ borderColor: ringColor, boxShadow: phase === "listening" ? `0 0 0 ${4 + level * 18}px rgba(76,195,138,${0.12 + level * 0.2})` : undefined }}>
            <Mark size={44} live={phase !== "idle" && phase !== "done"} />
          </div>
          <div>
            <p className="font-display text-[22px] font-extrabold">Calltree</p>
            <p className="mono text-[13px] text-ink-muted" aria-live="polite">
              {phase === "idle" && "City heat check-in"}
              {phase === "ringing" && "Ringing…"}
              {phase === "speaking" && `Speaking · question ${Math.max(1, q)} of 3`}
              {phase === "listening" && (useText ? "Your turn · type your answer" : "Listening · speak now")}
              {phase === "thinking" && "Understanding…"}
              {phase === "done" && "Call ended"}
              {phase === "mic-denied" && "Microphone blocked · type instead"}
              {phase === "error" && "Call dropped"}
              {phase !== "idle" && ` · ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}
            </p>
          </div>
          {phase === "listening" && !useText && (
            <div className="flex h-6 items-end gap-1" aria-hidden>{[0.3, 0.6, 1, 0.6, 0.3].map((k, i) => <span key={i} className="w-1.5 rounded-sm bg-success transition-[height] duration-75" style={{ height: `${4 + level * 20 * k}px` }} />)}</div>
          )}
        </div>
        <ol className="relative mt-5 flex max-h-[38vh] flex-col gap-2 overflow-y-auto scrollbar-thin" aria-label="Call transcript">
          <AnimatePresence initial={false}>
            {lines.slice(-6).map((l, i) => (
              <motion.li key={`${i}-${l.text.slice(0, 12)}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`text-[15px] ${l.who === "you" ? "text-ink" : "text-ink-muted"}`}>
                <span className="mono mr-2 text-[11px] uppercase tracking-[0.08em] text-ink-muted">{l.who === "you" ? "you" : "calltree"}</span>{l.who === "you" ? `“${l.text}”` : l.text}
                {l.turn && <span className="mono ml-2 text-[11px] text-ink-muted">{l.turn.intent} {Math.round(l.turn.confidence * 100)}%</span>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        {phase === "idle" && (
          <form className="relative mt-5 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void start(); }}>
            <label className="text-[14px] text-ink-muted" htmlFor="name">Your first name, so Calltree can greet you</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rosa" maxLength={40} autoComplete="given-name" />
            <button type="submit" className="btn btn-primary btn-lg">Answer the call</button>
            <p className="text-[13px] text-ink-muted">Three questions, about a minute. Say “I feel dizzy” to see the escalation path. Chrome or Edge with a microphone works best; you can type instead.</p>
          </form>
        )}
        {(phase === "listening" || phase === "mic-denied") && (useText || !lexLive) && (
          <form className="relative mt-4 flex gap-2" onSubmit={submitTyped}>
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={q === 1 ? "I'm fine, thank you" : q === 2 ? "Yes, the AC is on" : "No, nothing"} autoFocus aria-label="Your answer" />
            <button type="submit" className="btn btn-primary">Send</button>
          </form>
        )}
        {phase === "listening" && !useText && lexLive && (
          <div className="relative mt-4 flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={() => stopRef.current?.()}>I'm done talking</button>
            <button className="btn btn-ghost" onClick={() => { stopRef.current?.(); setUseText(true); }}>Type instead</button>
          </div>
        )}
        {phase !== "idle" && phase !== "done" && phase !== "error" && (
          <div className="relative mt-4 flex justify-center"><button className="btn btn-ghost text-danger" onClick={hangup}>Hang up</button></div>
        )}
        {phase === "error" && (
          <div className="relative mt-4 flex flex-col gap-2" role="alert"><p className="text-[14px] text-danger">{error}</p><button className="btn btn-secondary" onClick={() => void start()}>Try again</button></div>
        )}
      </div>
      <AnimatePresence>
        {phase === "done" && decision && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5" role="status">
            <div className="flex items-center gap-2"><StatusChip status={decision.status} /><span className="text-[14px] text-ink-muted">{RULE_LABEL[decision.rule] || decision.rule}</span></div>
            {decision.evidenceQuote && <p className="mt-2 text-[16px]">“{decision.evidenceQuote}”</p>}
            {escalation ? <p className="mt-2 text-[14px]"><span className="mono text-[11px] uppercase tracking-[0.08em] text-accent">{ESC_LABEL[escalation.type] || escalation.type}</span> · {escalation.message}</p> : <p className="mt-2 text-[14px] text-ink-muted">Marked OK only because all three answers were clear affirmatives. Nothing for a person to do.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/ops/?select=${encodeURIComponent(residentId.current || "")}${isDemo() ? "&demo=1" : ""}`} className="btn btn-primary">See your pin on the map</Link>
              <button className="btn btn-secondary" onClick={() => { setPhase("idle"); }}>Call again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
