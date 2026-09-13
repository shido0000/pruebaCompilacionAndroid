const { chromium } = require('playwright-core')

;(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message))

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const title = await page.title()
  console.log('TITLE:', title)

  // home screen visible
  const hasPlay = await page.isVisible('#btnPlay')
  console.log('hasPlayButton:', hasPlay)
  console.log('logo text:', await page.textContent('.logo').catch(() => 'n/a'))

  // go to levels
  await page.click('[data-nav="levels"]')
  await page.waitForTimeout(200)
  const lvCount = await page.locator('.lv').count()
  console.log('level tiles:', lvCount)

  // open a level
  await page.locator('[data-go="1"]').click()
  await page.waitForTimeout(600)
  const canvasVisible = await page.locator('#board').isVisible()
  console.log('board canvas visible:', canvasVisible)
  const moves = await page.textContent('#movesChip')
  console.log('moves chip:', moves)

  // simulate a swap: dispatch pointer events
  const canvas = page.locator('#board')
  const box = await canvas.boundingBox()
  console.log('canvas box:', JSON.stringify(box))

  const cell = box.width / 8
  const center = (r, c) => ({ x: box.x + c * cell + cell / 2, y: box.y + r * cell + cell / 2 })

  // Try a number of candidate swaps until one is valid (visual score moves)
  const fireSwap = async (r, c, dr, dc) => {
    const a = center(r, c)
    const b = center(r + dr, c + dc)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)
  }

  // scan all adjacent swaps for the first one that changes the moves counter
  let changed = false
  const beforeMoves = await page.textContent('#movesChip')
  outer: for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        if (r + dr >= 8 || c + dc >= 8) continue
        await fireSwap(r, c, dr, dc)
        const after = await page.textContent('#movesChip')
        if (after !== beforeMoves) {
          console.log('valid swap found at', r, c, dr, dc, 'moves:', after)
          changed = true
          break outer
        }
      }
    }
  }
  console.log('any valid swap effects:', changed)

  // check sanity of HUD after a few moves
  await page.waitForTimeout(1000)
  const score = await page.textContent('#scoreText')
  console.log('score text:', score)

  // back to home via slightly forced nav (reload)
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)

  // settings
  await page.click('[data-nav="settings"]')
  await page.waitForTimeout(200)
  await page.fill('#userName', 'Tester')
  await page.dispatchEvent('#userName', 'change')
  await page.waitForTimeout(150)
  console.log('settings ok')

  // shop
  await page.click('[data-nav="shop"]')
  await page.waitForTimeout(200)
  const buyBtns = await page.locator('[data-buy]').count()
  console.log('shop buy buttons:', buyBtns)

  // achievements
  await page.click('[data-nav="achievements"]')
  await page.waitForTimeout(200)
  const achCount = await page.locator('.ach').count()
  console.log('achievements listed:', achCount)

  console.log('CONSOLE ERRORS:', errors.length ? errors.join(' ||| ') : 'none')
  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e.message)
  process.exit(1)
})