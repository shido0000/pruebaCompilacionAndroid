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
    window.__cls = [];
    const mod = null;
    // patch the engine functions through the bundled module is not exposed, so patch session.resolveCascades
    const s = window.__session;
    const orig = s.resolveCascades.bind(s);
    s.resolveCascades = async () => {
      window.__inCascade = '';
      await orig();
      window.__cascades = (window.__cascades || 0) + 1;
    };
  });

  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const center = (r, c) => ({ x: box.x + c * cell + cell / 2, y: box.y + r * cell + cell / 2 });

  // Instead of patching internals, track score + moves to detect anomalies, and use a long wait
  const results = [];
  let cmp = 0;
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(Math.random() * 8), c = Math.floor(Math.random() * 8);
    const dr = Math.random() < 0.5 ? 0 : 1;
    const dc = dr === 0 ? 1 : 0;
    if (r + dr >= 8 || c + dc >= 8) continue;
    const before = await page.evaluate(() => ({ score: window.__session.score, moves: window.__session.movesLeft, bus0: window.__session.debug.swaps }));
    const a = center(r, c), b = center(r + dr, c + dc);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(950);
    const after = await page.evaluate(() => ({ score: window.__session.score, moves: window.__session.movesLeft, valid: window.__session.debug.validSwaps, over: window.__session.over }));
    if (after.valid > before.swaps || after.moves !== before.moves || after.over) {
      const delta = after.score - before.score;
      const perMs = delta / 20; // cells*20 each + bonus
      results.push({ i, deltaScore: delta, estCells: perMs, over: after.over });
      if (delta > 0) cmp++;
    }
    if (after.over) { console.log('level ended at move', i); break; }
  }

  console.log('moves with scoring effect:', cmp);
  const big = results.filter(r2 => r2.deltaScore >= 600);
  console.log('BIG single-move score jumps (>=600pt = ~30 cells):', JSON.stringify(big));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })