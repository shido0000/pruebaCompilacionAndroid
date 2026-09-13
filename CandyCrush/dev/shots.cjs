const { chromium } = require('playwright-core');
(async () => {
  const dir = 'C:\\Users\\Lili\\AppData\\Local\\Temp\\opencode';
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: dir + '\\shot-home.png' });

  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: dir + '\\shot-levels.png' });
  await page.screenshot({ path: dir + '\\shot-levels-full.png', fullPage: true });

  const first = await page.locator('.lv').first().boundingBox().catch(() => null);
  console.log('first .lv box:', JSON.stringify(first));
  const vis = await page.evaluate(() => {
    const lv = document.querySelector('.lv');
    if (!lv) return null;
    const cs = getComputedStyle(lv);
    return {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      bg: cs.backgroundImage, color: cs.color,
      w: lv.getBoundingClientRect().width, h: lv.getBoundingClientRect().height,
      screenDisplay: getComputedStyle(document.querySelector('.screen')).display,
    };
  });
  console.log('lv computed:', JSON.stringify(vis));

  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: dir + '\\shot-game.png' });
  const boardBox = await page.locator('#board').boundingBox().catch(() => null);
  console.log('board box:', JSON.stringify(boardBox));
  const pixelCheck = await page.evaluate(() => {
    const c = document.querySelector('#board');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonEmpty = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 40) {
      total++;
      if (d[i + 3] > 0) nonEmpty++;
    }
    const colors = new Set();
    for (let i = 0; i < d.length; i += 40) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return { cw: c.width, ch: c.height, samplesNonEmpty: nonEmpty, samplesTotal: total, distinctColors: colors.size };
  });
  console.log('board pixels:', JSON.stringify(pixelCheck));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })