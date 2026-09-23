// Records the offline API into app/public/fixtures for ?demo=1 (same shapes as the live API).
process.env.MOCK_MODE = '1'; process.env.SIM_PACE = '0';
import { writeFileSync, mkdirSync } from 'node:fs';
const api = await import('../backend/src/api.mjs');
const call = async (method, path, body) => JSON.parse((await api.handler({ requestContext: { http: { method } }, rawPath: path, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } })).body);
await call('POST', '/reset', { drill: false });
const { drillId } = await call('POST', '/drills', {});
// two visitors so the ticker shows browser calls too
for (const [name, answers] of [['Judge', ["I'm fine, thank you", 'Yes, the AC is on', 'No, nothing']], ['Priya', ["I'm fine, just a bit light-headed", 'The fan is on', 'No']]]) {
  const s = await call('POST', '/calls/browser/start', { name });
  for (const a of answers) await call('POST', '/calls/browser/turn', { sessionId: s.sessionId, text: a });
}
const state = await call('GET', '/state');
const config = { ...(await call('GET', '/config')), mapStyle: null, mapKey: null };
const report = await call('GET', `/report/${drillId}`);
const dir = new URL('../app/public/fixtures/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}state.json`, JSON.stringify(state));
writeFileSync(`${dir}config.json`, JSON.stringify(config));
writeFileSync(`${dir}report.json`, JSON.stringify(report));
console.log('fixtures:', state.residents.length, 'residents', state.calls.length, 'calls', report.escalations.length, 'escalations');
