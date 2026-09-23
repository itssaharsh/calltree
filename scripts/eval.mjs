// Runs the 60 labelled calls through the LIVE Lex bot and the decision rules, prints the confusion
// matrix, enforces the safety gate, and (with --publish) stores the result for the report page.
//   AWS_PROFILE=firstcommit LEX_BOT_ID=... LEX_BOT_ALIAS_ID=... node scripts/eval.mjs --publish https://api-url
import { readFileSync } from 'node:fs';
const evalSet = JSON.parse(readFileSync(new URL('../seed/eval.json', import.meta.url)));
const { decide } = await import('../backend/src/lib/decide.mjs');
const { recognizeText, LEX_LIVE } = await import('../backend/src/lib/lex.mjs');
const publishTo = process.argv.includes('--publish') ? process.argv[process.argv.indexOf('--publish') + 1] : null;

const matrix = {}, byRule = {}; let correct = 0, unsafe = 0; const rows = [];
for (const c of evalSet.cases) {
  const turns = [];
  for (let i = 0; i < c.a.length; i++) turns.push({ q: i + 1, ...(await recognizeText(c.a[i], `eval-${c.id}`)) });
  const d = decide(turns);
  matrix[c.label] ||= {}; matrix[c.label][d.status] = (matrix[c.label][d.status] || 0) + 1;
  byRule[d.rule] = (byRule[d.rule] || 0) + 1;
  if (d.status === c.label) correct++;
  const bad = ['URGENT', 'UNSURE'].includes(c.label) && d.status === 'OK';
  if (bad) unsafe++;
  rows.push({ id: c.id, label: c.label, got: d.status, rule: d.rule, intents: turns.map((t) => `${t.intent}:${(+t.confidence).toFixed(2)}`), quote: d.evidenceQuote });
  console.log(`${d.status === c.label ? ' ' : '!'} ${c.id} ${c.label.padEnd(6)} -> ${d.status.padEnd(6)} ${d.rule.padEnd(18)} ${turns.map((t) => `${t.intent}:${(+t.confidence).toFixed(2)}`).join(' | ')}`);
}
const result = { total: evalSet.cases.length, correct, unsafe, matrix, byRule, nlu: LEX_LIVE ? 'lex' : 'mock', rows };
console.log('\nNLU:', result.nlu, '\nconfusion:', JSON.stringify(matrix), `\naccuracy ${correct}/${result.total}, unsafe (URGENT/UNSURE labelled OK): ${unsafe}`);
if (publishTo) {
  const r = await fetch(`${publishTo.replace(/\/$/, '')}/eval`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) });
  console.log('published:', r.status);
}
process.exit(unsafe ? 1 : 0);
