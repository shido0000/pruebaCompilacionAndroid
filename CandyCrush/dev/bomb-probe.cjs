const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(800);

  const before = await page.evaluate(() => ({ score: window.__session.score, moves: window.__session.movesLeft }));
  // craft: bomb at (0,0), red (id 0) at (0,1), plus 3 other reds far away to test
  const crafts = await page.evaluate(async () => {
    const s = window.__session;
    const grid = s.grid;
    const set = (r, c, id) => { const cell = grid[r][c] || { id: 0, special: 'none' }; cell.id = id; cell.special = 'none'; grid[r][c] = cell; };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) set(r, c, (r + c) % 6 + 1);
    // bomb special at (0,0), red (0) at (0,1), extra reds at (3,3),(5,5)
    grid[0][0] = { id: -1, special: 'bomb' };
    set(0, 1, 0);
    set(3, 3, 0);
    set(5, 5, 0);
    s.renderer.sync(grid);
    s.renderer.start();
    s.score = 0;
    await s.doSwap({ r: 0, c: 0 }, { r: 0, c: 1 });
    const redsLeft = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const g = s.grid[r][c];
      if (g && g.id === 0 && g.special !== 'bomb') redsLeft.push(r + ':' + c);
    }
    const bombLeft = s.grid[0][0]?.special === 'bomb';
    return { score: s.score, redsLeft, bombLeft, over: s.over };
  });
  console.log('before:', JSON.stringify(before));
  console.log('after bomb+red swap:', JSON.stringify(crafts));
  console.log('expected: >0 score, redsLeft largely cleared (maybe cascades; none remaining if clean), bombLeft false');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })