// ?demo=1: the same screens on recorded fixtures, with a client-side replay of the drill so the
// map still moves. No network, no credentials. Shapes are identical to the live API.
import type { StateResponse, Config, Report, Call, Resident, Status, BrowserTurnResponse } from "./types";
import { mockRecognize, decide, escalationFor, QUESTIONS, greeting, closing } from "./engine";

let fixtures: { state: StateResponse; config: Config; report: Report } | null = null;
let replayStart: number | null = null; // ms epoch when the demo drill was declared
const REVEAL_MS = 420; // one call every 420 ms: 100 residents in about 45 s
const sessions = new Map<string, { name: string; q: number; turns: Array<{ q: number } & ReturnType<typeof mockRecognize>>; residentId: string }>();
const demoResidents: Resident[] = [];

async function load() {
  if (fixtures) return fixtures;
  const [state, config, report] = await Promise.all(["state", "config", "report"].map((n) => fetch(`/fixtures/${n}.json`).then((r) => r.json())));
  fixtures = { state, config, report };
  return fixtures;
}

function replayedState(base: StateResponse): StateResponse {
  const calls = [...base.calls].sort((a, b) => String(a.endedAt).localeCompare(String(b.endedAt)));
  if (replayStart === null) return { ...base, residents: [...base.residents, ...demoResidents] };
  const elapsed = Date.now() - replayStart;
  const revealed = Math.min(calls.length, Math.floor(elapsed / REVEAL_MS));
  const shown = calls.slice(0, revealed).map((c, i) => ({ ...c, startedAt: new Date(replayStart! + i * REVEAL_MS - 1500).toISOString(), endedAt: new Date(replayStart! + i * REVEAL_MS).toISOString() }));
  const lastBy = new Map<string, Call>();
  for (const c of shown) lastBy.set(c.residentId, c);
  const residents = base.residents.map((r) => {
    const c = lastBy.get(r.id);
    return { ...r, last: c ? { outcome: c.outcome as Status, drillId: c.drillId, attempt: c.attempt, at: c.endedAt!, quote: c.decision?.evidenceQuote || "", rule: c.decision?.rule, callSK: c.SK, escalation: c.escalation } : null };
  });
  const counts = { total: base.residents.filter((r) => r.kind === "seed").length, OK: 0, NEEDS: 0, URGENT: 0, UNSURE: 0, NO_ANSWER: 0, IN_PROGRESS: 0 };
  for (const c of lastBy.values()) counts[c.outcome as keyof typeof counts] = (counts[c.outcome as keyof typeof counts] || 0) + 1;
  const done = revealed >= calls.length;
  const drill = base.drill ? { ...base.drill, startedAt: new Date(replayStart).toISOString(), completedAt: done ? new Date(replayStart + calls.length * REVEAL_MS).toISOString() : null, running: !done, counts, reached: [...lastBy.values()].filter((c) => c.outcome !== "NO_ANSWER").length, metrics: done ? base.drill.metrics : null } : null;
  const escalations = base.escalations.filter((e) => lastBy.has(e.residentId) && lastBy.get(e.residentId)!.outcome !== "OK");
  return { ...base, residents: [...residents, ...demoResidents], calls: shown, drill, escalations, at: new Date().toISOString() };
}

export async function demoGet(path: string): Promise<unknown> {
  const f = await load();
  if (path === "/config") return f.config;
  if (path === "/state") return replayedState(f.state);
  if (path.startsWith("/report/")) return f.report;
  if (path.startsWith("/residents/")) {
    const id = path.split("/")[2];
    const st = replayedState(f.state);
    const resident = st.residents.find((r) => r.id === id);
    return { resident, calls: st.calls.filter((c) => c.residentId === id) };
  }
  if (path === "/alerts") return f.state.alert;
  if (path === "/health") return { ok: true, lex: "mock", version: "demo" };
  throw new Error(`demo: no fixture for ${path}`);
}

export async function demoPost(path: string, body: unknown): Promise<unknown> {
  const f = await load();
  const b = (body || {}) as Record<string, unknown>;
  if (path === "/drills") { replayStart = Date.now(); return { drillId: f.state.drill?.id }; }
  if (path === "/reset") { replayStart = null; demoResidents.length = 0; return { residents: 100, drillId: null }; }
  if (path === "/escalations/resolve") return { ok: true };
  if (path === "/calls/browser/start") {
    const name = String(b.name || "Visitor");
    const id = `v-demo-${Math.random().toString(36).slice(2, 6)}`;
    sessions.set(id, { name, q: 1, turns: [], residentId: id });
    demoResidents.push({ id, name, age: null, lang: "en", kind: "visitor", consent: true, lat: f.config.center.lat + (Math.random() - 0.5) * 0.006, lon: f.config.center.lon + (Math.random() - 0.5) * 0.006, address: "Visitor (browser call)", phone: "browser", backupName: "your emergency contact", backupRelation: "contact", backupPhone: "", livesAlone: null, conditions: [], persona: null, last: { outcome: "IN_PROGRESS", drillId: f.state.drill?.id || "", attempt: 1, at: new Date().toISOString(), quote: "", callSK: "" } });
    const say = `${greeting(name)} ${QUESTIONS[0].text}`;
    return { sessionId: id, residentId: id, drillId: f.state.drill?.id, q: 1, say, audio: "", lexLive: false, questions: QUESTIONS.map((x) => x.text) };
  }
  if (path === "/calls/browser/turn") {
    const s = sessions.get(String(b.sessionId));
    if (!s) throw new Error("Unknown session");
    const text = String(b.text || "");
    const nlu = mockRecognize(text);
    const turn = { q: s.q, prompt: QUESTIONS[s.q - 1].text, ...nlu, at: new Date().toISOString() };
    s.turns.push(turn);
    if (s.q < 3) { s.q += 1; return { q: s.q, turn, say: QUESTIONS[s.q - 1].text, audio: "" } as BrowserTurnResponse; }
    const decision = decide(s.turns);
    const esc = escalationFor(decision.status, 1);
    const r = demoResidents.find((x) => x.id === s.residentId);
    if (r) r.last = { outcome: decision.status as Status, drillId: f.state.drill?.id || "", attempt: 1, at: new Date().toISOString(), quote: decision.evidenceQuote, rule: decision.rule, callSK: "", escalation: esc ? { id: "demo", type: esc.type, label: esc.label } : null };
    return { done: true, q: 3, turn, decision, escalation: esc ? { ...esc, message: esc.label, to: { name: "your emergency contact" } } : null, say: closing(decision.status, { name: s.name }), audio: "", residentId: s.residentId, drillId: f.state.drill?.id } as BrowserTurnResponse;
  }
  if (path === "/calls/phone") throw new Error("Phone calls need the live deployment with a carrier configured.");
  throw new Error(`demo: no handler for ${path}`);
}
