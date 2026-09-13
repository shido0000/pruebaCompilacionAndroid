const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:4173/');
  await p.waitForTimeout(400);
  const res = await p.evaluate(async () => ({
    title: document.title,
    manifestName: (await (await fetch('/manifest.webmanifest')).json()).name,
    logo: document.querySelector('.logo')?.textContent.trim(),
  }));
  console.log(JSON.stringify(res));
  console.log('PAGEERRORS:', errs.length ? JSON.stringify(errs) : 'none');
  await b.close();
  const ok = res.title === 'Swipe candy X' && res.manifestName === 'Swipe candy X' && res.logo === 'Swipe candy X' && errs.length === 0;
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });