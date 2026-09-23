// Twilio webhooks. Same session, questions, Lex understanding and decision rules as the browser call.
import * as db from './lib/db.mjs';
import { parseBody, route } from './lib/http.mjs';
import { drillPK, getResident, recordTurn, finishCall } from './lib/calls.mjs';
import { recognizeText } from './lib/lex.mjs';
import { QUESTIONS, greeting, closing } from './lib/prompts.mjs';
import { twiml } from './lib/twilio.mjs';

const xml = (body) => ({ statusCode: 200, headers: { 'content-type': 'text/xml' }, body });
let sfn;
async function taskSuccess(token, output) {
  if (!token) return;
  const { SFNClient, SendTaskSuccessCommand } = await import('@aws-sdk/client-sfn');
  sfn ||= new SFNClient({});
  try { await sfn.send(new SendTaskSuccessCommand({ taskToken: token, output: JSON.stringify(output) })); } catch (e) { console.error(e?.message); }
}

export const handler = async (event) => {
  const { path, query } = route(event);
  const base = `https://${event.requestContext?.domainName}`;
  const sessionId = query.session;
  const session = sessionId ? await db.get(`SESSION#${sessionId}`, 'META') : null;
  if (!session) return xml(twiml({ say: 'Sorry, this call could not be matched to a check-in. Goodbye.', hangup: true }));
  const resident = await getResident(session.residentId);
  const call = await db.get(drillPK(session.drillId), session.callSK);
  const gather = (q) => `${base}/twilio/gather?session=${encodeURIComponent(sessionId)}&q=${q}`;

  if (path.endsWith('/voice')) {
    const body = parseBody(event);
    if (body.AnsweredBy && String(body.AnsweredBy).startsWith('machine')) {
      await finishCall({ call, resident, noAnswer: true });
      await taskSuccess(session.taskToken, { outcome: 'NO_ANSWER', residentId: resident.id, attempt: call.attempt });
      return xml(twiml({ say: `This is Calltree, the city's heat check-in. We will try again shortly.`, hangup: true }));
    }
    return xml(twiml({ say: `${greeting(resident.name)} ${QUESTIONS[0].text}`, gatherUrl: gather(1) }));
  }
  if (path.endsWith('/gather')) {
    const body = parseBody(event);
    const q = Number(query.q || session.q || 1);
    const text = String(body.SpeechResult || '');
    if (!text && (session.retries || 0) < 1) {
      await db.update(session.PK, session.SK, { retries: (session.retries || 0) + 1 });
      return xml(twiml({ say: `Sorry, I did not catch that. ${QUESTIONS[q - 1].text}`, gatherUrl: gather(q) }));
    }
    const nlu = await recognizeText(text, sessionId);
    await recordTurn(call, q, nlu);
    if (q < 3) { await db.update(session.PK, session.SK, { q: q + 1, retries: 0 }); return xml(twiml({ say: QUESTIONS[q].text, gatherUrl: gather(q + 1) })); }
    const { decision } = await finishCall({ call, resident });
    await db.update(session.PK, session.SK, { done: true });
    await taskSuccess(session.taskToken, { outcome: decision.status, residentId: resident.id, attempt: call.attempt });
    return xml(twiml({ say: closing(decision.status, resident), hangup: true }));
  }
  if (path.endsWith('/status')) {
    const body = parseBody(event);
    if (!session.done && ['no-answer', 'busy', 'failed', 'canceled', 'completed'].includes(body.CallStatus)) {
      if (call && call.outcome === 'IN_PROGRESS') {
        await finishCall({ call, resident, noAnswer: (call.turns || []).length === 0 });
        await db.update(session.PK, session.SK, { done: true });
        await taskSuccess(session.taskToken, { outcome: (call.turns || []).length === 0 ? 'NO_ANSWER' : 'UNSURE', residentId: resident.id, attempt: call.attempt });
      }
    }
    return { statusCode: 204, body: '' };
  }
  return xml(twiml({ say: 'Goodbye.', hangup: true }));
};
