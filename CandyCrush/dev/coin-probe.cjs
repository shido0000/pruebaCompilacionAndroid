const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="shop"]');
  await page.waitForTimeout(300);
  const shop = await page.evaluate(() => ({
    coins: document.querySelectorAll('.coin-ic').length,
    buttons: document.querySelectorAll('[data-buy]').length,
    btnHasSvg: !!document.querySelector('[data-buy] .coin-ic'),
  }));
  console.log('shop:', JSON.stringify(shop));
  // result screen shows SVG coin
  await page.click('[data-nav="home"]');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__session.win());
  await page.waitForTimeout(1000);
  const res = await page.evaluate(() => ({
    resCoinsHasSvg: !!document.querySelector('.modal .res-coins .coin-ic'),
    resText: document.querySelector('.modal .res-coins')?.textContent?.slice(0, 20),
  }));
  console.log('result modal:', JSON.stringify(res));
  console.log('PAGEERRORS none expected');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })