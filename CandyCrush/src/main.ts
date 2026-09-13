import './style.css'
import type { UserSettings } from './game/save'
import { loadSave, persistSave, resetSave } from './game/save'
import { UI } from './ui/screens'
import { COIN_SVG } from './ui/screens'
import { Session } from './game/session'
import { hookBoardInput } from './input'
import { audio } from './audio'
import { BOOSTER_BY_ID } from './game/rewards'
import type { LevelDef } from './game/levels'
import { levelDef } from './game/levels'
import type { Pos } from './types'
import type { BoardInput } from './input'

const root = document.querySelector<HTMLDivElement>('#app')!
let save = loadSave()
audio.soundOn = save.user.sound
audio.setMusic(save.user.music)
if (save.user.music) audio.startMusic()

let currentLevel = 1
let session: Session | null = null
let inputDispose: BoardInput | null = null

function unlockAudio() {
  audio.unlock()
  if (save.user.music) audio.startMusic()
  window.removeEventListener('pointerdown', unlockAudio)
  window.removeEventListener('touchend', unlockAudio)
}
window.addEventListener('pointerdown', unlockAudio)
window.addEventListener('touchend', unlockAudio)

const ui = new UI(root, save, {
  onPlay: (level) => startGame(Math.min(level, levelDef(level).n)),
  onGoLevel: (level) => startGame(level),
  onBackToMenu: () => {
    teardownGame()
    ui.syncSave(save)
    ui.home()
  },
  onUpdateUser: (u: UserSettings) => {
    save.user = u
    audio.soundOn = u.sound
    audio.setMusic(u.music)
    persistSave(save)
    ui.syncSave(save)
  },
  onResetProgress: () => {
    save = resetSave()
    audio.stopMusic()
    ui.syncSave(save)
    ui.home()
  },
  onBuyBooster: (id) => {
    const def = BOOSTER_BY_ID[id]
    if (save.coins < def.cost) {
      ui.toast(`No tienes suficientes monedas ${COIN_SVG}`, 'warn')
      return
    }
    save.coins -= def.cost
    save.boosters[id]++
    save.stats.coinsSpent += def.cost
    persistSave(save)
    audio.coin()
    ui.syncSave(save)
    ui.shop()
    ui.toast(`Compraste <b>${def.name}</b> por ${def.cost} ${COIN_SVG}`, 'good')
  },
  onRetry: () => startGame(currentLevel),
  onGameNav: (action) => {
    if (action === 'resume') return
    if (action === 'menu') {
      teardownGame()
      ui.syncSave(save)
      ui.home()
      return
    }
    startGame(currentLevel)
  },
})
ui.render()

function teardownGame() {
  if (session) {
    session.dispose()
    session = null
  }
  ;(window as unknown as { __session?: unknown }).__session = undefined
  if (inputDispose) {
    inputDispose.dispose()
    inputDispose = null
  }
}

function startGame(level: number) {
  currentLevel = level
  teardownGame()
  const def: LevelDef = levelDef(level)
  void def
  ui.syncSave(save)
  const canvas = ui.gameScreen(level)
  session = new Session(canvas, ui, save)
  session.start(level)
  inputDispose = hookBoardInput(
    canvas,
    (a: Pos, b: Pos) => session!.onBoardTap(a, b),
    () => {
      if (!save.user.music) return
      audio.startMusic()
    },
    (p: Pos) => session!.onTap(p),
  )
}

window.addEventListener('resize', () => {
  if (session) session.resize()
})
window.addEventListener('orientationchange', () => {
  setTimeout(() => session?.resize(), 300)
})

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}