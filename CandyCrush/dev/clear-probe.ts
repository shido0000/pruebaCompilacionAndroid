import { createGrid, findMatches, computeClearSet, swapCells, key } from '../src/engine/board'
import { ROWS, COLS } from '../src/engine/candies'
import type { Cell, Grid } from '../src/types'

function cell(id: number, special: Cell['special'] = 'none'): Cell {
  return { id, special }
}
function empty(): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null) as (Cell | null)[])
}
function show(clears: { r: number; c: number }[]) {
  return clears.map((p) => `${p.r}:${p.c}`).join(',')
}
function gridStr(g: Grid) {
  return g
    .map((row) =>
      row
        .map((c) => (c ? (c.special !== 'none' ? c.special.toUpperCase() : String(c.id)) : '.'))
        .join(' ')
    )
    .join('\n')
}

const g = empty()
// row 3: 4-match red horizontally   red red red red . . . .
for (let c = 0; c < 4; c++) g[3][c] = cell(0)
for (let c = 4; c < COLS; c++) g[3][c] = cell(1)
// row 5: pre-existing horizontal stripe (sth) of red at (5,2)
g[5][2] = cell(0, 'sth')
for (let c = 3; c < COLS; c++) g[5][c] = cell(1)
g[5][0] = cell(2); g[5][1] = cell(2)
// row 6: wrapped red at (6,1) with nothing else
g[6][1] = cell(0, 'wr')
for (let c = 0; c < COLS; c++) if (c !== 1 && !g[6][c]) g[6][c] = cell(3)

console.log('== board (4-match at row3 0..3, sth at 5:2, wr at 6:1) ==')
console.log(gridStr(g))
const m = findMatches(g)
console.log('matches:', JSON.stringify(m.map((x) => ({ line: x.line, cells: x.cells.map(key) }))))
const calc = computeClearSet(g, m)
console.log('clears:', show(calc.clears))
console.log('created:', calc.created.map((c) => key(c.pos) + ':' + c.special))
console.log('blastKinds:', JSON.stringify(calc.blastKinds.map((b) => ({ kind: b.blastKind, n: b.clears.length }))))

// isolated 3-match only
const g2 = empty()
g2[2][0] = cell(0); g2[2][1] = cell(0); g2[2][2] = cell(0)
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!g2[r][c]) g2[r][c] = cell(4)
console.log('\n== isolated 3-match ==')
console.log(gridStr(g2))
const m2 = findMatches(g2)
console.log('matches:', m2.length, 'clears:', show(computeClearSet(g2, m2).clears))

// swap creates 4-match: swap creates striped that should NOT blast immediately
const g3 = empty()
// make a vertical 4-run of color 0 in column 4 rows 1-4
g3[1][4] = cell(0); g3[2][4] = cell(0); g3[3][4] = cell(0); g3[4][4] = cell(0)
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!g3[r][c]) g3[r][c] = cell(5)
// swap a non-matching pair: (3,4)<->(3,3) must break the 4-run (makes 3-run rows distinct)
swapCells(g3, { r: 3, c: 4 }, { r: 3, c: 3 })
console.log('\n== after swap (vertical 4-run broken to test swap validity) ==')
console.log(gridStr(g3))
const m3 = findMatches(g3)
console.log('matches after swap:', m3.length, 'clears:', show(computeClearSet(g3, m3).clears))