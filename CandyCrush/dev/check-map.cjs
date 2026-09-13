const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(400);
  const stats = await page.evaluate(() => {
    const lvs = [...document.querySelectorAll('.lv')];
    const bad = lvs.filter(l => {
      const r = l.getBoundingClientRect();
      const cs = getComputedStyle(l);
      const num = l.querySelector('.lv-num');
      return r.width < 10 || r.height < 10 || cs.visibility === 'hidden' || !num || num.textContent.trim() === '';
    });
    const locked = lvs.filter(l => l.classList.contains('locked')).length;
    const un = [...document.querySelectorAll('.lv.locked')];
    return { total: lvs.length, bad: bad.length, locked, unlockable: lvs.length - locked, firstNum: lvs[0]?.querySelector('.lv-num')?.textContent };
  });
  console.log('map stats:', JSON.stringify(stats));

  const screenFill = await page.evaluate(() => {
    const s = document.querySelector('.screen');
    const bg = getComputedStyle(s).backgroundColor || getComputedStyle(document.body).backgroundImage;
    const lv = document.querySelector('.lv');
    const ocr = lv ? lv.getBoundingClientRect() : null;
    return { screenBg: bg, bodyBg: getComputedStyle(document.body).backgroundImage.slice(0, 60), tileInViewport: ocr ? ocr.top < 844 && ocr.bottom > 0 : null };
  });
  console.log('screen fill:', JSON.stringify(screenFill));
  console.log('CONSOLE ERRORS:', errors.length ? errors.join(' ||| ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });