const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://127.0.0.1:4173/');
  await p.waitForTimeout(400);
  await p.click('[data-nav="help"]');
  await p.waitForTimeout(300);
  const info = await p.evaluate(() => {
    const coins = document.querySelectorAll('.help-modal .coin-ic');
    const li = document.querySelector('.help-modal li');
    return {
      coinCount: coins.length,
      sizes: [...coins].map((c) => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; }),
      display: coins[0] ? getComputedStyle(coins[0]).display : null,
      liText: li ? li.textContent : null,
    };
  });
  console.log(JSON.stringify(info));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });