// Renders the favicon PNGs and the OG image from HTML with the real fonts. node scripts/brand.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const R = '/home/saharsh/contri/awwws';
const seed = JSON.parse(readFileSync(`${R}/seed/residents.json`, 'utf8'));
const color = { fine: '#4CC38A', needs: '#FFD24A', urgent: '#FF7A7A', unclear: '#F3E6CF', noanswer: '#6B7280' };
const lats = seed.residents.map((r) => r.lat), lons = seed.residents.map((r) => r.lon);
const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
const pins = seed.residents.map((r) => `<div style="position:absolute;left:${640 + ((r.lon - c) / (d - c)) * 500}px;top:${560 - ((r.lat - a) / (b - a)) * 440}px;width:14px;height:14px;border-radius:50%;background:${color[r.persona.kind]};border:3px solid #0E1220"></div>`).join('');
const mark = readFileSync(`${R}/brand/logo.svg`, 'utf8');
const og = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@800&family=Funnel+Sans:wght@400;600&family=Martian+Mono:wght@400;600&display=block"><style>
body{margin:0;width:1200px;height:630px;background:#0E1220;color:#F3E6CF;font-family:'Funnel Sans',sans-serif;position:relative;overflow:hidden}
.lamp{position:absolute;inset:0;background:radial-gradient(60% 55% at 70% 40%,rgba(255,164,27,.22),transparent 70%)}
h1{font-family:'Funnel Display';font-weight:800;font-size:60px;letter-spacing:-.04em;line-height:.98;margin:18px 0 0;max-width:500px}
.k{font-family:'Martian Mono';font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#FFA41B}
.s{font-size:20px;color:#A69E8F;max-width:480px;margin-top:20px;line-height:1.4}
.u{position:absolute;left:72px;bottom:56px;font-family:'Martian Mono';font-size:16px;color:#A69E8F}
</style></head><body><div class="lamp"></div>
<div style="position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px"><div style="width:44px;height:44px">${mark}</div><span style="font-family:'Funnel Display';font-weight:800;font-size:34px;letter-spacing:-.03em">calltree</span></div>
<div style="position:absolute;left:72px;top:150px"><div class="k">Heat-alert check-in calls for a town's register</div><h1>Every name on the list, reached within the hour.</h1><div class="s">Lex understands, code decides, a person is sent only where one is needed.</div></div>
<div style="position:absolute;left:640px;top:80px;width:520px;height:520px;border-radius:24px;background:#151A2B;border:1px solid #2B3249;overflow:hidden"><div style="position:absolute;inset:0">${pins.replace(/left:(\d+\.?\d*)px/g, (m, x) => `left:${(+x - 640).toFixed(1)}px`).replace(/top:(\d+\.?\d*)px/g, (m, y) => `top:${(+y - 80).toFixed(1)}px`)}</div></div>
<div class="u">main.dk4896o2qx1ht.amplifyapp.com · AWS Zero to Shipped 2026</div></body></html>`;
const apple = `<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#0E1220;display:flex;align-items:center;justify-content:center"><div style="width:132px;height:132px">${mark}</div></body></html>`;
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(og, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
mkdirSync(`${R}/app/public`, { recursive: true });
await p.screenshot({ path: `${R}/app/public/og.png` });
const p2 = await browser.newPage({ viewport: { width: 180, height: 180 } });
await p2.setContent(apple); await p2.screenshot({ path: `${R}/app/app/apple-icon.png` });
const p3 = await browser.newPage({ viewport: { width: 512, height: 512 } });
await p3.setContent(apple.replace('width:180px;height:180px', 'width:512px;height:512px').replace('width:132px;height:132px', 'width:380px;height:380px')); await p3.screenshot({ path: `${R}/app/public/icon-512.png` });
await browser.close(); console.log('brand assets written');
