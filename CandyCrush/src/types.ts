export type Special = 'none' | 'sth' | 'stv' | 'wr' | 'bomb'

export interface Cell {
  id: number
  special: Special
}

export interface Pos {
  r: number
  c: number
}

export type Grid = (Cell | null)[][]

export interface MatchGroup {
  cells: Pos[]
  color: number
  line: 'h' | 'v'
}

export interface BlastResult {
  clears: Pos[]
  blastKind: 'match' | 'sth' | 'stv' | 'wr' | 'bomb'
}

export interface CascadeStep {
  cleared: Pos[]
  created: { pos: Pos; special: Special }[]
  score: number
  cascade: number
  combos: number
}

export interface SwapOutcome {
  ok: boolean
  steps: CascadeStep[]
  totalScore: number
}