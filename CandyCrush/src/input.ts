import type { Pos } from './types'
import { COLS, ROWS } from './engine/candies'

export interface BoardInput {
  dispose(): void
}

export function hookBoardInput(
  canvas: HTMLCanvasElement,
  onSwap: (a: Pos, b: Pos) => void,
  onFirstTouch: () => void,
  onTap?: (p: Pos) => void,
): BoardInput {
  let down = false
  let sx = 0
  let sy = 0
  let startColumn = -1
  let startRow = -1

  const cellFrom = (x: number, y: number): Pos => {
    const rect = canvas.getBoundingClientRect()
    const r = Math.floor(((y - rect.top) / rect.height) * ROWS)
    const c = Math.floor(((x - rect.left) / rect.width) * COLS)
    return { r, c }
  }

  const downHandler = (e: PointerEvent) => {
    onFirstTouch()
    down = true
    sx = e.clientX
    sy = e.clientY
    const p = cellFrom(sx, sy)
    startRow = p.r
    startColumn = p.c
    e.preventDefault()
  }

  const moveHandler = (e: PointerEvent) => {
    if (!down) return
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return
    let br = startRow
    let bc = startColumn
    if (Math.abs(dx) > Math.abs(dy)) bc += dx > 0 ? 1 : -1
    else br += dy > 0 ? 1 : -1
    if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
      down = false
      onSwap({ r: startRow, c: startColumn }, { r: br, c: bc })
    }
  }

  const upHandler = () => {
    if (down && onTap) onTap({ r: startRow, c: startColumn })
    down = false
  }

  canvas.addEventListener('pointerdown', downHandler)
  canvas.addEventListener('pointermove', moveHandler)
  canvas.addEventListener('pointerup', upHandler)
  canvas.addEventListener('pointerleave', upHandler)

  return {
    dispose() {
      canvas.removeEventListener('pointerdown', downHandler)
      canvas.removeEventListener('pointermove', moveHandler)
      canvas.removeEventListener('pointerup', upHandler)
      canvas.removeEventListener('pointerleave', upHandler)
    },
  }
}