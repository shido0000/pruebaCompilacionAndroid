const { chromium } = require('playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await page.locator('[data-go="1"]').click().catch(() => {})
  // If click fails (no level grid yet), go home then level 1
  if (!(await page.locator('#board').isVisible().catch(() => false))) {
    await page.goto('http://127.0.0.1:4173/')
    await page.click('[data-nav="levels"]')
  }
  await page.waitForTimeout(400)
  await page.locator('[data-go="1"]').click()
  await page.waitForTimeout(600)

  const canvas = page.locator('#board')
  const box = await canvas.boundingBox()
  const cell = box.width / 8
  const center = (r, c) => ({ x: box.x + c * cell + cell / 2, y: box.y + r * cell + cell / 2 })

  const readDebug = () => page.evaluate(() => ({ ...(window.__session?.debug ?? {}) }))
  const readMoves = () => page.textContent('#movesChip')

  let best = 'none'
  let done = false
  for (let r = 0; r < 8 && !done; r++) {
    for (let c = 0; c < 8 && !done; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        if (r + dr >= 8 || c + dc >= 8) continue
        const a = center(r, c)
        const b = center(r + dr, c + dc)
        await page.mouse.move(a.x, a.y)
        await page.mouse.down()
        await page.mouse.move(b.x, b.y, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(450)
        const d = await readDebug()
        const moves = await readMoves()
        if (d.validSwaps > 0) {
          console.log('VALID SWAP at', r, c, dr, dc, 'moves:', moves, 'tapCalls:', d.onBoardTapCalls, 'debug:', JSON.stringify(d))
          best = `${r},${c},${dr},${dc}`
          done = true
          break
        }
        if (d.swaps === 0) {
          best = best === 'none' ? `noSwapCall at ${r},${c},${dr},${dc}` : best
        }
      }
    }
  }

  const d = await readDebug()
  console.log('FINAL debug:', JSON.stringify(d), 'best:', best)

  await page.goto('http://127.0.0.1:4173/')
  // sales nav via home coin chip
  await page.click('.coins-chip[data-nav="shop"]')
  await page.waitForTimeout(200)
  console.log('shop buy buttons:', await page.locator('[data-buy]').count())
  await page.click('[data-nav="home"]')
  await page.click('[data-nav="achievements"]')
  await page.waitForTimeout(200)
  console.log('achievements listed:', await page.locator('.ach').count())

  console.log('CONSOLE ERRORS:', errors.length ? errors.join(' ||| ') : 'none')
  await browser.close()
})().catch((e) => { console.error('SMOKE FAILED:', e.message); process.exit(1) })