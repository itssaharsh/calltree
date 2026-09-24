// OG image = the real product: the landing hero at 1200x630, captured from a running build.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
await p.goto(`${base}/?demo=1`, { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(9000);
await p.evaluate(() => { document.querySelector('header')?.remove(); window.scrollTo(0, 0); });
await p.waitForTimeout(500);
await p.screenshot({ path: '/home/saharsh/contri/awwws/app/public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 }, animations: 'disabled', timeout: 60000 });
await b.close(); console.log('og.png written');
