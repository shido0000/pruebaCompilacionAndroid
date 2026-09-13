import { createGrid, findMatches, computeClearSet, applyGravity } from '../src/engine/board'
import { ROWS, COLS } from '../src/engine/candies'
import type { Cell, Grid } from '../src/types'

function cell(id: number, special: Cell['special'] = 'none'): Cell {
  return { id, special }
}
function empty(): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null) as (Cell | null)[])
}
function key(p: { r: number; c: number }) { return p.r + ':' + p.c }

// Simulate the exact live loop: matches->calc->mutate created->clear->gravity->repeat
function cascadeSim(grid: Grid, label: string) {
  let total = 0
  let iter = 0
  const perIter: number[] = []
  for (;;) {
    if (iter++ > 50) break
    const matches = findMatches(grid)
    if (matches.length === 0) break
    const calc = computeClearSet(grid, matches)
    const createdKeys = new Set(calc.created.map((cr) => key(cr.pos)))
    const createdBy: Record<string, number> = {}
    for (const cr of calc.created) {
      const c2 = grid[cr.pos.r]?.[cr.pos.c]
      if (c2) createdBy[key(cr.pos)] = c2.id
    }
    for (const cr of calc.created) {
      const c2 = grid[cr.pos.r]?.[cr.pos.c]
      if (c2) {
        const prevId = createdBy[key(cr.pos)] ?? c2.id
        c2.id = cr.special === 'bomb' ? -1 : prevId
        c2.special = cr.special
      }
    }
    const green = calc.clears.filter((p) => !createdKeys.has(key(p)))
    for (const p of green) grid[p.r][p.c] = null
    total += green.length
    perIter.push(green.length)
    applyGravity(grid, 6)
  }
  console.log(label, '=> cascades:', perIter.join('+'), 'total cells cleared:', total)
  return total
}

// Scenario A: single 4-horizontal match on an otherwise clean board (no other matches)
const gA = empty()
for (let c = 0; c < 8; c++) {
  if (c < 4) gA[3][c] = cell(0)
  else gA[3][c] = cell(1)
  for (let r = 0; r < 8 - 1; r++) {
    const p = r === 3 ? null : r === 3 && c >= 4 ? null : null
    void p
    if (r === 3) continue
    gA[r][c] = cell((2 + (r + c) % 4) % 6 + 1)
  }
}
// make top rows so gravity doesn't accidentally match (crude but ok)
cascadeSim(gA, 'A: 4-match')

// Scenario B: 4-match creating striped, next row happens to complete that color (common)
const gB = empty()
for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) gB[r][c] = cell(r % 6)
gB[7][0] = cell(0); gB[7][1] = cell(1); gB[7][2] = cell(2)
gB[7][3] = cell(2); gB[7][4] = cell(2); gB[7][5] = cell(2); gB[7][6] = cell(2); gB[7][7] = cell(4)
// force a 4-run vertically column 2 rows 4-7? fallback approximate
cascadeSim(gB, 'B: structural (may cascade)')

// Scenario C: matches pre-seeded with specials: 3-run including a striped -> whole row
const gC = empty()
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) gC[r][c] = cell(3)
gC[4][2] = cell(0); gC[4][3] = cell(0); gC[4][4] = cell(0, 'sth')
cascadeSim(gC, 'C: 3-run with striped')

// Scenario D: clean random board: what's a typical cascade?
let acc = 0
const n = 40
for (let i = 0; i < n; i++) {
  const g = createGrid(4)
  // force a single valid swap that makes a 3-match elsewhere: approximate by direct 3 in a row
  const a = Math.floor(Math.random() * ROOT8)
  const b = Math.floor(Math.random() * ROOT8)
  void a; void b
  acc += cascadeSim(g, `D${i}: random(#${i})`) / (i === 0 ? 1 : 1)
}
console.log('avg random board initial cascades total /', n, '=', +(acc / n).toFixed(1))