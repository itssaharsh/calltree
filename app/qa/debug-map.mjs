import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => console.log('[console.' + m.type() + ']', m.text().slice(0, 200)));
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
p.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(9000);
const info = await p.evaluate(() => {
  const c = document.querySelector('.maplibregl-canvas');
  const region = document.querySelector('[aria-label^="Map of registered"]');
  const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
  return { canvas: c ? { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight } : null, region: region ? { w: region.clientWidth, h: region.clientHeight, children: region.children.length } : null, webgl: !!gl, ctrl: !!document.querySelector('.maplibregl-ctrl-bottom-right') };
});
console.log('INFO', JSON.stringify(info));
await p.screenshot({ path: '/home/saharsh/contri/awwws/qa/debug-map.png' });
await b.close();
