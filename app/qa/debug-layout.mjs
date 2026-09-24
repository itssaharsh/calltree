import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  const region = document.querySelector('[aria-label^="Map of registered"]');
  const chain = []; let n = region;
  while (n && n !== document.body) { const cs = getComputedStyle(n); chain.push({ tag: n.tagName, cls: (n.className || '').toString().slice(0, 90), h: n.clientHeight, w: n.clientWidth, display: cs.display, flexDir: cs.flexDirection, height: cs.height, minH: cs.minHeight, pos: cs.position }); n = n.parentElement; }
  return chain;
});
console.log(JSON.stringify(info, null, 1)); await b.close();
