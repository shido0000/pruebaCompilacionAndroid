import type { Cell, Grid, Pos, Special } from '../types'
import { CANDY_COLORS, COLS, ROWS } from '../engine/candies'
import { Particles } from './particles'

const TW_SWAP = 0.22
const TW_FALL = 0.24

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

interface Sprite {
  cell: Cell
  x: number
  y: number
  x0: number
  y0: number
  t: number
  tx: number
  ty: number
  scale: number
  popT: number
  flash: number
  dying: boolean
  rot: number
}

interface PopText {
  x: number
  y: number
  text: string
  color: string
  big: boolean
  life: number
}

function shapeFor(ctx: CanvasRenderingContext2D, id: number) {
  ctx.beginPath()
  switch (id) {
    case 0: // Caramelo redondo
      ctx.arc(0, 0, 0.42, 0, Math.PI * 2)
      break
    case 1: // Piruleta
      ctx.arc(0, 0, 0.42, 0, Math.PI * 2)
      break
    case 2: // Glotón cuadrado
      ctx.roundRect(-0.38, -0.38, 0.76, 0.76, 0.14)
      break
    case 3: // Joya diamante
      ctx.moveTo(0, -0.44)
      ctx.lineTo(0.4, 0)
      ctx.lineTo(0, 0.44)
      ctx.lineTo(-0.4, 0)
      ctx.closePath()
      break
    case 4: // Manzana estrella
      {
        const spikes = 5
        const outer = 0.46
        const inner = 0.2
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner
          const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        ctx.closePath()
      }
      break
    case 5: // Fresa corazón
      {
        ctx.moveTo(0, 0.44)
        ctx.bezierCurveTo(-0.46, 0.12, -0.34, -0.34, 0, -0.14)
        ctx.bezierCurveTo(0.34, -0.34, 0.46, 0.12, 0, 0.44)
        ctx.closePath()
      }
      break
  }
}

export function drawCandy(ctx: CanvasRenderingContext2D, x: number, y: number, sizePx: number, id: number, special: Special, rot = 0) {
  const col = CANDY_COLORS[Math.max(0, Math.min(CANDY_COLORS.length - 1, id))]
  const s = sizePx / 2
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = 1

  if (special === 'bomb') {
    const grad = ctx.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s * 1.1)
    grad.addColorStop(0, '#6a3fb8')
    grad.addColorStop(1, '#24123f')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2)
    ctx.fill()
    // sparkles
    ctx.shadowBlur = s * 0.5
    ctx.shadowColor = '#b78cff'
    const ccs = [0, 1, 2, 3, 4, 5]
    for (const cc of ccs) {
      const a = (cc / ccs.length) * Math.PI * 2
      const rr = s * 0.5
      ctx.fillStyle = CANDY_COLORS[cc].base
      ctx.beginPath()
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    // gloss
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.ellipse(-s * 0.3, -s * 0.38, s * 0.24, s * 0.14, -0.6, 0, Math.PI * 2)
    ctx.fill()
    // fuse hole
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = s * 0.09
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.34, Math.PI * 0.9, Math.PI * 2.1)
    ctx.stroke()
    ctx.restore()
    return
  }

  const grad = ctx.createLinearGradient(-s, -s, s, s)
  grad.addColorStop(0, col.light)
  grad.addColorStop(0.35, col.base)
  grad.addColorStop(1, col.dark)
  ctx.fillStyle = grad

  ctx.save()
  ctx.scale(s, s)
  shapeFor(ctx, id)
  ctx.fill()

  // inner detail per candy
  ctx.lineWidth = 0.06
  ctx.strokeStyle = col.dark
  ctx.stroke()
  ctx.fillStyle = col.dark
  if (id === 1) {
    // lollipop swirl
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 0.11
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 5) * Math.PI * 2
      const rr = 0.1 + i * 0.05
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  } else if (id === 3) {
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(0, -0.3)
    ctx.lineTo(0, 0.3)
    ctx.moveTo(-0.25, 0)
    ctx.lineTo(0.25, 0)
    ctx.moveTo(-0.18, -0.18)
    ctx.lineTo(0.18, 0.18)
    ctx.moveTo(-0.18, 0.18)
    ctx.lineTo(0.18, -0.18)
    ctx.lineWidth = 0.05
    ctx.stroke()
    ctx.globalAlpha = 1
  } else if (id === 5) {
    // strawberry seeds
    ctx.globalAlpha = 0.45
    for (const [sx, sy] of [
      [-0.14, 0.05],
      [0.16, 0.02],
      [0, 0.16],
      [-0.05, -0.08],
      [0.12, 0.2],
    ]) {
      ctx.beginPath()
      ctx.arc(sx, sy, 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else if (id === 0) {
    // caramel swirl
    ctx.strokeStyle = col.light
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 0.09
    ctx.beginPath()
    ctx.arc(0, 0, 0.24, -Math.PI * 0.5, Math.PI * 0.6)
    ctx.stroke()
    ctx.globalAlpha = 1
  } else if (id === 4) {
    ctx.shadowBlur = 0
  }

  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-0.16, -0.28, 0.18, 0.11, -0.5, 0, Math.PI * 2)
  ctx.fill()

  if (special === 'sth' || special === 'stv') {
    // diagonal stripes clipped to shape
    ctx.save()
    ctx.clip()
    ctx.globalAlpha = 0.85
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.13
    ctx.lineCap = 'round'
    for (let d = -0.6; d <= 0.6; d += 0.26) {
      ctx.beginPath()
      ctx.moveTo(-0.55, d + 0.55)
      ctx.lineTo(0.55, d - 0.55)
      ctx.stroke()
    }
    ctx.restore()
    // direction chevrons
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.07
    for (let i = 0; i < 3; i++) {
      const off = -0.28 + i * 0.21
      ctx.beginPath()
      if (special === 'sth') {
        ctx.moveTo(-0.34, off + 0.09)
        ctx.lineTo(-0.18, off)
        ctx.lineTo(-0.34, off - 0.09)
      } else {
        ctx.moveTo(off + 0.09, -0.34)
        ctx.lineTo(off, -0.18)
        ctx.lineTo(off - 0.09, -0.34)
      }
      ctx.moveTo(0.34, off + 0.09)
      ctx.lineTo(0.18, off)
      ctx.lineTo(0.34, off - 0.09 - (special === 'sth' ? 0 : 0))
      if (special === 'stv') {
        ctx.moveTo(off + 0.09, 0.34)
        ctx.lineTo(off, 0.18)
        ctx.lineTo(off - 0.09, 0.34)
      }
      ctx.stroke()
    }
  } else if (special === 'wr') {
    ctx.globalAlpha = 0.95
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : col.light
      ctx.beginPath()
      ctx.arc(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.13, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
  ctx.restore()
}

interface Overlay {
  type: 'flash' | 'ring'
  x: number
  y: number
  r: number
  life: number
  max: number
  color: string
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sprites: Map<Cell, Sprite> = new Map()
  private dying: Sprite[] = []
  private texts: PopText[] = []
  private overlays: Overlay[] = []
  particles = new Particles()
  cell = 48
  w = 0
  h = 0
  anim = true
  private last = 0
  private running = false
  private raf = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const loop = (now: number) => {
      if (!this.canvas.isConnected) {
        this.running = false
        return
      }
      const dt = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  dispose() {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.sprites.clear()
    this.dying = []
    this.texts = []
    this.overlays = []
    this.particles.list = []
  }

  resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.max(1, Math.round(width * dpr))
    this.canvas.height = Math.max(1, Math.round(height * dpr))
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.w = width
    this.h = height
    this.cell = width / COLS
  }

  private newSprite(cell: Cell, r: number, c: number): Sprite {
    const spawnAbove = cell.special !== 'none' ? 0 : Math.random() > 0.5 ? 1 : 0
    const y = spawnAbove ? -this.cell * 1.2 : (r + 0.5) * this.cell
    return {
      cell,
      x: (c + 0.5) * this.cell,
      y,
      x0: (c + 0.5) * this.cell,
      y0: y,
      t: 0,
      tx: (c + 0.5) * this.cell,
      ty: (r + 0.5) * this.cell,
      scale: 1,
      popT: -1,
      flash: 0,
      dying: false,
      rot: 0,
    }
  }

  sync(grid: Grid) {
    const live = new Set<Cell>()
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        live.add(cell)
        const sp = this.sprites.get(cell)
        if (sp) {
          const nx = (c + 0.5) * this.cell
          const ny = (r + 0.5) * this.cell
          if (sp.tx !== nx || sp.ty !== ny) {
            sp.x0 = sp.x
            sp.y0 = sp.y
            sp.t = 0
            sp.tx = nx
            sp.ty = ny
          }
        } else {
          const ns = this.newSprite(cell, r, c)
          this.sprites.set(cell, ns)
        }
      }
    }
    for (const [cell, sp] of [...this.sprites]) {
      if (!live.has(cell) && !sp.dying) {
        sp.dying = true
        sp.popT = 0
        sp.flash = 1
        this.dying.push(sp)
        this.sprites.delete(cell)
      }
    }
  }

  popCells(grid: Grid, cells: Pos[]) {
    for (const p of cells) {
      const cell = grid[p.r]?.[p.c]
      if (!cell) continue
      const sp = this.sprites.get(cell)
      if (sp) {
        sp.popT = 0
        sp.flash = 1
      }
    }
  }

  fxPop(x: number, y: number, colors: string[]) {
    this.particles.spawn(x, y, colors, 16)
    this.particles.ring(x, y, '#ffffff')
    this.overlays.push({ type: 'flash', x, y, r: this.cell * 0.9, life: 0, max: 0.22, color: '#ffffff' })
  }

  fxSpecial(x: number, y: number, color: string, big = false) {
    const colors = Object.values(CANDY_COLORS).map((c) => c.base)
    this.particles.spawn(x, y, colors, big ? 60 : 30, big ? 1.6 : 1)
    this.particles.ring(x, y, color)
    this.overlays.push({ type: 'flash', x, y, r: big ? this.cell * 2.4 : this.cell * 1.4, life: 0, max: 0.3, color })
  }

  textPop(x: number, y: number, text: string, color = '#ffffff', big = false) {
    this.texts.push({ x, y, text, color, big, life: 0 })
  }

  boardShake = 0
  shakeBoard() {
    this.boardShake = 0.22
  }

  private update(dt: number) {
    for (const sp of this.sprites.values()) {
      const far = Math.abs(sp.tx - sp.x) > 0.5 || Math.abs(sp.ty - sp.y) > 0.5
      if (far) {
        const fall = Math.abs(sp.ty - sp.y0) > this.cell * 0.6
        sp.t += dt / (this.anim ? (fall ? TW_FALL : TW_SWAP) : 0.02)
        if (sp.t >= 1) {
          sp.x = sp.tx
          sp.y = sp.ty
        } else {
          const e = easeOutCubic(sp.t)
          sp.x = sp.x0 + (sp.tx - sp.x0) * e
          sp.y = sp.y0 + (sp.ty - sp.y0) * e
        }
      } else {
        sp.x = sp.tx
        sp.y = sp.ty
      }
      if (sp.popT >= 0) sp.popT += dt
      if (sp.flash > 0) sp.flash = Math.max(0, sp.flash - dt * 5)
    }
    for (const sp of this.dying) {
      sp.popT += dt
    }
    this.dying = this.dying.filter((s) => s.popT < 0.22)
    for (const t of this.texts) t.life += dt
    this.texts = this.texts.filter((t) => t.life < 0.8)
    for (const o of this.overlays) o.life += dt
    this.overlays = this.overlays.filter((o) => o.life < o.max)
    this.particles.update(dt)
    this.boardShake = Math.max(0, this.boardShake - dt)
  }

  private draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)
    ctx.save()
    if (this.boardShake > 0) {
      const k = this.boardShake / 0.22
      ctx.translate(Math.sin(k * 60) * 6, Math.cos(k * 70) * 4)
    }

    // board background
    ctx.fillStyle = 'rgba(0,0,0,0.16)'
    ctx.beginPath()
    ctx.roundRect(0, 0, this.w, this.h, 14)
    ctx.fill()

    for (const sp of this.sprites.values()) {
      this.drawSprite(sp)
    }
    for (const sp of this.dying) {
      this.drawSprite(sp)
    }

    // overlays
    for (const o of this.overlays) {
      const k = o.life / o.max
      const a = 1 - k
      const rr = o.r * (0.6 + k * 1.4)
      ctx.globalAlpha = a * 0.8
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, rr)
      g.addColorStop(0, o.color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(o.x, o.y, rr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    this.particles.draw(ctx)

    // pop texts
    ctx.textAlign = 'center'
    for (const t of this.texts) {
      const k = t.life / 0.8
      ctx.globalAlpha = 1 - k < 0 ? 0 : 1 - k
      ctx.font = `800 ${t.big ? 30 : 20}px 'Baloo 2', system-ui, sans-serif`
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 4
      ctx.lineJoin = 'round'
      const x = t.x
      const y = t.y - k * 26
      ctx.strokeText(t.text, x, y)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, x, y)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawSprite(sp: Sprite) {
    const ctx = this.ctx
    let pop = 0
    if (sp.popT >= 0) {
      pop = sp.popT / 0.22
    }
    const fade = sp.popT > 0.13 ? Math.max(0, 1 - (sp.popT - 0.13) / 0.09) : 1
    const sc = sp.scale * (1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.5)
    if (!this.anim) {
      drawCandy(ctx, sp.x, sp.y, this.cell * sc * (sp.dying ? 1.3 : 1), sp.cell.id, sp.cell.special)
      return
    }
    ctx.save()
    ctx.translate(sp.x, sp.y)
    if (sp.dying) {
      ctx.scale(1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.6, 1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.6)
    } else {
      ctx.scale(sc, sc)
    }
    ctx.globalAlpha = fade
    drawCandy(ctx, 0, 0, this.cell, sp.cell.id, sp.cell.special, sp.rot)
    if (sp.flash > 0) {
      ctx.globalAlpha = sp.flash * 0.7
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, this.cell * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}