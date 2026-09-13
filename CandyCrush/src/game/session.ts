import type { Grid, Pos, Special } from '../types'
import { createGrid, findMatches, swapCells, hasValidMove, shuffleGrid, applyGravity, computeClearSet, key } from '../engine/board'
import { CANDY_COLORS, COLS, ROWS } from '../engine/candies'
import { levelDef, starsFor, LEVEL_COUNT } from './levels'
import { checkAchievements } from './achievements'
import { levelReward } from './rewards'
import type { SaveData } from './save'
import { persistSave } from './save'
import { Renderer } from '../ui/renderer'
import type { UI } from '../ui/screens'
import { audio } from '../audio'
import { Haptics } from '@capacitor/haptics'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

type BoosterId = 'hammer' | 'moves' | 'shuffle'

export class Session {
  private grid: Grid
  private colors: number
  private level: number
  private movesLeft: number
  private target: number
  private score = 0
  private busy = false
  private over = false
  private renderer: Renderer
  private ui: UI
  private save: SaveData
  private activeBooster: BoosterId | null = null
  private canvas: HTMLCanvasElement
  readonly debug = { swaps: 0, validSwaps: 0, onBoardTapCalls: 0, onTapCalls: 0 }

  private get anim() {
    return this.ui.save.user.anim
  }
  private wait = (ms: number) => (this.anim ? sleep(ms) : Promise.resolve())

  constructor(canvas: HTMLCanvasElement, ui: UI, save: SaveData) {
    this.canvas = canvas
    this.ui = ui
    this.save = save
    ;(window as unknown as { __session?: Session }).__session = this
    this.level = 0
    this.target = 0
    this.movesLeft = 0
    this.colors = 4
    this.grid = createGrid(4)
    this.renderer = new Renderer(canvas)
  }

  resize() {
    const wrap = this.canvas.parentElement
    if (!wrap) return
    const width = Math.max(120, wrap.clientWidth)
    this.renderer.resize(width, width)
    this.renderer.sync(this.grid)
  }

  dispose() {
    this.renderer.dispose()
  }

  start(level: number) {
    const d = levelDef(level)
    this.level = level
    this.target = d.target
    this.movesLeft = d.moves
    this.colors = d.colors
    this.score = 0
    this.over = false
    this.busy = false
    this.activeBooster = null
    this.grid = createGrid(d.colors)
    this.resize()
    this.renderer.anim = this.anim
    this.renderer.start()
    this.bindBoosterButtons()
    this.pushHud()
    this.ui.setBoosterActive(null)
  }

  private bindBoosterButtons() {
    const root = this.ui.rootEl()
    const ids: BoosterId[] = ['hammer', 'moves', 'shuffle']
    for (const id of ids) {
      root.querySelector(`#bo-${id}`)?.addEventListener('click', () => this.setBooster(id))
    }
  }

  private boosters() {
    return this.save.boosters
  }

  private pushHud() {
    this.ui.updateHud({
      level: this.level,
      moves: this.movesLeft,
      score: this.score,
      target: this.target,
      boosters: { ...this.boosters() },
      coins: this.save.coins,
    })
  }

  onTap(p: Pos) {
    this.debug.onTapCalls++
    if (this.busy || this.over) return
    if (this.activeBooster === 'hammer') {
      void this.useHammer(p)
      return
    }
    if (this.activeBooster === 'shuffle') {
      this.ui.toast('El barajado se aplica desde el botón 🔀', 'warn')
      return
    }
  }

  onBoardTap(a: Pos, b: Pos) {
    this.debug.onBoardTapCalls++
    if (this.busy || this.over) return
    if (this.activeBooster === 'hammer') {
      void this.useHammer(a)
      return
    }
    if (this.activeBooster === 'shuffle') {
      this.ui.toast('El barajado se aplica desde el botón 🔀', 'warn')
      return
    }
    void this.doSwap(a, b)
  }

  setBooster(id: BoosterId) {
    if (this.busy || this.over) return
    if (id === 'moves') {
      if (this.boosters().moves <= 0) {
        this.ui.toast('No tienes +3 movimientos. Cómpralos en la tienda 🛒', 'warn')
        return
      }
      this.boosters().moves--
      this.movesLeft += 3
      this.save.stats.bonusMovesUsed++
      audio.coin()
      this.vibrate(10)
      this.pushHud()
      persistSave(this.save)
      this.ui.toast('<b>+3 movimientos</b> añadidos ⏱️', 'good')
      return
    }
    if (id === 'shuffle') {
      if (this.boosters().shuffle <= 0) {
        this.ui.toast('No tienes barajados. Cómpralos en la tienda 🛒', 'warn')
        return
      }
      this.boosters().shuffle--
      audio.special()
      this.shuffleBoard()
      this.save.stats.shuffleUsed++
      persistSave(this.save)
      this.pushHud()
      this.ui.toast('Tablero barajado 🔀', 'good')
      return
    }
    if (id === 'hammer') {
      if (this.boosters().hammer <= 0) {
        this.ui.toast('No tienes martillos. Cómpralos en la tienda 🛒', 'warn')
        return
      }
      this.activeBooster = this.activeBooster === 'hammer' ? null : 'hammer'
      this.canvas.style.cursor = this.activeBooster === 'hammer' ? 'crosshair' : ''
      this.ui.setBoosterActive(this.activeBooster)
      if (this.activeBooster) this.ui.toast('🔨 Toca un dulce para destruirlo', 'info')
      return
    }
  }

  private async useHammer(pos: Pos) {
    const cell = this.grid[pos.r]?.[pos.c]
    if (!cell) return
    this.busy = true
    this.boosters().hammer--
    this.save.stats.hammerUsed++
    this.activeBooster = null
    this.ui.setBoosterActive(null)
    audio.pop(0)
    this.vibrate(12)
    const mid = this.cellMid(pos)
    this.renderer.fxPop(mid.x, mid.y, [CANDY_COLORS[cell.id].base])
    this.renderer.popCells(this.grid, [pos])
    this.grid[pos.r][pos.c] = null
    persistSave(this.save)
    applyGravity(this.grid, this.colors)
    this.renderer.sync(this.grid)
    await this.wait(240)
    await this.resolveCascades()
    this.busy = false
    this.checkEnd()
  }

  private async doSwap(a: Pos, b: Pos) {
    const A = this.grid[a.r][a.c]
    const B = this.grid[b.r][b.c]
    if (!A || !B) return
    this.debug.swaps++
    const kinds = (c: { special: Special }) => c.special
    const comboSpecial = (kinds(A) !== 'none' && kinds(B) !== 'none') || kinds(A) === 'bomb' || kinds(B) === 'bomb'
    this.busy = true
    audio.click()
    this.vibrate(8)
    if (comboSpecial) {
      await this.specialSwap(a, b, A, B)
    } else {
      await this.normalSwap(a, b)
    }
    this.busy = false
  }

  private async normalSwap(a: Pos, b: Pos) {
    swapCells(this.grid, a, b)
    this.renderer.sync(this.grid)
    await this.wait(420)
    const matches = findMatches(this.grid)
    if (matches.length === 0) {
      swapCells(this.grid, a, b)
      this.renderer.sync(this.grid)
      this.renderer.shakeBoard()
      await this.wait(420)
      this.busy = false
      return
    }
    this.debug.validSwaps++
    this.movesLeft--
    this.save.stats.matches++
    await this.resolveCascades()
    if (this.movesLeft <= 0 || this.score >= this.target) this.checkEnd()
  }

  private async specialSwap(a: Pos, b: Pos, A: { special: Special; id: number }, B: { special: Special; id: number }) {
    swapCells(this.grid, a, b)
    this.renderer.sync(this.grid)
    await this.wait(420)
    const cleared = new Set<string>([key(a), key(b)])
    let kind: 'bomb' | 'cross' | 'wr' | 'line' = kindOfCombo(A.special, B.special)

    if (A.special === 'bomb' && B.special === 'bomb') {
      // Whole board
      this.score += 2000
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cleared.add(key({ r, c }))
      kind = 'bomb'
    } else if (A.special === 'bomb' || B.special === 'bomb') {
      const bombC = A.special === 'bomb' ? A : B
      const otherC = A.special === 'bomb' ? B.id : A.id
      const bombPos = A.special === 'bomb' ? a : b
      const otherPos = A.special === 'bomb' ? b : a
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cc = this.grid[r][c]
          if (cc && cc.id === otherC) cleared.add(key({ r, c }))
        }
      cleared.add(key(bombPos))
      cleared.add(key(otherPos))
      bombC.id = otherC
      this.score += 800
      kind = 'bomb'
    } else {
      // striped / wrapped combos produce cross lines & boxes
      const blasts = comboBlasts(a, b, A.special, B.special)
      for (const p of blasts) cleared.add(key(p))
    }

    this.movesLeft--
    this.save.stats.matches++
    await this.applyClearSet(cleared, kind, true)
    await this.resolveCascades()
    if (this.movesLeft <= 0 || this.score >= this.target) this.checkEnd()
  }

  private async applyClearSet(clearedSet: Set<string>, kind: string, bonus: boolean) {
    const before = [...clearedSet].map((k) => {
      const [r, c] = k.split(':').map(Number)
      return { r, c }
    })
    this.score += (bonus ? 1000 : 0) + before.length * 20
    this.save.stats.totalScore += (bonus ? 1000 : 0) + before.length * 20
    const real = before.filter((p) => this.grid[p.r]?.[p.c])
    this.renderer.popCells(this.grid, real)
    if (kind === 'bomb') {
      audio.bomb()
      this.save.stats.bombUsed++
    } else {
      audio.special()
    }
    await this.wait(kind === 'bomb' ? 420 : 260)
    for (const p of real) {
      if (this.grid[p.r]) this.grid[p.r][p.c] = null
    }
    applyGravity(this.grid, this.colors)
    this.renderer.sync(this.grid)
    await this.wait(220)
  }

  private async resolveCascades() {
    let cascade = 0
    for (;;) {
      if (cascade > 30) {
        // pathological case — regenerate a clean board
        this.grid = createGrid(this.colors)
        this.renderer.sync(this.grid)
        await this.wait(200)
        break
      }
      const matches = findMatches(this.grid)
      if (matches.length === 0) break
      const calc = computeClearSet(this.grid, matches)
      const createdBy: Record<string, number> = {}
      for (const cr of calc.created) {
        const cell = this.grid[cr.pos.r]?.[cr.pos.c]
        if (!cell) continue
        createdBy[key(cr.pos)] = cell.id
      }
      const mul = 1 + cascade
      let points = calc.clears.length * 20 * mul
      points += calc.specialCounts.sth * 120 + calc.specialCounts.stv * 120 + calc.specialCounts.wr * 300 + calc.specialCounts.bomb * 800 * mul
      this.score += points
      this.save.stats.totalScore += points
      this.save.stats.matches += matches.length

      // FX per clear
      const real = calc.clears.filter((p) => this.grid[p.r]?.[p.c])
      if (real.length) {
        if (calc.blastKinds.length > 0) {
          const first = calc.blastKinds[0]
          const mid = this.avgMid(first.clears)
          const specialKind = first.blastKind
          const colS = specialKind === 'bomb' ? '#a06bff' : CANDY_COLORS[0].base
          this.renderer.fxSpecial(mid.x, mid.y, colS, specialKind === 'bomb' || specialKind === 'wr')
          this.vibrate(specialKind === 'bomb' ? 40 : 16)
          if (specialKind === 'bomb') {
            this.save.stats.bombUsed++
            audio.bomb()
          } else if (specialKind === 'wr') audio.special()
        }
        for (const p of real) {
          const c = this.grid[p.r][p.c]!
          const mid = this.cellMid(p)
          this.renderer.fxPop(mid.x, mid.y, [CANDY_COLORS[c.id].base])
        }
        this.renderer.popCells(this.grid, real)
        void this.renderer
        await this.wait(230)
      }

      // Created specials (mutate cell in place so its sprite updates)
      for (const cr of calc.created) {
        const cell = this.grid[cr.pos.r]?.[cr.pos.c]
        if (cell) {
          const prevId = createdBy[key(cr.pos)] ?? cell.id
          cell.id = cr.special === 'bomb' ? -1 : prevId
          cell.special = cr.special
          this.save.stats[cr.special === 'bomb' ? 'bombCreated' : cr.special === 'wr' ? 'wrappedCreated' : 'stripedCreated']++
          const mid = this.cellMid(cr.pos)
          const colS = cr.special === 'bomb' ? '#a06bff' : cr.special === 'wr' ? '#ffd23f' : '#ffffff'
          this.renderer.fxSpecial(mid.x, mid.y, colS, false)
        }
      }

      // remove cleared
      const createdKeys = new Set(calc.created.map((cr) => key(cr.pos)))
      for (const p of calc.clears) {
        if (createdKeys.has(key(p))) continue
        if (this.grid[p.r]) this.grid[p.r][p.c] = null
      }

      // score pop
      const cx = this.renderer.w / 2
      const cy = this.renderer.h / 2
      this.renderer.textPop(cx, cy, `+${points.toLocaleString()}`, points > 800 ? '#ffd23f' : '#ffffff', points > 800)
      audio.match(matches.length, cascade)
      await this.wait(120)

      // gravity
      applyGravity(this.grid, this.colors)
      this.renderer.sync(this.grid)
      await this.wait(230)
      audio.pop(cascade)
      cascade++
      if (cascade > this.save.stats.maxCascade) this.save.stats.maxCascade = cascade
    }
    this.pushHud()
    if (!hasValidMove(this.grid)) {
      this.ui.toast('😮 Sin movimientos — reordenando', 'warn')
      await this.wait(200)
      this.shuffleBoard()
    }
  }

  private avgMid(cells: { r: number; c: number }[]): { x: number; y: number } {
    const n = Math.max(1, cells.length)
    let x = 0
    let y = 0
    for (const p of cells) {
      const m = this.cellMid(p)
      x += m.x
      y += m.y
    }
    return { x: x / n, y: y / n }
  }

  private cellMid(p: Pos): { x: number; y: number } {
    return { x: (p.c + 0.5) * this.renderer.cell, y: (p.r + 0.5) * this.renderer.cell }
  }

  shuffleBoard() {
    if (!shuffleGrid(this.grid, this.colors)) {
      this.grid = createGrid(this.colors)
    }
    this.renderer.sync(this.grid)
  }

  private checkEnd() {
    if (this.over) return
    if (this.score >= this.target) {
      this.win()
      return
    }
    if (this.movesLeft <= 0) this.lose()
  }

  private win() {
    this.over = true
    const stars = starsFor(this.level, this.score)
    const firstClear = !(this.save.bestScore[this.level] != null)
    const coins = levelReward(stars, firstClear)
    this.save.coins += coins
    this.save.stats.coinsEarned += coins
    if (this.score > (this.save.bestScore[this.level] ?? 0)) this.save.bestScore[this.level] = this.score
    if (stars > (this.save.stars[this.level] ?? 0)) {
      this.save.stars[this.level] = stars
      if (stars === 3) this.save.stats.threeStarsCount++
    }
    this.save.stats.winCount++
    if (this.level < LEVEL_COUNT && this.save.unlocked < this.level + 1) this.save.unlocked = this.level + 1
    const fresh = checkAchievements(this.save)
    for (const a of fresh) this.ui.achievementToast(a.icon, a.name)
    persistSave(this.save)
    audio.win()
    this.vibrate(60)
    this.pushHud()
    this.ui.showResult({
      won: true,
      stars,
      score: this.score,
      target: this.target,
      coins,
      firstClear,
      newLevel: this.level < LEVEL_COUNT ? this.level + 1 : null,
      level: this.level,
    })
  }

  private lose() {
    this.over = true
    this.save.stats.totalScore += this.score
    const fresh = checkAchievements(this.save)
    for (const a of fresh) this.ui.achievementToast(a.icon, a.name)
    persistSave(this.save)
    audio.fail()
    this.pushHud()
    this.ui.showResult({
      won: false,
      stars: 0,
      score: this.score,
      target: this.target,
      coins: 0,
      firstClear: false,
      newLevel: null,
      level: this.level,
    })
  }

  private vibrate(ms: number) {
    if (!this.save.user.haptics) return
    const cap = (window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor
    if (!cap || !cap.isNativePlatform()) return
    void Haptics.vibrate({ duration: ms })
  }
}

function kindOfCombo(a: Special, b: Special): 'bomb' | 'cross' | 'wr' | 'line' {
  if (a === 'bomb' || b === 'bomb') return 'bomb'
  if (a === 'wr' || b === 'wr') return 'wr'
  if (a !== b) return 'cross'
  return 'line'
}

function comboBlasts(a: Pos, b: Pos, A: Special, B: Special): Pos[] {
  const out: Pos[] = []
  const addLine = (p: Pos, horiz: boolean) => {
    if (horiz) for (let c = 0; c < COLS; c++) out.push({ r: p.r, c })
    else for (let r = 0; r < ROWS; r++) out.push({ r, c: p.c })
  }
  const addBox = (p: Pos) => {
    for (let r = p.r - 1; r <= p.r + 1; r++) for (let c = p.c - 1; c <= p.c + 1; c++) if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push({ r, c })
  }
  if (A === 'sth' || A === 'stv') addLine(a, A === 'sth')
  else addBox(a)
  if (B === 'sth' || B === 'stv') addLine(b, B === 'sth')
  else addBox(b)
  return out
}