const { chromium } = require('playwright-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForSelector('[data-nav="levels"]', { timeout: 8000 });

  // ensure at least one hammer
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('candycrush_save_v1') || '{"v":1}');
    s.boosters = s.boosters || {};
    s.boosters.hammer = 1;
    localStorage.setItem('candycrush_save_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForSelector('[data-nav="levels"]', { timeout: 8000 });

  await page.click('[data-nav="levels"]');
  await page.waitForSelector('[data-go="1"]', { timeout: 8000 });
  await page.click('[data-go="1"]');
  await page.waitForSelector('#bo-hammer', { timeout: 8000 });
  await page.waitForTimeout(900);

  const before = await page.evaluate(() => {
    const g = window.__session.grid;
    return {
      hammer: Number(document.querySelector('#bc-hammer').textContent),
      nonEmpty: g.flat().filter(Boolean).length,
    };
  });

  await page.click('#bo-hammer');
  await page.waitForTimeout(200);
  const cursorActive = await page.evaluate(() => document.querySelector('#board').style.cursor);

  const box = await page.locator('#board').boundingBox();
  const cell = 8;
  const cx = box.x + (3.5 * box.width) / cell;
  const cy = box.y + (3.5 * box.height) / cell;
  const tapped = await page.evaluate(() => {
    const g = window.__session.grid;
    const t = g[3][3];
    return { id: t.id, special: t.special };
  });
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(2600);

  const after = await page.evaluate(() => {
    const g = window.__session.grid;
    return {
      hammer: Number(document.querySelector('#bc-hammer').textContent),
      nonEmpty: g.flat().filter(Boolean).length,
      tapCalls: window.__session.debug.onTapCalls,
      score: window.__session.score,
      busy: window.__session.busy,
    };
  });

  const dragSwaps = await page.evaluate(() => window.__session.debug.swaps);
  const box2 = await page.locator('#board').boundingBox();
  const c1x = box2.x + (3.5 * box2.width) / 8;
  const c1y = box2.y + (3.5 * box2.height) / 8;
  const c2x = box2.x + (4.5 * box2.width) / 8;
  const c2y = box2.y + (4.5 * box2.height) / 8;
  await page.mouse.move(c1x, c1y);
  await page.mouse.down();
  await page.mouse.move(c2x, c2y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const afterSwap = await page.evaluate(() => ({
    swaps: window.__session.debug.swaps,
    busy: window.__session.busy,
    onBoardTapCalls: window.__session.debug.onBoardTapCalls,
  }));
  console.log('post-hammer drag swap:', JSON.stringify(afterSwap), '| swapsBefore:', dragSwaps);

  await page.reload();
  await page.waitForLoadState('load');
  const persisted = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('candycrush_save_v1') || '{}');
    return s.boosters && s.boosters.hammer;
  });

  console.log('before:', JSON.stringify(before));
  console.log('tapped cell:', JSON.stringify(tapped), '| cursor:', cursorActive);
  console.log('after:', JSON.stringify(after));
  console.log('persisted hammer after reload:', persisted);

  const checks = {
    tapReachedSession: after.tapCalls === 1,
    hammerDecremented: after.hammer === before.hammer - 1,
    persistedDecremented: persisted === before.hammer - 1,
    boardRefilled: after.nonEmpty === 64,
    notBusyAfterHammer: after.busy === false,
    canPlayAgain: afterSwap.swaps === dragSwaps + 1,
  };
  console.log(JSON.stringify(checks));
  const ok = Object.values(checks).every(Boolean) && errors.length === 0;
  console.log(errors.length ? 'PAGEERRORS: ' + JSON.stringify(errors) : 'no page errors');
  console.log(ok ? 'HAMMER OK' : 'HAMMER FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });