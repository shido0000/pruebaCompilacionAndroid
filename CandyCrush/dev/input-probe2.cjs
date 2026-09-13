const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', m => console.log('BROWSER:', m.type(), m.text()));
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(200);
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    window.__probe = [];
    document.addEventListener('pointerdown', e => window.__probe.push('doc:pointerdown@' + JSON.stringify({ t: e.target?.id, tag: e.target?.tagName })), true);
    document.addEventListener('pointermove', e => window.__probe.push('doc:pointermove@' + JSON.stringify({ t: e.target?.id })), true);
  });
  const info = await page.evaluate(() => ({
    canvases: [...document.querySelectorAll('canvas')].map(c => ({ id: c.id, w: c.width, h: c.height })),
    boardPresent: !!document.querySelector('#board'),
    session: !!(window.__session),
  }));
  console.log('info:', JSON.stringify(info));

  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const ax = box.x + cell * 2 + cell / 2, ay = box.y + 2 * cell + cell / 2;
  const bx = ax + cell, by = ay;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  await page.mouse.move(bx, by, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const probe = await page.evaluate(() => window.__probe);
  console.log('probe events:', JSON.stringify(probe));
  const after = await page.evaluate(() => ({ ...(window.__session?.debug ?? {}) }));
  console.log('session debug after mouse:', JSON.stringify(after));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })