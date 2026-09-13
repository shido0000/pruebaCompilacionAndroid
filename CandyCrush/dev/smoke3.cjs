const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:4173/');
  // pre-play config
  await page.click('[data-nav="settings"]');
  await page.waitForTimeout(150);
  await page.fill('#userName', 'Lili');
  await page.dispatchEvent('#userName', 'change');
  await page.waitForTimeout(100);
  await page.click('[data-nav="home"]');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(700);

  const saveBefore = await page.evaluate(() => localStorage.getItem('candycrush_save_v1'));
  console.log('save before win (excerpt):', saveBefore ? saveBefore.slice(0, 160) : 'none');

  // force win via runtime call (private method accessible at runtime)
  await page.evaluate(() => window.__session.win());
  await page.waitForTimeout(1200);

  const modal = await page.locator('.modal').first().textContent().catch(() => '');
  console.log('result modal visible:', !!modal.trim(), '| containsEstrellas:', /Estrellas?|⭐/.test(modal));
  const stars = await page.locator('.modal .stars .star.on').count().catch(() => -1);
  console.log('stars lit:', stars);

  // close modal (find the continue button)
  const closed = await page.locator('.modal [onclick]').count().catch(() => 0);
  const btn = page.locator('.modal button').first();
  console.log('modal buttons:', await btn.count());
  await btn.click().catch(() => {});
  await page.waitForTimeout(300);

  const saveAfter = await page.evaluate(() => localStorage.getItem('candycrush_save_v1'));
  console.log('save after win (excerpt):', saveAfter ? saveAfter.slice(0, 200) : 'none');

  // reload: level unlocked and config persisted
  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(200);
  const lv2Locked = await page.locator('[data-go="2"].locked, [data-go="2"].unlocked').getAttribute('class').catch(() => '?');
  const coinsChip = await page.textContent('.coins-chip').catch(() => '?');
  console.log('level2 class:', lv2Locked, '| coins chip:', coinsChip);
  const savedName = await page.evaluate(() => JSON.parse(localStorage.getItem('candycrush_save_v1')).config.name);
  console.log('persisted name:', savedName);

  console.log('CONSOLE ERRORS:', errors.length ? errors.join(' ||| ') : 'none');
  await browser.close();
})().catch(e => { console.error('SMOKE FAILED:', e.message); process.exit(1); })