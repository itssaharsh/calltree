"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { getJSON, postJSON, forcedState, isDemo } from "@/lib/api";
import type { BrowserTurnResponse, Decision, Turn } from "@/lib/types";
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

  const ringColor = phase === "listening" ? "#1E7A4C" : phase === "speaking" ? "#1F3BD6" : phase === "thinking" ? "#8C570A" : "#CCC6B8";
  const stage = phase === "idle" ? "City heat check-in" : phase === "ringing" ? "Ringing…" : phase === "speaking" ? `Speaking · question ${Math.max(1, q)} of 3` : phase === "listening" ? (useText ? "Your turn · type your answer" : "Listening · speak now") : phase === "thinking" ? "Understanding…" : phase === "done" ? "Call ended" : phase === "mic-denied" ? "Microphone blocked · type instead" : "Call dropped";
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-8">
      <div className="panel relative overflow-hidden bg-white">
        <div className="relative flex items-center gap-4 px-5 pt-5">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200" style={{ borderColor: ringColor, boxShadow: phase === "listening" ? `0 0 0 ${3 + level * 16}px rgba(30,122,76,${0.12 + level * 0.25})` : phase === "speaking" ? "0 0 0 6px rgba(31,59,214,0.14)" : undefined }}>
            <Mark size={32} live={phase !== "idle" && phase !== "done"} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[22px] font-extrabold leading-none">Calltree</p>
            <p className="mono mt-1 truncate text-[12px] text-ink-muted" aria-live="polite">{stage}</p>
          </div>
          <div className="text-right">
            <p className="mono text-[20px] font-semibold leading-none">{phase === "idle" ? "00:00" : timer}</p>
            <ol className="mt-1.5 flex justify-end gap-1" aria-label={`Question ${Math.max(1, q)} of 3`}>{[1, 2, 3].map((n) => <li key={n} className={`h-1.5 w-5 rounded-[2px] ${n < q || phase === "done" ? "bg-success" : n === q && phase !== "idle" ? "bg-accent" : "bg-surface-3"}`} />)}</ol>
          </div>
        </div>
        {phase === "listening" && !useText && (
          <div className="relative mt-3 flex h-6 items-end justify-center gap-1" aria-hidden>{[0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3].map((k, i) => <span key={i} className="w-1.5 rounded-sm bg-success transition-[height] duration-75" style={{ height: `${3 + level * 22 * k}px` }} />)}</div>
        )}
        <ol className="scrollbar-thin relative mx-5 mt-4 flex max-h-[38vh] flex-col overflow-y-auto" aria-label="Call transcript">
          <AnimatePresence initial={false}>
            {lines.slice(-6).map((l, i) => (
              <motion.li key={`${i}-${l.text.slice(0, 12)}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="hairline grid grid-cols-[58px_1fr] gap-x-3 py-2.5 first:border-t-0">
                <span className="label pt-1">{l.who === "you" ? (name.trim() || "you").split(" ")[0].toLowerCase().slice(0, 8) : "calltree"}</span>
                <span className={`text-[15px] leading-snug ${l.who === "you" ? "text-ink" : "text-ink-muted"}`}>{l.who === "you" ? `“${l.text}”` : l.text}{l.turn && <span className="mono ml-2 text-[11px] text-ink-muted">{l.turn.intent} {Math.round(l.turn.confidence * 100)}%</span>}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <div className="relative px-5 pb-5">
          {phase === "idle" && (
            <form className="mt-2 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void start(); }}>
              <label className="text-[14px] text-ink-muted" htmlFor="name">Your first name, so Calltree can greet you</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rosa" maxLength={40} autoComplete="given-name" />
              <button type="submit" className="btn btn-answer btn-lg">Answer the call</button>
              <p className="text-[13px] text-ink-muted">Three questions, about a minute. Say “I feel dizzy” to see the escalation path. Chrome or Edge with a microphone works best; you can type instead.</p>
            </form>
          )}
          {(phase === "listening" || phase === "mic-denied") && (useText || !lexLive) && (
            <form className="mt-3 flex gap-2" onSubmit={submitTyped}>
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={q === 1 ? "I'm fine, thank you" : q === 2 ? "Yes, the AC is on" : "No, nothing"} autoFocus aria-label="Your answer" />
              <button type="submit" className="btn btn-primary">Send</button>
            </form>
          )}
          {phase === "listening" && !useText && lexLive && (
            <div className="mt-3 flex gap-2">
              <button className="btn btn-secondary flex-1" onClick={() => stopRef.current?.()}>I'm done talking</button>
              <button className="btn btn-ghost" onClick={() => { stopRef.current?.(); setUseText(true); }}>Type instead</button>
            </div>
          )}
          {phase !== "idle" && phase !== "done" && phase !== "error" && (
            <div className="mt-3 flex justify-center"><button className="btn btn-hangup h-9 px-4 text-[14px]" onClick={hangup}>Hang up</button></div>
          )}
          {phase === "error" && (
            <div className="mt-3 flex flex-col gap-2" role="alert"><p className="text-[14px] text-danger">{error}</p><button className="btn btn-secondary" onClick={() => void start()}>Try again</button></div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {phase === "done" && decision && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel bg-white p-5" role="status">
            <div className="flex items-end justify-between gap-3"><span className={`stamp stamp-${decision.status} text-[40px]`}>{decision.status === "NO_ANSWER" ? "No answer" : decision.status.charAt(0) + decision.status.slice(1).toLowerCase()}</span><span className="text-right text-[13px] text-ink-muted">{RULE_LABEL[decision.rule] || decision.rule}</span></div>
            {decision.evidenceQuote && <p className="mt-3 text-[18px] leading-snug">“{decision.evidencePhrase && decision.evidenceQuote.toLowerCase().includes(decision.evidencePhrase.toLowerCase()) ? <>{decision.evidenceQuote.slice(0, decision.evidenceQuote.toLowerCase().indexOf(decision.evidencePhrase.toLowerCase()))}<mark className="evidence bg-transparent">{decision.evidenceQuote.slice(decision.evidenceQuote.toLowerCase().indexOf(decision.evidencePhrase.toLowerCase()), decision.evidenceQuote.toLowerCase().indexOf(decision.evidencePhrase.toLowerCase()) + decision.evidencePhrase.length)}</mark>{decision.evidenceQuote.slice(decision.evidenceQuote.toLowerCase().indexOf(decision.evidencePhrase.toLowerCase()) + decision.evidencePhrase.length)}</> : decision.evidenceQuote}”</p>}
            {escalation ? <p className="mt-3 text-[14px]"><span className="label text-accent">{ESC_LABEL[escalation.type] || escalation.type}</span> <span className="text-ink-muted">·</span> {escalation.message}</p> : decision.status === "OK" ? <p className="mt-3 text-[14px] text-ink-muted">OK only because all three answers were clear affirmatives. Nothing for a person to do.</p> : <p className="mt-3 text-[14px] text-ink-muted">A person will follow up. Nothing here is guessed.</p>}
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
