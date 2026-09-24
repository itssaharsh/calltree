// README GIFs, scripted: the drill on the 3D map, and the browser call typed. node qa/gifs.mjs
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';
const base = 'https://main.dk4896o2qx1ht.amplifyapp.com'; const api = 'https://tdj1t6l3hj.execute-api.us-east-1.amazonaws.com';
const out = '/home/saharsh/contri/awwws/docs/media'; const tmp = '/tmp/claude-1000/-home-saharsh-contri-awwws/ed0002ff-6c0b-48c0-a70c-7ce7de31657a/scratchpad/gifvid';
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const st = await (await fetch(`${api}/state`)).json();
if (!st.drill?.running) { const r = await fetch(`${api}/drills`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"trigger":"manual"}' }); console.log('declared drill', r.status); }
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
async function rec(name, fn, seconds) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage(); await fn(p); await p.waitForTimeout(seconds * 1000);
  const v = p.video(); await ctx.close(); const path = await v.path();
  execSync(`ffmpeg -y -v error -i "${path}" -vf "fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4" "${out}/${name}.gif"`);
  console.log('gif', name);
}
await rec('drill', async (p) => { await p.goto(`${base}/ops/`, { waitUntil: 'load' }); }, 28);
await rec('call', async (p) => {
  await p.goto(`${base}/answer/`, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.fill('input#name', 'Judge'); await p.click('button:has-text("Answer the call")');
  await p.waitForSelector('button:has-text("Type instead")', { timeout: 60000 }); await p.click('button:has-text("Type instead")');
  for (const a of ["I'm fine, just a bit dizzy", "Yes, the AC is on and I have water", "No, nothing, thank you"]) {
    await p.waitForSelector('input[aria-label="Your answer"]', { timeout: 60000 }); await p.fill('input[aria-label="Your answer"]', a); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  }
  await p.waitForSelector('text=See your pin', { timeout: 90000 });
}, 4);
await b.close();
