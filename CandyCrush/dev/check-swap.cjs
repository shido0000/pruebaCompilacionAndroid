const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173/');
  await page.click('[data-nav="levels"]');
  await page.locator('[data-go="1"]').click();
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.__hist = [];
    const rend = window.__session.renderer;
    const origDraw = rend.draw.bind(rend);
    let since = 0;
    rend.draw = () => {
      if (performance.now() - since > 25) {
        since = performance.now();
        let cur = 0;
        for (const [, sp] of rend.sprites) cur = Math.max(cur, Math.max(Math.abs(sp.x - sp.tx), Math.abs(sp.y - sp.ty)));
        window.__hist.push(+cur.toFixed(1));
      }
      origDraw();
    };
  });

  const box = await page.locator('#board').boundingBox();
  const cell = box.width / 8;
  const a = { x: box.x + 3 * cell + cell / 2, y: box.y + 3 * cell + cell / 2 };
  const b = { x: box.x + 4 * cell + cell / 2, y: box.y + 3 * cell + cell / 2 };
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const mid = await page.evaluate(() => window.__hist.slice());
  await page.waitForTimeout(900);
  const end = await page.evaluate(() => ({ hist: window.__hist.slice(), debug: { ...window.__session.debug } }));
  console.log('first 300ms of displacement (~40ms/sample):', JSON.stringify(mid));
  console.log('after ~1.2s last 6 samples:', JSON.stringify(end.hist.slice(-6)), '| debug:', JSON.stringify(end.debug));

  const seq = mid.length; // length 300ms
  const peak = Math.max(...mid);
  const idxPeak = mid.indexOf(peak);
  console.log('samples:', seq, '| peak:', peak, 'px at sample', idxPeak, '=> ~' + Math.round(idxPeak * 40) + 'ms after start');
  const settled = end.debug.validSwaps === 0 ? end.hist.slice(-2).every(v => v < 1.5) : 'n/a(valid)';
  console.log('settled back at rest (invalid swap):', settled);
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); })