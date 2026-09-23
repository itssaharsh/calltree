// Deterministic proof, no cloud needed: MOCK_MODE=1 SIM_PACE=0 node scripts/verify.mjs
// Runs the seeded drill through the same code the deployed stack runs and asserts on the before/after.
process.env.MOCK_MODE = process.env.MOCK_MODE || '1';
process.env.SIM_PACE = process.env.SIM_PACE || '0';
const api = await import('../backend/src/api.mjs');
const { decide } = await import('../backend/src/lib/decide.mjs');
const { mockRecognize } = await import('../backend/src/lib/lex.mjs');
const evalSet = (await import('../seed/eval.json', { with: { type: 'json' } })).default;

const call = async (method, path, body) => {
  const r = await api.handler({ requestContext: { http: { method } }, rawPath: path, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } });
  return { status: r.statusCode, data: JSON.parse(r.body) };
};
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };

// 1. Before: fresh register, nobody reached.
const reset = await call('POST', '/reset', { drill: false });
check('reset seeds 100 residents', reset.data.residents === 100, `got ${reset.data.residents}`);
let state = (await call('GET', '/state')).data;
check('before: no drill, every pin pending', state.drill === null && state.residents.every((r) => !r.last), '');

// 2. One action: declare a drill (inline in mock mode).
const started = await call('POST', '/drills', {});
check('drill accepted', started.status === 202, JSON.stringify(started.data));
state = (await call('GET', '/state')).data;
const c = state.drill.counts;
check('after: every resident has an outcome', c.total === 100 && c.IN_PROGRESS === 0, JSON.stringify(c));
check('after: URGENT residents escalated to a neighbour', state.escalations.filter((e) => e.type === 'neighbour').length === c.URGENT, `${c.URGENT} urgent`);
check('after: no-answer twice queued a visit', state.escalations.filter((e) => e.type === 'visit').length === c.NO_ANSWER && c.NO_ANSWER === 3, `${c.NO_ANSWER} no answer`);
check('after: drill complete with metrics', !!state.drill.completedAt && state.drill.metrics.minutesTotal !== null, JSON.stringify(state.drill.metrics));
const lightHeaded = state.calls.find((k) => /light-headed/i.test(k.turns?.[0]?.transcript || ''));
check('"fine, just a bit light-headed" is URGENT with the quote', lightHeaded?.outcome === 'URGENT' && /light-headed/.test(lightHeaded.decision.evidenceQuote), lightHeaded?.decision?.rule);

// 3. Browser call, unhappy path on purpose.
const s = (await call('POST', '/calls/browser/start', { name: 'Judge' })).data;
check('browser call starts with the greeting and question 1', s.q === 1 && /Hello Judge/.test(s.say), '');
await call('POST', '/calls/browser/turn', { sessionId: s.sessionId, text: "I'm fine, just a bit dizzy" });
await call('POST', '/calls/browser/turn', { sessionId: s.sessionId, text: 'Yes the AC is on' });
const done = (await call('POST', '/calls/browser/turn', { sessionId: s.sessionId, text: 'No, nothing' })).data;
check('browser call: dizzy visitor is URGENT and a neighbour is alerted', done.done && done.decision.status === 'URGENT' && done.escalation?.type === 'neighbour', JSON.stringify(done.decision));
const me = (await call('GET', `/residents/${s.residentId}`)).data;
check('visitor pin updated on the map', me.resident.last?.outcome === 'URGENT', '');

// 4. Classifier eval on the labelled set with the offline NLU twin.
const matrix = {}; let unsafe = 0;
for (const cse of evalSet.cases) {
  const turns = cse.a.map((t, i) => ({ q: i + 1, ...mockRecognize(t) }));
  const d = decide(turns);
  matrix[cse.label] ||= {}; matrix[cse.label][d.status] = (matrix[cse.label][d.status] || 0) + 1;
  if (['URGENT', 'UNSURE'].includes(cse.label) && d.status === 'OK') { unsafe++; console.log('   unsafe:', cse.id, cse.a.join(' | '), '->', d.rule); }
}
const correct = evalSet.cases.filter((cse) => decide(cse.a.map((t, i) => ({ q: i + 1, ...mockRecognize(t) }))).status === cse.label).length;
console.log('   confusion', JSON.stringify(matrix));
check(`eval: zero URGENT/UNSURE labelled OK (accuracy ${correct}/${evalSet.cases.length})`, unsafe === 0, '');

console.log(failures ? `\n${failures} check(s) FAILED` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
