const { chromium } = require('playwright-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.addInitScript(() => {
    const pending = new Map();
    const orig = window.requestAnimationFrame.bind(window);
    const origC = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      let id = 0;
      id = orig((t) => { pending.delete(id); cb(t); });
      pending.set(id, true);
      return id;
    };
    window.cancelAnimationFrame = (n) => {
      if (pending.has(n)) pending.delete(n);
      origC(n);
    };
    window.__alive = () => pending.size;
  });
  await page.goto(URL);
  await page.waitForTimeout(400);

  const bench = () => page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 300000; i++) x += i;
    return { ms: performance.now() - t, alive: window.__alive() };
  });

  const base = await bench();
  console.log('baseline home:', JSON.stringify(base));

  const N = 20;
  for (let i = 0; i < N; i++) {
    await page.click('[data-nav="levels"]');
    await page.waitForTimeout(150);
    await page.click('[data-go="1"]');
    await page.waitForTimeout(600);
    await page.click('#pauseBtn');
    await page.waitForTimeout(150);
    await page.click('[data-action="menu"]');
    await page.waitForTimeout(250);
  }

  const after = await bench();
  console.log('after', N, 'game/menu cycles:', JSON.stringify(after));
  const ok = after.alive <= 2 && after.ms < base.ms + 40;
  console.log(ok ? 'LEAK OK' : 'LEAK FAIL (alive grew or slowdown detected)');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });