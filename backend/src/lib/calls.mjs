// One call, whichever carrier carried it: create the record, take the three answers through Lex,
// decide in code, update the resident's pin, and create the escalation a person must act on.
import * as db from './db.mjs';
import { recognizeText } from './lex.mjs';
import { decide, escalationFor, STATUS } from './decide.mjs';
import { QUESTIONS } from './prompts.mjs';
import { randomUUID } from 'node:crypto';

const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const RESIDENTS_PK = 'RESIDENTS';
export const DRILLS_PK = 'DRILLS';
export const ESC_PK = 'ESCALATIONS';
export const drillPK = (id) => `DRILL#${id}`;
export const callSK = (residentId, attempt) => `CALL#${residentId}#${attempt}`;

export async function getResident(id) { return db.get(RESIDENTS_PK, id); }
export async function listResidents() { return db.query(RESIDENTS_PK); }

export async function startCall({ drillId, resident, attempt = 1, carrier }) {
  const call = {
    PK: drillPK(drillId), SK: callSK(resident.id, attempt), callId: randomUUID(), drillId, residentId: resident.id,
    name: resident.name, attempt, carrier, startedAt: nowIso(), endedAt: null, outcome: 'IN_PROGRESS', turns: [], decision: null, escalation: null, durationMs: 0,
  };
  await db.put(call);
  await db.update(RESIDENTS_PK, resident.id, { last: { outcome: 'IN_PROGRESS', drillId, attempt, at: call.startedAt, quote: '', callSK: call.SK } });
  return call;
}

export async function recordTurn(call, q, nlu) {
  const question = QUESTIONS.find((x) => x.q === q);
  const turn = { q, prompt: question?.text || '', transcript: nlu.transcript || '', intent: nlu.intent, confidence: +(+nlu.confidence).toFixed(3), sentiment: nlu.sentiment, nlu: nlu.nlu, at: nowIso() };
  call.turns = [...(call.turns || []).filter((t) => t.q !== q), turn].sort((a, b) => a.q - b.q);
  await db.update(call.PK, call.SK, { turns: call.turns });
  return turn;
}

export async function finishCall({ call, resident, noAnswer = false }) {
  const endedAt = nowIso();
  const decision = noAnswer
    ? { status: STATUS.NO_ANSWER, rule: 'no-answer', evidenceQuote: '', evidenceQ: null, evidencePhrase: null }
    : decide(call.turns);
  const esc = escalationFor(decision.status, call.attempt);
  let escalation = null;
  if (esc) escalation = await createEscalation({ drillId: call.drillId, resident, call, type: esc.type, label: esc.label, decision });
  const durationMs = new Date(endedAt) - new Date(call.startedAt);
  const patch = { endedAt, outcome: decision.status, decision, escalation: escalation ? { id: escalation.SK, type: escalation.type, label: escalation.label } : null, durationMs };
  Object.assign(call, patch);
  await db.update(call.PK, call.SK, patch);
  await db.update(RESIDENTS_PK, resident.id, {
    last: { outcome: decision.status, drillId: call.drillId, attempt: call.attempt, at: endedAt, quote: decision.evidenceQuote || '', rule: decision.rule, callSK: call.SK, escalation: call.escalation },
  });
  return { call, decision, escalation };
}

export async function createEscalation({ drillId, resident, call, type, label, decision }) {
  const at = nowIso();
  const messages = {
    neighbour: `${resident.name} (${resident.age}) said "${decision?.evidenceQuote || ''}" at ${at.slice(11, 16)} UTC. Please check on them now at ${resident.address}.`,
    staff: `${resident.name} could not be understood on the call. Please call back at ${resident.phone}.`,
    supply: `${resident.name} at ${resident.address}: "${decision?.evidenceQuote || ''}". Deliver a cooling kit or water today.`,
    visit: `${resident.name} at ${resident.address} did not answer two calls. Queue a home visit.`,
  };
  const item = {
    PK: ESC_PK, SK: `${at}#${resident.id}`, drillId, residentId: resident.id, name: resident.name, address: resident.address, type, label,
    to: type === 'neighbour' ? { name: resident.backupName, relation: resident.backupRelation, phone: resident.backupPhone } : { name: 'Aging services desk' },
    message: messages[type] || label, status: 'open', createdAt: at, resolvedAt: null, callSK: call?.SK || null, quote: decision?.evidenceQuote || '', notified: [],
  };
  await db.put(item);
  await db.put({ ...item, PK: drillPK(drillId), SK: `ESC#${item.SK}` });
  try {
    const { notifyStaff } = await import('./notify.mjs');
    const notified = await notifyStaff(item);
    if (notified.length) { item.notified = notified; await db.update(ESC_PK, item.SK, { notified }); }
  } catch (e) { console.warn('notify failed', e?.message); }
  return item;
}

/** Simulated carrier: the resident's scripted persona answers, understood by the real NLU. */
export async function simulateCall({ drillId, resident, attempt = 1, pace = true }) {
  const persona = resident.persona || { kind: 'fine', answers: ["I'm fine", 'Yes the AC is on', 'No'] };
  const simMs = Number(process.env.SIM_CALL_MS || 2500);
  const jitter = () => (pace ? simMs * (0.6 + Math.random() * 0.8) : 0);
  const silent = persona.kind === 'noanswer' && (attempt === 1 || persona.secondAttempt === 'silent');
  const call = await startCall({ drillId, resident, attempt, carrier: 'simulated' });
  if (silent) {
    await sleep(pace ? Math.min(simMs * 1.6, 6000) : 0);
    return finishCall({ call, resident, noAnswer: true });
  }
  const answers = persona.kind === 'noanswer' ? ["I'm fine, I was in the garden.", 'Yes, the AC is on and I have water.', 'No, nothing, thank you.'] : persona.answers;
  await sleep(jitter() / 3);
  for (const q of QUESTIONS) {
    const text = answers[q.q - 1] ?? '';
    const nlu = await recognizeText(text, `${drillId}-${resident.id}-${attempt}`);
    await recordTurn(call, q.q, nlu);
    await sleep(jitter() / 3);
  }
  return finishCall({ call, resident });
}

export async function drillCalls(drillId) {
  const calls = await db.query(drillPK(drillId), { beginsWith: 'CALL#' });
  return calls.sort((a, b) => String(a.endedAt || a.startedAt).localeCompare(String(b.endedAt || b.startedAt)));
}

export async function summarizeDrill(drillId) {
  const drill = await db.get(DRILLS_PK, drillId);
  if (!drill) return null;
  const calls = await drillCalls(drillId);
  const latestByResident = new Map();
  for (const c of calls) latestByResident.set(c.residentId, c); // attempts are time-ordered
  const counts = { total: latestByResident.size, OK: 0, NEEDS: 0, URGENT: 0, UNSURE: 0, NO_ANSWER: 0, IN_PROGRESS: 0 };
  for (const c of latestByResident.values()) counts[c.outcome] = (counts[c.outcome] || 0) + 1;
  const done = [...latestByResident.values()].filter((c) => c.endedAt);
  const firstAttemptEnds = calls.filter((c) => c.attempt === 1 && c.endedAt).map((c) => c.endedAt).sort();
  const lastFirstAttempt = firstAttemptEnds.at(-1);
  const startedAt = drill.startedAt;
  const minutesToFirstAttempt = lastFirstAttempt ? +(((new Date(lastFirstAttempt) - new Date(startedAt)) / 60000).toFixed(2)) : null;
  const completedAt = drill.completedAt;
  const minutesTotal = completedAt ? +(((new Date(completedAt) - new Date(startedAt)) / 60000).toFixed(2)) : null;
  const reached = done.filter((c) => c.outcome !== 'NO_ANSWER').length;
  const escalations = await db.query(drillPK(drillId), { beginsWith: 'ESC#' });
  // list prices, us-east-1, Sept 2026: Lex speech $0.004/request, Lex text $0.00075, Polly neural $16 per 1M chars,
  // Step Functions $0.025 per 1k transitions, Lambda rounding. A real PSTN leg adds about $0.014/min (carrier).
  const speechTurns = calls.reduce((n, c) => n + (c.carrier === 'simulated' ? 0 : (c.turns || []).length), 0);
  const textTurns = calls.reduce((n, c) => n + (c.carrier === 'simulated' ? (c.turns || []).length : 0), 0);
  const pollyChars = calls.filter((c) => c.outcome !== 'NO_ANSWER').length * 620;
  const costUsd = +(speechTurns * 0.004 + textTurns * 0.00075 + (pollyChars / 1e6) * 16 + calls.length * 6 * 0.000025 + calls.length * 0.0002).toFixed(4);
  const projectedPstnMinutes = +((Math.ceil(counts.total / 8) * 0.75) + (counts.NO_ANSWER + (calls.length - counts.total)) * 0.1 + 0.5).toFixed(1);
  return {
    drill, counts, reached, reachRate: counts.total ? +((reached / counts.total).toFixed(3)) : 0,
    metrics: { minutesToFirstAttempt, minutesTotal, costUsd, costPerResidentUsd: counts.total ? +((costUsd / counts.total).toFixed(4)) : 0, projectedPstnMinutes, attempts: calls.length, escalations: escalations.length },
    calls, escalations,
  };
}
