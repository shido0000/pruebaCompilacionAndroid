const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(800);

  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const center = (r, c) => ({ x: box.x + c * cell + cell / 2, y: box.y + r * cell + cell / 2 });

  const d = [];
  let over = false;
  for (let i = 0; i < 70 && !over; i++) {
    const r = Math.floor(Math.random() * 8), c = Math.floor(Math.random() * 8);
    const dr = Math.random() < 0.5 ? 0 : 1;
    const dc = dr === 0 ? 1 : 0;
    if (r + dr >= 8 || c + dc >= 8) continue;
    const before = await page.evaluate(() => ({ score: window.__session.score, moves: window.__session.movesLeft, over: window.__session.over }));
    const a = center(r, c), b = center(r + dr, c + dc);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(950);
    const after = await page.evaluate(() => ({ score: window.__session.score, over: window.__session.over }));
    over = after.over;
    if (after.score > before.score) {
      d.push({ i, delta: after.score - before.score, cells: Math.round((after.score - before.score) / 20) });
    } else if (Math.round(after.score) === Math.round(before.score)) {
      // invalid swap
    }
  }

  console.log('moves with effect:', d.length);
  d.sort((x, y) => y.delta - x.delta);
  console.log('top 8 by cells (score/20):', JSON.stringify(d.slice(0, 8)));
  const cells = d.map(x => x.cells);
  const avg = cells.reduce((s2, x) => s2 + x, 0) / cells.length;
  console.log('avg cells/move:', avg.toFixed(1), '| max:', Math.max(...cells), '| min:', Math.min(...cells));
  console.log('moves over 20 cells (~full row+):', d.filter(x => x.cells > 20).length, 'of', d.length);
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })