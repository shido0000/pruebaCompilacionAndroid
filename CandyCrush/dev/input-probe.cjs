const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()) });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(200);
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => ({ ...(window.__session?.debug ?? {}) }));
  console.log('before:', JSON.stringify(before));
  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const ax = box.x + cell * 2 + cell / 2, ay = box.y + 2 * cell + cell / 2;
  const bx = ax + cell, by = ay;
  const res = await page.evaluate(({ ax, ay, bx, by }) => {
    const c = document.querySelector('#board');
    const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }));
    try {
      fire('pointerdown', ax, ay);
      for (let i = 1; i <= 6; i++) fire('pointermove', ax + (bx - ax) * i / 6, ay + (by - ay) * i / 6);
      fire('pointerup', bx, by);
    } catch (e) { return 'ERR: ' + e.message; }
    return 'ok';
  }, { ax, ay, bx, by });
  console.log('dispatch result:', res);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ ...(window.__session?.debug ?? {}) }));
  console.log('after:', JSON.stringify(after));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })