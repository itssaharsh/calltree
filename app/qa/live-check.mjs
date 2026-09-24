import { chromium } from 'playwright';
const base = 'https://main.dk4896o2qx1ht.amplifyapp.com';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
for (const [route, w] of [['/ops/', 1440], ['/ops/', 390], ['/kit/', 1024], ['/answer/', 390], ['/report/', 1440], ['/', 1440]]) {
  const p = await b.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  await p.goto(base + route, { waitUntil: 'load' }); await p.waitForTimeout(4000);
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const pins = route === '/ops/' ? await p.evaluate(() => !!document.querySelector('.maplibregl-canvas') && document.querySelector('.maplibregl-canvas').height > 100) : null;
  console.log(route, w, errs.length ? errs.join(' | ') : 'no console errors', hs ? 'HSCROLL' : '', pins === null ? '' : `map canvas ok=${pins}`);
  if (route === '/ops/' && w === 1440) await p.screenshot({ path: '/home/saharsh/contri/awwws/qa/live-ops-1440.png' });
  await p.close();
}
await b.close();
