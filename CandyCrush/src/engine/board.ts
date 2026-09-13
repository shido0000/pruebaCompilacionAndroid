import type { BlastResult, Cell, Grid, MatchGroup, Pos, Special } from '../types'
import { COLS, ROWS } from './candies'

export const key = (p: Pos): string => `${p.r}:${p.c}`
export const parseKey = (k: string): Pos => {
  const [r, c] = k.split(':')
  return { r: +r, c: +c }
}

export const newCell = (colors: number, special: Special = 'none', id: number = -1): Cell => {
  const t = id >= 0 ? id : Math.floor(Math.random() * colors)
  return { id: t, special }
}

export function createGrid(colors: number): Grid {
  const grid: Grid = []
  for (let r = 0; r < ROWS; r++) {
    const row: (Cell | null)[] = []
    for (let c = 0; c < COLS; c++) {
      const used = new Set<number>()
      if (c >= 2 && row[c - 1]!.id === row[c - 2]!.id) used.add(row[c - 1]!.id)
      if (r >= 2 && grid[r - 1][c]!.id === grid[r - 2][c]!.id) used.add(grid[r - 1][c]!.id)
      let t = Math.floor(Math.random() * colors)
      let guard = 0
      while (used.has(t) && guard++ < 20) t = Math.floor(Math.random() * colors)
      row.push({ id: t, special: 'none' })
    }
    grid.push(row)
  }
  return grid
}

export function inBounds(p: Pos): boolean {
  return p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS
}

export function findMatches(grid: Grid): MatchGroup[] {
  const groups: MatchGroup[] = []
  for (let r = 0; r < ROWS; r++) {
    let c = 0
    while (c < COLS) {
      const cell = grid[r][c]
      if (cell && cell.id >= 0) {
        let c2 = c + 1
        while (c2 < COLS && grid[r][c2] && grid[r][c2]!.id === cell.id) c2++
        if (c2 - c >= 3) {
          const cells: Pos[] = []
          for (let x = c; x < c2; x++) cells.push({ r, c: x })
          groups.push({ cells, color: cell.id, line: 'h' })
        }
        c = c2
      } else c++
    }
  }
  for (let c = 0; c < COLS; c++) {
    let r = 0
    while (r < ROWS) {
      const cell = grid[r][c]
      if (cell && cell.id >= 0) {
        let r2 = r + 1
        while (r2 < ROWS && grid[r2][c] && grid[r2][c]!.id === cell.id) r2++
        if (r2 - r >= 3) {
          const cells: Pos[] = []
          for (let y = r; y < r2; y++) cells.push({ r: y, c })
          groups.push({ cells, color: cell.id, line: 'v' })
        }
        r = r2
      } else r++
    }
  }
  return groups
}

function blastOf(grid: Grid, p: Pos, kind: Special): Pos[] {
  const out: Pos[] = []
  const cell = grid[p.r][p.c]
  if (!cell) return out
  switch (kind) {
    case 'sth':
      for (let c = 0; c < COLS; c++) out.push({ r: p.r, c })
      break
    case 'stv':
      for (let r = 0; r < ROWS; r++) out.push({ r, c: p.c })
      break
    case 'wr': {
      for (let r = p.r - 1; r <= p.r + 1; r++)
        for (let c = p.c - 1; c <= p.c + 1; c++) if (inBounds({ r, c })) out.push({ r, c })
      break
    }
    case 'bomb':
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cc = grid[r][c]
          if (cc && cc.id === cell.id) out.push({ r, c })
        }
      break
    default:
      break
  }
  return out
}

export interface ClearCalc {
  clears: Pos[]
  created: { pos: Pos; special: Special }[]
  blastKinds: BlastResult[]
  specialCounts: Record<'sth' | 'stv' | 'wr' | 'bomb', number>
}

function addCell(set: Set<string>, p: Pos) {
  set.add(key(p))
}

export function computeClearSet(grid: Grid, matches: MatchGroup[]): ClearCalc {
  const clears = new Set<string>()
  const anchors = new Map<string, { pos: Pos; special: Special; prio: number }>()
  const blastKinds: BlastResult[] = []
  const specialCounts: ClearCalc['specialCounts'] = { sth: 0, stv: 0, wr: 0, bomb: 0 }

  // Which cells are matched AND were already specials (they explode too, consumed)
  const matchedSpecials: Pos[] = []

  for (const m of matches) {
    for (const p of m.cells) {
      addCell(clears, p)
      const g = grid[p.r][p.c]
      if (g && g.special !== 'none') matchedSpecials.push(p)
    }
  }

  const hCells = new Set<string>()
  const vCells = new Set<string>()
  for (const m of matches) {
    const set = m.line === 'h' ? hCells : vCells
    for (const p of m.cells) set.add(key(p))
  }
  for (const k of hCells) {
    if (vCells.has(k)) {
      const p = parseKey(k)
      const cur = anchors.get(k)
      const cand = { pos: p, special: 'wr' as Special, prio: 2 }
      if (!cur || cur.prio < cand.prio) anchors.set(k, cand)
    }
  }

  // Run anchors (4 -> striped, 5+ -> bomb)
  for (const m of matches) {
    if (m.cells.some((p) => hCells.has(key(p)) && vCells.has(key(p)))) {
      // Already handled as wrapped crossing
      continue
    }
    if (m.cells.length >= 5) {
      const anchor = m.cells[Math.floor(m.cells.length / 2)]
      anchors.set(key(anchor), { pos: anchor, special: 'bomb', prio: 3 })
    } else if (m.cells.length === 4) {
      const anchor = m.cells[Math.floor(m.cells.length / 2)]
      const special: Special = m.line === 'h' ? 'stv' : 'sth'
      const cand = { pos: anchor, special, prio: 1 }
      const cur = anchors.get(key(anchor))
      if (!cur || cur.prio <= cand.prio) anchors.set(key(anchor), cand)
    }
  }

  // Chain-reaction of matched specials on the PRE-swap grid
  const chainQueue = [...matchedSpecials]
  const chained = new Set<string>()
  const blastCells = new Set<string>()
  while (chainQueue.length) {
    const p = chainQueue.pop()!
    const g = grid[p.r][p.c]
    if (!g || chained.has(key(p))) continue
    chained.add(key(p))
    const kind = g.special as 'sth' | 'stv' | 'wr' | 'bomb'
    if (kind === 'sth' || kind === 'stv' || kind === 'wr' || kind === 'bomb') specialCounts[kind] += 1
    const bl = blastOf(grid, p, g.special)
    blastKinds.push({ clears: bl, blastKind: kind })
    for (const bp of bl) {
      blastCells.add(key(bp))
      if (!clears.has(key(bp))) addCell(clears, bp)
      const bg = grid[bp.r][bp.c]
      if (bg && bg.special !== 'none') chainQueue.push(bp)
    }
  }

  const created: { pos: Pos; special: Special }[] = []
  for (const [, a] of anchors) {
    // Matched spec anchors and anchors caught in a blast are consumed, no creation
    const onCell = grid[a.pos.r][a.pos.c]
    if (onCell && onCell.special !== 'none') continue
    if (blastCells.has(key(a.pos))) continue
    clears.delete(key(a.pos))
    created.push({ pos: a.pos, special: a.special })
  }

  return { clears: [...clears].map(parseKey), created, blastKinds, specialCounts }
}

export function swapCells(grid: Grid, a: Pos, b: Pos) {
  const t = grid[a.r][a.c]
  grid[a.r][a.c] = grid[b.r][b.c]
  grid[b.r][b.c] = t
}

export interface FallResult {
  moves: { cell: Cell; from: Pos; to: Pos }[]
  spawned: { cell: Cell; to: Pos }[]
}

export function applyGravity(grid: Grid, colors: number): FallResult {
  const moves: FallResult['moves'] = []
  const spawned: FallResult['spawned'] = []
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1
    for (let r = ROWS - 1; r >= 0; r--) {
      const cell = grid[r][c]
      if (cell) {
        if (write !== r) {
          moves.push({ cell, from: { r, c }, to: { r: write, c } })
          grid[r][c] = null
          grid[write][c] = cell
        }
        write--
      }
    }
    for (let rr = write; rr >= 0; rr--) {
      const cell = newCell(colors)
      grid[rr][c] = cell
      spawned.push({ cell, to: { r: rr, c } })
    }
  }
  return { moves, spawned }
}

export function hasValidMove(grid: Grid): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = { r, c }
      const right = { r, c: c + 1 }
      const down = { r: r + 1, c }
      if (c + 1 < COLS && swapCreatesMatch(grid, p, right)) return true
      if (r + 1 < ROWS && swapCreatesMatch(grid, p, down)) return true
    }
  }
  return false
}

export function swapCreatesMatch(grid: Grid, a: Pos, b: Pos): boolean {
  const g: Grid = grid.map((row) => [...row])
  swapCells(g, a, b)
  return findMatches(g).length > 0
}

export function shuffleGrid(grid: Grid, colors: number): boolean {
  let guard = 0
  while (guard++ < 200) {
    const flat: Cell[] = []
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c]
        if (cell) cell.id = Math.floor(Math.random() * colors)
        if (cell) flat.push(cell)
      }
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = flat[i]
      flat[i] = flat[j]
      flat[j] = t
    }
    if (findMatches(grid).length === 0 && hasValidMove(grid)) return true
  }
  return false
}

export const ADJ = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
]