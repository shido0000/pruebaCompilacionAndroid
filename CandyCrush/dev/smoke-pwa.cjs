const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'NO_SW_REGISTRATION';
    return { scope: reg.scope, active: !!reg.active, state: reg.active?.state ?? null };
  });
  console.log('serviceWorker:', JSON.stringify(sw));

  const manifest = await page.evaluate(async () => {
    const r = await fetch('/manifest.webmanifest');
    const j = await r.json();
    return { name: j.name, display: j.display, icons: j.icons.map(i => i.sizes) };
  });
  console.log('manifest:', JSON.stringify(manifest));

  const installable = await page.evaluate(() => ({
    hasManifestLink: !!document.querySelector('link[rel="manifest"]'),
    themeColor: document.querySelector('meta[name="theme-color"]')?.content,
    viewportFit: document.querySelector('meta[name="viewport"]')?.content?.includes('viewport-fit'),
    appleCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content,
  }));
  console.log('installable:', JSON.stringify(installable));

  const swServed = await page.evaluate(async () => (await fetch('/sw.js')).status);
  console.log('sw.js status:', swServed);

  // offline check: go offline after first load and reload
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1200);
  const offlineTitle = await page.title().catch(() => 'ERR');
  console.log('offline reload title:', offlineTitle);
  if (offlineTitle !== 'Swipe candy X') throw new Error('offline title mismatch');
  await page.context().setOffline(false);

  console.log('CONSOLE ERRORS:', errors.length ? errors.join(' ||| ') : 'none');
  await browser.close();
})().catch(e => { console.error('SMOKE FAILED:', e.message); process.exit(1); });