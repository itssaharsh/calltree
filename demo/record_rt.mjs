// Real-time walkthrough recording with Playwright video. Logs scene marks and saves Calltree's Polly
// audio from the browser call so the edit can mix it in. node record_rt.mjs
import { chromium } from '/home/saharsh/contri/awwws/app/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync, rmSync, readdirSync, renameSync } from 'node:fs';
const base = 'https://main.dk4896o2qx1ht.amplifyapp.com'; const api = 'https://tdj1t6l3hj.execute-api.us-east-1.amazonaws.com';
const out = '/home/saharsh/contri/awwws/demo/rt'; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// wait for a running drill to finish so the declare button is enabled
for (let i = 0; i < 40; i++) { const st = await (await fetch(`${api}/state`)).json(); if (!st.drill?.running) break; await sleep(5000); }
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const t0 = Date.now(); const marks = []; const audio = [];
const mark = (id) => { marks.push({ id, t: (Date.now() - t0) / 1000 }); console.log(`mark ${id} @ ${((Date.now() - t0) / 1000).toFixed(1)}s`); };
p.on('response', async (r) => { try { if (r.url().includes('/calls/browser/')) { const j = await r.json(); if (j.audio) { const f = `${out}/polly-${audio.length}.mp3`; writeFileSync(f, Buffer.from(j.audio, 'base64')); audio.push({ file: f, t: (Date.now() - t0) / 1000, say: j.say }); } } } catch { /* ignore */ } });
const refresh = () => p.evaluate(() => window.__calltreeRefresh && window.__calltreeRefresh());

await p.goto(`${base}/ops/`, { waitUntil: 'load' }); await sleep(3500);
mark('ops');
await p.click('button:has-text("Declare heat drill")'); await sleep(24000);
mark('drawer');
let selected = null;
for (let i = 0; i < 30 && !selected; i++) {
  await refresh(); await sleep(1500);
  selected = await p.evaluate(() => { const row = [...document.querySelectorAll('button[data-resident]')].find((x) => x.textContent.includes('light-headed')); if (row && window.__calltreeSelect) { row.scrollIntoView({ block: 'center' }); window.__calltreeSelect(row.dataset.resident); return row.dataset.resident; } return null; });
}
await sleep(9000);
mark('queue');
await p.click('[aria-label="Close details"]'); await sleep(600); await p.click('[role=tab]:has-text("Queue")'); await sleep(8500);
mark('answer');
await p.goto(`${base}/answer/`, { waitUntil: 'load' }); await sleep(1500);
await p.fill('input#name', 'Judge'); await sleep(600); await p.click('button:has-text("Answer the call")');
await p.waitForSelector('button:has-text("Type instead")', { timeout: 60000 }); await p.click('button:has-text("Type instead")');
for (const a of ["I'm fine, just a bit dizzy", "Yes, the AC is on and I have water", "No, nothing, thank you"]) {
  await p.waitForSelector('input[aria-label="Your answer"]', { timeout: 60000 }); await sleep(800);
  await p.type('input[aria-label="Your answer"]', a, { delay: 45 }); await sleep(300); await p.keyboard.press('Enter'); await sleep(1500);
}
await p.waitForSelector('text=See your pin', { timeout: 90000 });
mark('decision'); await sleep(6000);
await p.click('a:has-text("See your pin on the map")'); await p.waitForSelector('text=Dispatch log', { timeout: 60000 }); await sleep(1500); await refresh(); await sleep(6500);
mark('report');
await p.goto(`${base}/report/`, { waitUntil: 'load' }); await p.waitForSelector('text=The numbers a city manager', { timeout: 60000 }); await sleep(4500);
await p.evaluate(() => document.querySelector('[aria-labelledby="eval"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); await sleep(5500);
mark('end');
const v = p.video(); await ctx.close(); const path = await v.path(); await b.close();
renameSync(path, `${out}/walkthrough.webm`);
writeFileSync(`${out}/marks.json`, JSON.stringify({ marks, audio, selected, total: (Date.now() - t0) / 1000 }, null, 1));
console.log('done', marks.map((m) => `${m.id}@${m.t.toFixed(1)}`).join(' '), '| polly clips', audio.length, '| selected', selected);
