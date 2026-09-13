import { createGrid, findMatches, computeClearSet, applyGravity, hasValidMove, shuffleGrid } from '../src/engine/board'
import type { Pos } from '../src/types'
import { COLS, ROWS } from '../src/engine/candies'
import { levelDef, starsFor, LEVEL_COUNT } from '../src/game/levels'

let fails = 0
const check = (cond: boolean, msg: string, seed?: number) => {
  if (!cond) {
    fails++
    console.log('FAIL', msg, seed !== undefined ? `seed=${seed}` : '')
  }
}

function cascadeToStable(g: (typeof createGrid extends (c: number) => infer R ? R : never)) {
  let guard = 0
  const createdCounts = { bomb: 0, wr: 0, sth: 0, stv: 0 }
  while (findMatches(g).length) {
    if (guard++ > 50) return { createdCounts, loop: true }
    const matches = findMatches(g)
    const calc = computeClearSet(g, matches)
    for (const cr of calc.created) {
      if (cr.special === 'bomb') createdCounts.bomb++
      else if (cr.special === 'wr') createdCounts.wr++
      else if (cr.special === 'stv' || cr.special === 'sth') createdCounts.sth++
    }
    const createdK = new Set(calc.created.map((c) => `${c.pos.r}:${c.pos.c}`))
    for (const p of calc.clears) {
      if (!createdK.has(`${p.r}:${p.c}`)) g[p.r][p.c] = null
    }
    for (const cr of calc.created) {
      const cell = g[cr.pos.r][cr.pos.c]
      if (cell) {
        cell.special = cr.special
        if (cr.special === 'bomb') cell.id = -1
      }
    }
    applyGravity(g, 5)
  }
  return { createdCounts, loop: false }
}

for (let seed = 0; seed < 400; seed++) {
  const g = createGrid(5)
  check(findMatches(g).length === 0, 'board has matches at start', seed)
  check(g.every((row) => row.every((c) => c !== null)), 'null cell at start', seed)
  check(hasValidMove(g), 'no valid move at start', seed)
  const { loop } = cascadeToStable(g)
  check(!loop, 'cascade did not terminate', seed)
  check(g.every((row) => row.every((c) => c !== null)), 'null cell after cascade', seed)
  check(findMatches(g).length === 0, 'matches remain after cascade', seed)
}

// shuffle produces a playable board
for (let seed = 0; seed < 100; seed++) {
  const g = createGrid(6)
  cascadeToStable(g)
  const ok = shuffleGrid(g, 6)
  check(ok, 'shuffle could not fix board', seed)
  check(findMatches(g).length === 0, 'shuffle left matches', seed)
  check(hasValidMove(g), 'shuffle board has no moves', seed)
}

// random swap stress (no crash / no null cells / cascades terminate)
{
  const g = createGrid(4)
  for (let i = 0; i < 300; i++) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    const dir = Math.random() > 0.5
    const r2 = dir ? Math.min(ROWS - 1, r + 1) : r
    const c2 = dir ? c : Math.min(COLS - 1, c + 1)
    const t = g[r][c]
    g[r][c] = g[r2][c2]
    g[r2][c2] = t
    if (findMatches(g).length) {
      const res = cascadeToStable(g)
      check(!res.loop, 'swap cascade loop', i)
    } else {
      const t2 = g[r][c]
      g[r][c] = g[r2][c2]
      g[r2][c2] = t2
    }
    check(g.every((row) => row.every((cell) => cell !== null)), 'null after swap', i)
  }
}

// levels curve sanity
for (let n = 1; n <= LEVEL_COUNT; n++) {
  const d = levelDef(n)
  check(d.moves > 0 && d.target > 0 && d.colors >= 4 && d.colors <= 6, `level ${n} invalid`, n)
  check(d.star3 > d.star2 && d.star2 > d.target, `level ${n} star thresholds broken`, n)
}
const s1 = starsFor(1, levelDef(1).target)
const s3 = starsFor(1, levelDef(1).star3)
check(s1 === 1, 'starsFor low broken', s1)
check(s3 === 3, 'starsFor high broken', s3)

// targeted: special creation from 4-in-row, 5-in-row and L/T shapes
{
  // pattern fill avoids accidental 3-in-a-row
  const mk = () =>
    Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({ id: (r + c) % 2 === 0 ? 4 : 5, special: 'none' as 'none' })),
    )
  // 4 in a row -> striped
  const g4 = mk()
  g4[3][1] = { id: 1, special: 'none' }
  g4[3][2] = { id: 1, special: 'none' }
  g4[3][3] = { id: 1, special: 'none' }
  g4[3][4] = { id: 1, special: 'none' }
  const calc4 = computeClearSet(g4, findMatches(g4))
  check(calc4.created.length === 1 && (calc4.created[0].special === 'stv' || calc4.created[0].special === 'sth'), '4-row did not create striped', JSON.stringify(calc4.created))

  // 5 in a row -> bomb
  const g5 = mk()
  for (let c = 1; c <= 5; c++) g5[2]![c] = { id: 2, special: 'none' }
  const calc5 = computeClearSet(g5, findMatches(g5))
  check(calc5.created.length === 1 && calc5.created[0].special === 'bomb', '5-row did not create bomb', JSON.stringify(calc5.created))

  // L shape -> wrapped
  const gL = mk()
  for (let c = 1; c <= 3; c++) gL[2]![c] = { id: 3, special: 'none' } // horizontal arm
  gL[3]![1] = { id: 3, special: 'none' }
  gL[4]![1] = { id: 3, special: 'none' } // vertical arm sharing (2,1)
  const calcL = computeClearSet(gL, findMatches(gL))
  check(calcL.created.some((c) => c.special === 'wr'), 'L-shape did not create wrapped', JSON.stringify(calcL.created))

  // matched special triggers a line clear
  const gs = mk()
  const target: Pos = { r: 4, c: 3 }
  gs[4]![3] = { id: 0, special: 'stv' }
  gs[4]![4] = { id: 0, special: 'none' }
  gs[4]![5] = { id: 0, special: 'none' }
  const calcs = computeClearSet(gs, findMatches(gs))
  const clearsCol = calcs.clears.filter((p) => p.c === target.c)
  check(calcs.blastKinds.some((b) => b.blastKind === 'stv'), 'striped was not triggered', JSON.stringify(calcs.blastKinds))
  check(clearsCol.length >= ROWS - 1, 'stv did not clear its column', String(clearsCol.length))
}

console.log('ROWS', ROWS, 'COLS', COLS)
console.log(fails === 0 ? 'ALL TESTS PASSED' : `FAILURES: ${fails}`)
process.exit(fails === 0 ? 0 : 1)