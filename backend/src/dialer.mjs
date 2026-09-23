// Step Functions task worker: init the campaign, make one call, finalize the drill.
import * as db from './lib/db.mjs';
import { DRILLS_PK, RESIDENTS_PK, listResidents, getResident, simulateCall, summarizeDrill } from './lib/calls.mjs';

const nowIso = () => new Date().toISOString();
let sfn;
async function taskSuccess(token, output) {
  if (!token) return;
  const { SFNClient, SendTaskSuccessCommand } = await import('@aws-sdk/client-sfn');
  sfn ||= new SFNClient({});
  try { await sfn.send(new SendTaskSuccessCommand({ taskToken: token, output: JSON.stringify(output) })); } catch (e) { console.error('SendTaskSuccess failed', e?.message); }
}

export async function init({ drillId }) {
  const residents = (await listResidents()).filter((r) => r.kind === 'seed' && r.consent !== false);
  await db.update(DRILLS_PK, drillId, { total: residents.length });
  return { residentIds: residents.map((r) => r.id), retryDelaySeconds: Number(process.env.RETRY_DELAY_SECONDS || 20) };
}

export async function call({ drillId, residentId, attempt = 1, mode = 'simulate', taskToken }) {
  const resident = await getResident(residentId);
  if (!resident) { await taskSuccess(taskToken, { outcome: 'SKIPPED', residentId, attempt }); return { outcome: 'SKIPPED' }; }
  if (mode === 'twilio' && resident.phone && resident.phone.startsWith('+')) {
    const { twilioConfigured, startPhoneCall } = await import('./lib/twilio.mjs');
    if (twilioConfigured()) {
      const { startCall } = await import('./lib/calls.mjs');
      const c = await startCall({ drillId, resident, attempt, carrier: 'twilio' });
      await db.put({ PK: `SESSION#${c.callId}`, SK: 'META', id: c.callId, residentId, drillId, callSK: c.SK, q: 1, retries: 0, taskToken, createdAt: nowIso() });
      await startPhoneCall({ to: resident.phone, sessionId: c.callId, apiBase: process.env.PUBLIC_API_URL });
      return { pending: true };
    }
  }
  const r = await simulateCall({ drillId, resident, attempt, pace: process.env.SIM_PACE !== '0' });
  const output = { outcome: r.decision.status, residentId, attempt };
  await taskSuccess(taskToken, output);
  return output;
}

export async function finalize({ drillId }) {
  const completedAt = nowIso();
  await db.update(DRILLS_PK, drillId, { completedAt, status: 'complete' });
  const s = await summarizeDrill(drillId);
  await db.update(DRILLS_PK, drillId, { counts: s.counts, metrics: s.metrics, reached: s.reached, reachRate: s.reachRate });
  return { counts: s.counts, metrics: s.metrics };
}

/** The same campaign the state machine runs, executed inline. Used by MOCK verify and when no state machine is configured. */
export async function runDrillInline({ drillId, mode = 'simulate', concurrency = 8 }) {
  const { residentIds, retryDelaySeconds } = await init({ drillId });
  const queue = [...residentIds];
  const worker = async () => {
    while (queue.length) {
      const residentId = queue.shift();
      const first = await call({ drillId, residentId, attempt: 1, mode });
      if (first.outcome === 'NO_ANSWER') {
        await new Promise((r) => setTimeout(r, process.env.SIM_PACE === '0' ? 0 : Math.min(retryDelaySeconds, 2) * 1000));
        await call({ drillId, residentId, attempt: 2, mode });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return finalize({ drillId });
}

export const handler = async (event) => {
  const action = event.action;
  if (action === 'init') return init(event);
  if (action === 'call') return call(event);
  if (action === 'finalize') return finalize(event);
  if (action === 'runInline') return runDrillInline(event);
  throw new Error(`Unknown action ${action}`);
};
