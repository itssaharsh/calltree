// HTTP API router. Every route the ops room, the browser call and the report use.
import * as db from './lib/db.mjs';
import { json, parseBody, route } from './lib/http.mjs';
import { RESIDENTS_PK, DRILLS_PK, ESC_PK, drillPK, callSK, listResidents, getResident, startCall, recordTurn, finishCall, simulateCall, summarizeDrill } from './lib/calls.mjs';
import { recognizeText, recognizeAudio, LEX_LIVE } from './lib/lex.mjs';
import { speak } from './lib/polly.mjs';
import { QUESTIONS, greeting, closing } from './lib/prompts.mjs';
import { fetchNwsStatus, HEAT_EVENTS } from './lib/nws.mjs';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const SEED = JSON.parse(readFileSync(new URL('./data/residents.json', import.meta.url)));
const EVAL = JSON.parse(readFileSync(new URL('./data/eval.json', import.meta.url)));
const VERSION = process.env.APP_VERSION || 'dev';
const nowIso = () => new Date().toISOString();
const drillId = () => `${nowIso().replace(/[-:.]/g, '').slice(0, 15)}-${randomUUID().slice(0, 6)}`;
const day = () => nowIso().slice(0, 10);

let sfn, location, mapKeyCache;
async function startExecution(id, mode, trigger) {
  if (db.MOCK || !process.env.STATE_MACHINE_ARN) { const { runDrillInline } = await import('./dialer.mjs'); await runDrillInline({ drillId: id, mode }); return { inline: true }; }
  const { SFNClient, StartExecutionCommand } = await import('@aws-sdk/client-sfn');
  sfn ||= new SFNClient({});
  const r = await sfn.send(new StartExecutionCommand({ stateMachineArn: process.env.STATE_MACHINE_ARN, name: `drill-${id}`, input: JSON.stringify({ drillId: id, mode, trigger }) }));
  return { executionArn: r.executionArn };
}

async function mapKey() {
  if (mapKeyCache !== undefined) return mapKeyCache;
  if (!process.env.MAP_KEY_NAME || db.MOCK) return (mapKeyCache = null);
  try {
    const { LocationClient, DescribeKeyCommand } = await import('@aws-sdk/client-location');
    location ||= new LocationClient({});
    const r = await location.send(new DescribeKeyCommand({ KeyName: process.env.MAP_KEY_NAME }));
    return (mapKeyCache = r.Key || null);
  } catch (e) { console.warn('map key unavailable', e?.message); return (mapKeyCache = null); }
}

async function latestDrill() { const [d] = await db.query(DRILLS_PK, { forward: false, limit: 1 }); return d || null; }
const running = (d) => d && !d.completedAt && Date.now() - new Date(d.startedAt) < 20 * 60 * 1000;

export async function createDrill({ trigger = 'manual', mode = 'simulate', alert = null }) {
  const id = drillId();
  const drill = { PK: DRILLS_PK, SK: id, id, startedAt: nowIso(), completedAt: null, status: 'running', trigger, mode, alertId: alert?.id || null, alertEvent: alert?.event || null, alertHeadline: alert?.headline || null, total: 0, counts: null, metrics: null };
  await db.put(drill);
  const started = await startExecution(id, mode, trigger);
  if (started.executionArn) await db.update(DRILLS_PK, id, { executionArn: started.executionArn });
  return drill;
}

export async function reseed() {
  const drills = await db.query(DRILLS_PK);
  for (const d of drills) await db.deleteAll(drillPK(d.id));
  await db.deleteAll(DRILLS_PK);
  await db.deleteAll(ESC_PK);
  await db.deleteAll(RESIDENTS_PK);
  await db.batchPut(SEED.residents.map((r) => ({ PK: RESIDENTS_PK, SK: r.id, ...r, last: null, createdAt: nowIso() })));
  return SEED.residents.length;
}

async function alertStatus() {
  const cached = await db.get('ALERTS', 'STATUS');
  if (cached && Date.now() - new Date(cached.checkedAt) < 10 * 60 * 1000) return cached;
  try {
    const status = await fetchNwsStatus(process.env.NWS_ZONE || SEED.nwsZone);
    await db.put({ PK: 'ALERTS', SK: 'STATUS', ...status });
    return status;
  } catch (e) {
    return cached || { zone: process.env.NWS_ZONE || SEED.nwsZone, checkedAt: nowIso(), active: [], heat: false, error: e?.message || 'unreachable' };
  }
}

// ---- browser carrier: a real voice conversation through Lex and Polly, no PSTN needed ----
async function browserStart(body) {
  const name = String(body.name || 'Visitor').trim().slice(0, 40) || 'Visitor';
  const starts = await db.increment('CAPS', day(), 'browserStarts');
  if (starts > Number(process.env.MAX_BROWSER_CALLS_PER_DAY || 500)) return json(429, { error: 'Daily demo call cap reached. Try again tomorrow.' });
  const id = `v-${randomUUID().slice(0, 6)}`;
  const jitter = () => (Math.random() - 0.5) * 0.008;
  const resident = {
    PK: RESIDENTS_PK, SK: id, id, name, age: null, lang: 'en', kind: 'visitor', consent: true, lat: +(SEED.center.lat + jitter()).toFixed(5), lon: +(SEED.center.lon + jitter()).toFixed(5),
    address: 'Visitor (browser call)', phone: 'browser', backupName: 'your emergency contact', backupRelation: 'contact', backupPhone: '', livesAlone: null, conditions: [], persona: null, last: null, createdAt: nowIso(),
  };
  await db.put(resident);
  let drill = await latestDrill();
  if (!drill) drill = await createDrill({ trigger: 'visitor', mode: 'none' }); // never leaves the map empty
  const call = await startCall({ drillId: drill.id, resident, attempt: 1, carrier: 'browser' });
  const say = `${greeting(name)} ${QUESTIONS[0].text}`;
  const session = { PK: `SESSION#${id}`, SK: 'META', id, residentId: id, drillId: drill.id, callSK: call.SK, q: 1, retries: 0, createdAt: nowIso() };
  await db.put(session);
  return json(200, { sessionId: id, residentId: id, drillId: drill.id, q: 1, say, audio: await speak(say), lexLive: LEX_LIVE, questions: QUESTIONS.map((x) => x.text) });
}

async function browserTurn(body) {
  const session = await db.get(`SESSION#${body.sessionId}`, 'META');
  if (!session) return json(404, { error: 'Unknown session' });
  if (session.done) return json(409, { error: 'This call already ended' });
  const call = await db.get(drillPK(session.drillId), session.callSK);
  const resident = await getResident(session.residentId);
  if (!call || !resident) return json(404, { error: 'Call not found' });
  const q = session.q;
  const nlu = body.audio ? await recognizeAudio(String(body.audio), session.id) : await recognizeText(String(body.text || ''), session.id);
  if (body.audio && !nlu.transcript && session.retries < 1) {
    await db.update(session.PK, session.SK, { retries: session.retries + 1 });
    const say = `Sorry, I did not catch that. ${QUESTIONS[q - 1].text}`;
    return json(200, { retry: true, q, say, audio: await speak(say) });
  }
  const turn = await recordTurn(call, q, nlu);
  if (q < 3) {
    await db.update(session.PK, session.SK, { q: q + 1, retries: 0 });
    const say = QUESTIONS[q].text;
    return json(200, { q: q + 1, turn, say, audio: await speak(say) });
  }
  const { decision, escalation } = await finishCall({ call, resident });
  await db.update(session.PK, session.SK, { done: true });
  const say = closing(decision.status, resident);
  return json(200, { done: true, turn, decision, escalation: escalation ? { type: escalation.type, label: escalation.label, message: escalation.message, to: escalation.to } : null, say, audio: await speak(say), residentId: resident.id, drillId: session.drillId });
}

async function phoneStart(body) {
  const { twilioConfigured, startPhoneCall } = await import('./lib/twilio.mjs');
  if (!twilioConfigured()) return json(409, { error: 'no-carrier', message: 'No phone carrier is configured on this deployment. Amazon Connect and Chime SDK PSTN are not available on this AWS account (AISPL billing), so the live demo uses the browser call. A Twilio number can be attached with three environment variables.' });
  const name = String(body.name || 'Visitor').trim().slice(0, 40) || 'Visitor';
  const phone = String(body.phone || '').replace(/[^\d+]/g, '');
  if (!/^\+(1|44|52)\d{7,12}$/.test(phone)) return json(400, { error: 'Enter a US, Canadian, UK or Mexican number in international format, like +14155551234.' });
  const perNumber = await db.increment('CAPS', `${day()}#${phone}`, 'calls');
  if (perNumber > 3) return json(429, { error: 'That number has been called three times today.' });
  const total = await db.increment('CAPS', day(), 'phoneCalls');
  if (total > Number(process.env.MAX_PHONE_CALLS_PER_DAY || 60)) return json(429, { error: 'Daily phone cap reached.' });
  const id = `p-${randomUUID().slice(0, 6)}`;
  const resident = { PK: RESIDENTS_PK, SK: id, id, name, age: null, lang: 'en', kind: 'visitor', consent: true, lat: SEED.center.lat + 0.002, lon: SEED.center.lon - 0.002, address: 'Visitor (phone call)', phone, backupName: 'your emergency contact', backupRelation: 'contact', backupPhone: '', conditions: [], persona: null, last: null, createdAt: nowIso() };
  await db.put(resident);
  let drill = await latestDrill();
  if (!drill) drill = await createDrill({ trigger: 'visitor', mode: 'none' });
  const call = await startCall({ drillId: drill.id, resident, attempt: 1, carrier: 'twilio' });
  await db.put({ PK: `SESSION#${id}`, SK: 'META', id, residentId: id, drillId: drill.id, callSK: call.SK, q: 1, retries: 0, createdAt: nowIso() });
  const r = await startPhoneCall({ to: phone, sessionId: id, apiBase: body.apiBase });
  return json(202, { sessionId: id, residentId: id, drillId: drill.id, callSid: r.sid });
}

export const handler = async (event) => {
  const { method, path, query } = route(event);
  try {
    if (method === 'OPTIONS') return { statusCode: 204, headers: {}, body: '' };
    if (path === '/health') return json(200, { ok: true, lex: LEX_LIVE ? 'live' : 'mock', version: VERSION, at: nowIso() });
    if (path === '/config') {
      const key = await mapKey();
      return json(200, { town: SEED.town, county: SEED.county, center: SEED.center, zone: process.env.NWS_ZONE || SEED.nwsZone, mapKey: key, mapStyle: key ? `https://maps.geo.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/v2/styles/Monochrome/descriptor?key=${encodeURIComponent(key)}&color-scheme=Dark` : null, lex: LEX_LIVE ? 'live' : 'mock', version: VERSION });
    }
    if (path === '/state' && method === 'GET') {
      const [residents, drill, escalations, alert] = await Promise.all([listResidents(), latestDrill(), db.query(ESC_PK, { forward: false, limit: 60 }), alertStatus()]);
      const summary = drill ? await summarizeDrill(drill.id) : null;
      return json(200, { residents, drill: summary ? { ...summary.drill, counts: summary.counts, metrics: summary.metrics, reached: summary.reached, reachRate: summary.reachRate, running: running(summary.drill) } : null, calls: summary?.calls || [], escalations, alert, at: nowIso() });
    }
    if (path === '/drills' && method === 'POST') {
      const body = parseBody(event);
      const current = await latestDrill();
      if (running(current)) return json(409, { error: 'A drill is already running', drillId: current.id });
      const drill = await createDrill({ trigger: body.trigger || 'manual', mode: body.mode || 'simulate' });
      return json(202, { drillId: drill.id });
    }
    if (path === '/drills' && method === 'GET') return json(200, { drills: await db.query(DRILLS_PK, { forward: false, limit: 20 }) });
    let m;
    if ((m = path.match(/^\/drills\/([^/]+)$/))) { const s = await summarizeDrill(m[1]); return s ? json(200, { ...s, drill: { ...s.drill, running: running(s.drill) } }) : json(404, { error: 'Drill not found' }); }
    if ((m = path.match(/^\/drills\/([^/]+)\/calls\/([^/]+)$/))) return json(200, { calls: await db.query(drillPK(m[1]), { beginsWith: `CALL#${m[2]}#` }) });
    if ((m = path.match(/^\/report\/([^/]+)$/))) {
      const s = await summarizeDrill(m[1]);
      if (!s) return json(404, { error: 'Drill not found' });
      const evalItem = await db.get('EVAL', 'latest');
      return json(200, { ...s, evaluation: evalItem || null, town: SEED.town, zone: process.env.NWS_ZONE || SEED.nwsZone });
    }
    if ((m = path.match(/^\/residents\/([^/]+)$/))) {
      const r = await getResident(m[1]);
      if (!r) return json(404, { error: 'Resident not found' });
      const calls = r.last?.drillId ? await db.query(drillPK(r.last.drillId), { beginsWith: `CALL#${r.id}#` }) : [];
      return json(200, { resident: r, calls });
    }
    if (path === '/escalations/resolve' && method === 'POST') {
      const { sk } = parseBody(event);
      const item = await db.get(ESC_PK, sk);
      if (!item) return json(404, { error: 'Escalation not found' });
      const patch = { status: 'resolved', resolvedAt: nowIso() };
      await db.update(ESC_PK, sk, patch);
      await db.update(drillPK(item.drillId), `ESC#${sk}`, patch);
      return json(200, { ok: true });
    }
    if (path === '/eval' && method === 'GET') return json(200, { evaluation: await db.get('EVAL', 'latest'), cases: EVAL.cases.length });
    if (path === '/eval' && method === 'PUT') { const body = parseBody(event); await db.put({ PK: 'EVAL', SK: 'latest', ...body, at: nowIso() }); return json(200, { ok: true }); }
    if (path === '/alerts') return json(200, await alertStatus());
    if (path === '/reset' && method === 'POST') {
      const body = parseBody(event);
      const n = await reseed();
      let drill = null;
      if (body.drill !== false) drill = await createDrill({ trigger: 'reset', mode: 'simulate' });
      return json(200, { residents: n, drillId: drill?.id || null });
    }
    if (path === '/calls/browser/start' && method === 'POST') return browserStart(parseBody(event));
    if (path === '/calls/browser/turn' && method === 'POST') return browserTurn(parseBody(event));
    if (path === '/calls/phone' && method === 'POST') return phoneStart({ ...parseBody(event), apiBase: `https://${event.requestContext?.domainName || ''}` });
    return json(404, { error: `No route for ${method} ${path}` });
  } catch (e) {
    console.error(e);
    return json(500, { error: e?.message || 'Internal error' });
  }
};
