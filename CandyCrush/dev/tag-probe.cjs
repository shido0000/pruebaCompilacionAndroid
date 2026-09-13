const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.__tag = { move: 0, logs: [] };
    const s = window.__session;
    const origSS = s.specialSwap ? s.specialSwap.bind(s) : null;
    if (origSS) {
      s.specialSwap = async (a, b, A, B) => {
        window.__tag.logs.push({ t: 'specialSwap', A: A.special, B: B.special });
        await origSS(a, b, A, B);
      };
    }
    const origRC = s.resolveCascades.bind(s);
    s.resolveCascades = async () => {
      window.__tag.logs.push({ t: 'cascade' });
      await origRC();
    };
  });

  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const center = (r, c) => ({ x: box.x + c * cell + cell / 2, y: box.y + r * cell + cell / 2 });

  const big = [];
  for (let i = 0; i < 70; i++) {
    const r = Math.floor(Math.random() * 8), c = Math.floor(Math.random() * 8);
    const dr = Math.random() < 0.5 ? 0 : 1;
    const dc = dr === 0 ? 1 : 0;
    if (r + dr >= 8 || c + dc >= 8) continue;
    const before = await page.evaluate(() => ({ score: window.__session.score, over: window.__session.over }));
    const a = center(r, c), b = center(r + dr, c + dc);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1150);
    const res = await page.evaluate(() => ({ score: window.__session.score, over: window.__session.over, tag: window.__tag.logs.splice(0) }));
    if (res.score - before.score >= 300) big.push({ i, delta: res.score - before.score, tag: res.tag });
    if (res.over) break;
  }
  console.log('moves with delta>=300 and their tags:');
  big.forEach(m => console.log(' move', m.i, 'delta', m.delta, JSON.stringify(m.tag)));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })