// node qa/qa.mjs http://localhost:4173  -> qa/*.png at 390 / 1024 / 1440 for every route and forced state
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173';
const shots = [
  ['/', ''], ['/ops/', 'demo=1'], ['/ops/', 'demo=1&state=loading'], ['/ops/', 'demo=1&state=error'], ['/ops/', 'demo=1&state=empty'],
  ['/answer/', 'demo=1'], ['/answer/', 'demo=1&state=done'], ['/report/', 'demo=1&drill=x'], ['/report/', 'demo=1&state=not-found'], ['/kit/', ''], ['/nope/', ''],
];
const widths = [390, 1024, 1440];
mkdirSync(new URL('../../qa/', import.meta.url).pathname, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] }); const errors = [];
for (const [route, qs] of shots) for (const w of widths) {
  const p = await b.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${route}?${qs}@${w}: ${m.text().slice(0, 160)}`); });
  p.on('pageerror', (e) => errors.push(`${route}?${qs}@${w}: PAGEERROR ${String(e).slice(0, 160)}`));
  await p.goto(`${base}${route}${qs ? '?' + qs : ''}`, { waitUntil: 'load', timeout: 60000 }).catch((e) => errors.push(`${route}: ${e.message}`));
  await p.waitForTimeout(route === '/ops/' || route === '/' ? 7000 : 1500);
  const hasHScroll = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (hasHScroll) errors.push(`${route}?${qs}@${w}: horizontal scroll`);
  const name = `${route.replace(/\W/g, '_') || 'root'}-${(qs || 'default').replace(/\W/g, '_')}-${w}.png`;
  await p.screenshot({ path: new URL(`../../qa/${name}`, import.meta.url).pathname, fullPage: w !== 1440 || route !== '/ops/', animations: 'disabled', timeout: 90000 }).catch((e) => errors.push(`${route}@${w}: screenshot ${e.message.slice(0, 60)}`));
  await p.close();
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'QA: no console errors, no horizontal scroll');
