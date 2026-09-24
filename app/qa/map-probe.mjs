import { chromium } from 'playwright';
const url = process.argv[2]; const w = +(process.argv[3] || 1440);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
const errs = []; p.on('console', (m) => { if (['error'].includes(m.type())) errs.push(m.text().slice(0, 140)); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 140)));
const t0 = Date.now();
await p.goto(url, { waitUntil: 'load', timeout: 60000 });
const info = await p.evaluate(async () => {
  const start = performance.now();
  await new Promise((r) => setTimeout(r, 15000));
  const c = document.querySelector('.maplibregl-canvas');
  // count painted pixels: sample the canvas via a 2D copy
  let painted = null;
  try { const cv = document.createElement('canvas'); cv.width = 120; cv.height = 70; const ctx = cv.getContext('2d'); ctx.drawImage(c, 0, 0, 120, 70); const d = ctx.getImageData(0, 0, 120, 70).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0 && !(d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0)) n++; } painted = n / (120 * 70); } catch (e) { painted = 'err ' + e.message; }
  return { canvas: c ? [c.width, c.height] : null, painted, elapsed: Math.round(performance.now() - start) };
});
console.log('INFO', JSON.stringify(info), 'wall', Date.now() - t0, 'ms', errs.length ? '\nERRS ' + errs.join(' | ') : '');
const t1 = Date.now();
await p.screenshot({ path: `/home/saharsh/contri/awwws/qa/map-probe-${w}.png`, timeout: 120000, animations: 'disabled' }).then(() => console.log('screenshot in', Date.now() - t1, 'ms')).catch((e) => console.log('screenshot failed', e.message.slice(0, 80)));
await b.close();
