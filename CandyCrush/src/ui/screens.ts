import type { SaveData, UserSettings } from '../game/save'
import { AVATAR_COLORS, AVATARS } from '../game/save'
import { LEVEL_COUNT, levelDef } from '../game/levels'
import { BOOSTERS } from '../game/rewards'
import { ACHIEVEMENTS } from '../game/achievements'
import { drawCandy } from './renderer'
import { audio } from '../audio'

export interface UIHooks {
  onPlay: (level: number) => void
  onBackToMenu: () => void
  onGoLevel: (level: number) => void
  onUpdateUser: (u: UserSettings) => void
  onResetProgress: () => void
  onBuyBooster: (id: 'hammer' | 'moves' | 'shuffle') => void
  onRetry: () => void
  onGameNav: (action: 'resume' | 'restart' | 'menu') => void
}

export const COIN_SVG =
  '<svg class="coin-ic" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#d99a00"/><circle cx="12" cy="12" r="8.2" fill="#ffd23f" stroke="#e0a800" stroke-width="1.4"/><path d="M12 8.4l1.25 2.8 3.05.35-2.25 2.1.65 3L12 15.4l-2.7 1.25.65-3-2.25-2.1 3.05-.35z" fill="#b87900"/></svg>'

export interface HudState {
  level: number
  moves: number
  score: number
  target: number
  boosters: { hammer: number; moves: number; shuffle: number }
  coins: number
}

export interface ResultInfo {
  won: boolean
  stars: number
  score: number
  target: number
  coins: number
  firstClear: boolean
  newLevel: number | null
  level: number
}

export class UI {
  private root: HTMLElement
  save: SaveData
  hooks: UIHooks

  constructor(root: HTMLElement, save: SaveData, hooks: UIHooks) {
    this.root = root
    this.save = save
    this.hooks = hooks
  }

  syncSave(save: SaveData) {
    this.save = save
  }

  rootEl(): HTMLElement {
    return this.root
  }

  render() {
    this.home()
  }

  private esc(s: string): string {
    return s.replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]!))
  }

  private setScreen(html: string, onMount?: (r: HTMLElement) => void) {
    this.root.innerHTML = html
    this.root.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => this.nav((el as HTMLElement).dataset.nav!))
    })
    if (onMount) onMount(this.root)
  }

  private coinsChip(): string {
    return `<span class="chip coins-chip" data-nav="shop">${COIN_SVG} ${this.save.coins}</span>`
  }

  nav(screen: string) {
    audio.click()
    switch (screen) {
      case 'home': this.home(); break
      case 'levels': this.levels(); break
      case 'achievements': this.achievements(); break
      case 'shop': this.shop(); break
      case 'settings': this.settings(); break
    }
  }

  home() {
    const u = this.save.user
    this.setScreen(`
      <div class="screen home">
        <div class="banner">
          <canvas id="homeCandy"></canvas>
          <div class="logo"><span class="c1">C</span>andy <span class="c2">Cr</span>ush</div>
          <div class="tagline">¡Dulces, puntuación y diversión!</div>
        </div>
        <div class="card player-card">
          <div class="avatar" style="background:${u.avatarColor}">${u.avatar}</div>
          <div class="pinfo">
            <div class="pname">${this.esc(u.name)}</div>
            <div class="plvl">Nivel máx: ${this.save.unlocked}</div>
          </div>
          ${this.coinsChip()}
        </div>
        <button class="btn btn-play" id="btnPlay">▶ JUGAR</button>
        <div class="sub-btns">
          <button class="btn sub" data-nav="levels">🗺️ Niveles</button>
          <button class="btn sub" data-nav="achievements">🏆 Logros</button>
          <button class="btn sub" data-nav="shop">🛒 Tienda</button>
          <button class="btn sub" data-nav="settings">⚙️ Ajustes</button>
        </div>
      </div>
    `, (r) => {
      const canvas = r.querySelector<HTMLCanvasElement>('#homeCandy')!
      this.drawBannerCandies(canvas)
      r.querySelector('#btnPlay')!.addEventListener('click', () => {
        audio.click()
        this.hooks.onPlay(this.save.unlocked)
      })
    })
  }

  private drawBannerCandies(canvas: HTMLCanvasElement) {
    const parent = canvas.parentElement
    if (!parent) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = parent.clientWidth
    const h = 120
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const draw = (tw: number) => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < 9; i++) {
        const xs = (i + 0.5) * (w / 9)
        const ys = 30 + ((i % 2 === 0 ? 1 : -1) * 14)
        const bounce = Math.sin(tw * 2.2 + i * 0.9) * 7
        const id = i % 6
        drawCandy(ctx, xs, ys + bounce, 52, id, 'none')
      }
    }
    const loop = (now: number) => {
      draw(now / 1000)
      if (canvas.isConnected) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  levels() {
    const s = this.save
    const items = Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1)
      .map((n) => {
        const locked = n > s.unlocked
        const stars = s.stars[n] ?? 0
        const d = levelDef(n)
        const starIcons = locked ? '🔒' : stars === 0 ? '<span class="dim">••••</span>' : '⭐'.repeat(stars) + '<span class="dim">' + '·'.repeat(3 - stars) + '</span>'
        return `<div class="lv ${locked ? 'locked' : ''}" data-go="${n}">
          <div class="lv-num">${n}</div>
          <div class="lv-stars">${starIcons}</div>
          <div class="lv-goal">🎯 ${d.target}</div>
        </div>`
      })
      .join('')
    this.setScreen(`
      <div class="screen levels">
        <div class="topbar">
          <button class="icon-btn" data-nav="home">‹</button>
          <div class="title">🗺️ Niveles</div>
          ${this.coinsChip()}
        </div>
        <div class="lv-grid">${items}</div>
      </div>
    `, (r) => {
      r.querySelectorAll('[data-go]').forEach((el) => {
        el.addEventListener('click', () => {
          const n = +(el as HTMLElement).dataset.go!
          if (n <= this.save.unlocked) this.hooks.onGoLevel(n)
          else this.toast(`<b>Nivel ${n}</b> bloqueado — supera antes el nivel ${n - 1}`, 'warn')
        })
      })
    })
  }

  achievements() {
    const s = this.save
    const items = ACHIEVEMENTS.map((a) => {
      const got = !!s.achievements[a.id]
      return `<div class="ach ${got ? 'got' : 'no'}">
        <div class="ach-ico">${got ? a.icon : '❔'}</div>
        <div class="ach-body">
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
        <div class="ach-coin">${got ? `${a.coins} ${COIN_SVG}` : ''}</div>
      </div>`
    }).join('')
    const done = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length
    this.setScreen(`
      <div class="screen ach-screen">
        <div class="topbar">
          <button class="icon-btn" data-nav="home">‹</button>
          <div class="title">🏆 Logros</div>
          ${this.coinsChip()}
        </div>
        <div class="ach-progress">${done}/${ACHIEVEMENTS.length} desbloqueados</div>
        <div class="ach-list">${items}</div>
      </div>
    `)
  }

  shop() {
    const s = this.save
    const cards = BOOSTERS.map((bo) => `
      <div class="shop-card">
        <div class="shop-ico">${bo.icon}</div>
        <div class="shop-name">${bo.name}</div>
        <div class="shop-desc">${bo.desc}</div>
        <div class="shop-have">En inventario: <b>${s.boosters[bo.id]}</b></div>
        <button class="btn buy" data-buy="${bo.id}" ${s.coins < bo.cost ? 'disabled' : ''}>Comprar ${bo.cost} ${COIN_SVG}</button>
      </div>`).join('')
    this.setScreen(`
      <div class="screen shop-screen">
        <div class="topbar">
          <button class="icon-btn" data-nav="home">‹</button>
          <div class="title">🛒 Tienda</div>
          ${this.coinsChip()}
        </div>
        <div class="shop-grid">${cards}</div>
        <div class="hint small">${COIN_SVG} Gana monedas superando niveles</div>
      </div>
    `, (r) => {
      r.querySelectorAll('[data-buy]').forEach((el) => {
        el.addEventListener('click', () => {
          this.hooks.onBuyBooster((el as HTMLElement).dataset.buy! as 'hammer' | 'moves' | 'shuffle')
        })
      })
    })
  }

  settings() {
    const u = this.save.user
    const avatarBtns = AVATARS.map((a) => `<button class="avo ${a === u.avatar ? 'sel' : ''}" data-ava="${a}">${a}</button>`).join('')
    const colorBtns = AVATAR_COLORS.map((c) => `<button class="avc ${c === u.avatarColor ? 'sel' : ''}" data-avc="${c}" style="background:${c}"></button>`).join('')
    const toggles = (['sound', 'music', 'anim', 'haptics'] as const)
      .map((k) => {
        const label: Record<string, string> = { sound: '🔊 Sonido', music: '🎵 Música', anim: '✨ Animaciones', haptics: '📳 Vibración' }
        return `<div class="set-row"><span>${label[k]}</span><button class="switch ${u[k] ? 'on' : ''}" data-toggle="${k}"><span class="knob"></span></button></div>`
      })
      .join('')
    const s = this.save
    this.setScreen(`
      <div class="screen settings-screen">
        <div class="topbar">
          <button class="icon-btn" data-nav="home">‹</button>
          <div class="title">⚙️ Ajustes</div>
        </div>
        <div class="card set-card">
          <div class="set-row"><label class="grow">🧸 Usuario</label>
            <input type="text" id="userName" maxlength="16" value="${this.esc(u.name)}" placeholder="Tu nombre">
          </div>
          <div class="set-row"><label class="grow">🎨 Avatar</label><div class="avo-row">${avatarBtns}</div></div>
          <div class="set-row"><label class="grow">🌸 Color</label><div class="avc-row">${colorBtns}</div></div>
        </div>
        <div class="card set-card">${toggles}</div>
        <div class="card stats-card">
          <div class="set-title">📊 Estadísticas</div>
          <div class="stat-row"><span>Matches</span><b>${s.stats.matches}</b></div>
          <div class="stat-row"><span>Victorias</span><b>${s.stats.winCount}</b></div>
          <div class="stat-row"><span>Máx. cascada</span><b>${s.stats.maxCascade}</b></div>
          <div class="stat-row"><span>Puntos totales</span><b>${s.stats.totalScore.toLocaleString()}</b></div>
          <div class="stat-row"><span>Monedas ganadas</span><b>${s.stats.coinsEarned}</b></div>
        </div>
        <button class="btn danger" id="resetBtn">🗑️ Borrar progreso</button>
      </div>
    `, (r) => {
      const name = r.querySelector<HTMLInputElement>('#userName')!
      name.addEventListener('change', () => {
        this.hooks.onUpdateUser({ ...u, name: name.value.trim() || 'Jugador' })
      })
      r.querySelectorAll('[data-ava]').forEach((el) => {
        el.addEventListener('click', () => {
          this.hooks.onUpdateUser({ ...this.save.user, avatar: (el as HTMLElement).dataset.ava! })
          this.settings()
        })
      })
      r.querySelectorAll('[data-avc]').forEach((el) => {
        el.addEventListener('click', () => {
          this.hooks.onUpdateUser({ ...this.save.user, avatarColor: (el as HTMLElement).dataset.avc! })
          this.settings()
        })
      })
      r.querySelectorAll('[data-toggle]').forEach((el) => {
        el.addEventListener('click', () => {
          const k = (el as HTMLElement).dataset.toggle as 'sound' | 'music' | 'anim' | 'haptics'
          const nu = { ...this.save.user, [k]: !this.save.user[k] }
          this.hooks.onUpdateUser(nu)
          this.settings()
        })
      })
      r.querySelector('#resetBtn')!.addEventListener('click', () => {
        this.confirm('🗑️ ¿Borrar TODO el progreso?', () => this.hooks.onResetProgress(), 'Borrar')
      })
    })
  }

  gameScreen(level: number): HTMLCanvasElement {
    const d = levelDef(level)
    this.setScreen(`
      <div class="screen game">
        <div class="topbar">
          <button class="icon-btn" id="pauseBtn">⏸</button>
          <div class="title lv-title">Nivel ${level}</div>
          <div class="chip" id="movesChip">⚡ ${d.moves}</div>
        </div>
        <div class="target-strip">
          <div class="tlabel">🎯 <span id="scoreText">0</span> / ${d.target.toLocaleString()}</div>
          <div class="progress"><div class="bar" id="targetBar"></div></div>
        </div>
        <div class="board-wrap"><canvas id="board"></canvas></div>
        <div class="booster-row">
          <button class="btn booster" id="bo-hammer">🔨 <span id="bc-hammer">${this.save.boosters.hammer}</span></button>
          <button class="btn booster" id="bo-moves">⏱️ +3 <span id="bc-moves">${this.save.boosters.moves}</span></button>
          <button class="btn booster" id="bo-shuffle">🔀 <span id="bc-shuffle">${this.save.boosters.shuffle}</span></button>
        </div>
      </div>
    `, (r) => {
      r.querySelector('#pauseBtn')!.addEventListener('click', () => this.pauseMenu())
    })
    return this.root.querySelector<HTMLCanvasElement>('#board')!
  }

  setBoosterActive(id: string | null) {
    this.root.querySelectorAll('.booster').forEach((el) => el.classList.toggle('active', (el as HTMLElement).id === `bo-${id}`))
  }

  updateHud(h: HudState) {
    const q = <T extends Element = HTMLElement>(id: string) => this.root.querySelector<T>(`#${id}`)
    const scoreEl = q('scoreText')
    if (scoreEl) scoreEl.textContent = h.score.toLocaleString()
    const moves = q<HTMLElement>('movesChip')
    if (moves) moves.textContent = `⚡ ${h.moves}`
    const bar = q<HTMLElement>('targetBar')
    if (bar) bar.style.width = `${Math.min(100, (h.score / h.target) * 100)}%`
    const set = (id: string, v: number) => {
      const el = q<HTMLElement>(id)
      if (el) el.textContent = String(v)
    }
    set('bc-hammer', h.boosters.hammer)
    set('bc-moves', h.boosters.moves)
    set('bc-shuffle', h.boosters.shuffle)
  }

  toast(html: string, kind: 'info' | 'warn' | 'good' = 'info') {
    let wrap = this.root.querySelector('.toasts')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'toasts'
      this.root.appendChild(wrap)
    }
    const t = document.createElement('div')
    t.className = `toast ${kind}`
    t.innerHTML = html
    wrap.appendChild(t)
    window.setTimeout(() => t.classList.add('hide'), 2400)
    window.setTimeout(() => t.remove(), 2900)
  }

  achievementToast(icon: string, name: string) {
    this.toast(`<b>${icon} ¡Logro! ${name}</b><div class="small">+monedas desbloqueadas</div>`, 'good')
  }

  private modal(html: string, onMount?: (r: HTMLElement) => void) {
    const mask = document.createElement('div')
    mask.className = 'modal-mask'
    mask.innerHTML = `<div class="modal">${html}</div>`
    mask.addEventListener('click', (e) => {
      if (e.target === mask) mask.remove()
    })
    this.root.appendChild(mask)
    if (onMount) onMount(mask)
  }

  confirm(msg: string, yes: () => void, btnText = 'Aceptar') {
    this.modal(`
      <h3>${msg}</h3>
      <div class="modal-btns">
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn danger" id="yBtn">${btnText}</button>
      </div>
    `, (r) => {
      r.querySelector('[data-close]')!.addEventListener('click', () => r.remove())
      r.querySelector('#yBtn')!.addEventListener('click', () => {
        r.remove()
        yes()
      })
    })
  }

  pauseMenu() {
    this.modal(`
      <div class="pause-menu">
        <h2>⏸ Pausa</h2>
        <button class="btn big-m" data-action="resume">▶ Continuar</button>
        <button class="btn big-m" data-action="restart">🔄 Reiniciar</button>
        <button class="btn big-m" data-action="menu">🏠 Menú</button>
      </div>
    `, (r) => {
      r.querySelectorAll('[data-action]').forEach((el) => {
        el.addEventListener('click', () => {
          r.remove()
          this.hooks.onGameNav((el as HTMLElement).dataset.action! as 'resume' | 'restart' | 'menu')
        })
      })
    })
  }

  showResult(res: ResultInfo) {
    const starHtml =
      res.won
        ? '⭐'.repeat(res.stars) + '<span class="dim">' + '·'.repeat(Math.max(0, 3 - res.stars)) + '</span>'
        : '💔'
    const newLevelInfo =
      res.won
        ? res.newLevel != null
          ? `<div class="res-new">🔓 ¡Nivel ${res.newLevel} desbloqueado!</div>`
          : `<div class="res-new dim">🏁 Has llegado al último nivel</div>`
        : ''
    this.modal(`
      <div class="result ${res.won ? 'won' : 'lose'}">
        <div class="res-title">${res.won ? '🎉 ¡Nivel superado!' : '😢 Sin movimientos'}</div>
        <div class="res-stars">${starHtml}</div>
        <div class="res-score">${res.score.toLocaleString()} <span class="dim">de ${res.target.toLocaleString()}</span></div>
        ${res.won ? `<div class="res-coins">+${res.coins} ${COIN_SVG}${res.firstClear ? '<div class="small dim">incluye bonus por primera vez</div>' : ''}</div>` : `<div class="res-coins dim">Inténtalo de nuevo, ¡tú puedes!</div>`}
        ${newLevelInfo}
        <div class="modal-btns">
          <button class="btn ghost" data-close>✖ Cerrar</button>
          ${res.won ? `<button class="btn primary" data-next>➜ Siguiente nivel</button>` : `<button class="btn primary" data-next>🔄 Reintentar</button>`}
        </div>
      </div>
    `, (r) => {
      r.querySelector('[data-close]')!.addEventListener('click', () => {
        r.remove()
        this.hooks.onBackToMenu()
      })
      const next = r.querySelector('[data-next]')
      if (next) next.addEventListener('click', () => {
        r.remove()
        if (res.won) {
          if (res.newLevel != null) this.hooks.onGoLevel(res.newLevel)
          else this.hooks.onBackToMenu()
        } else {
          this.hooks.onRetry()
        }
      })
    })
  }
}