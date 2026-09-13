const { chromium } = require('playwright-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForTimeout(400);

  // home -> Ayuda
  await page.click('[data-nav="help"]');
  await page.waitForTimeout(300);
  const homeHelp = await page.evaluate(() => {
    const m = document.querySelector('.help-modal');
    return {
      open: !!m,
      hasTitle: !!m && m.textContent.includes('¿Cómo se juega?'),
      hasHammer: !!m && m.textContent.includes('toca un dulce'),
      secs: document.querySelectorAll('.help-sec').length,
    };
  });
  console.log('home help modal:', JSON.stringify(homeHelp));
  await page.click('.help-modal [data-close]');
  await page.waitForTimeout(200);

  // game -> ? button
  await page.click('[data-nav="levels"]');
  await page.waitForTimeout(150);
  await page.click('[data-go="1"]');
  await page.waitForTimeout(800);
  await page.click('#helpBtn');
  await page.waitForTimeout(300);
  const gameHelp = await page.evaluate(() => ({
    open: !!document.querySelector('.help-modal'),
    hasObjective: !!document.querySelector('.help-modal') && document.querySelector('.help-modal').textContent.includes('Objetivo'),
  }));
  console.log('game help modal:', JSON.stringify(gameHelp));

  // still returning to game state OK after closing
  await page.click('.help-modal [data-close]');
  await page.waitForTimeout(300);
  const sessionAlive = await page.evaluate(() => !!window.__session && window.__session.score >= 0);

  const ok = homeHelp.open && homeHelp.hasTitle && homeHelp.hasHammer && homeHelp.secs >= 5 && gameHelp.open && gameHelp.hasObjective && sessionAlive && errors.length === 0;
  console.log(errors.length ? 'PAGEERRORS: ' + JSON.stringify(errors) : 'no page errors');
  console.log(ok ? 'HELP OK' : 'HELP FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });