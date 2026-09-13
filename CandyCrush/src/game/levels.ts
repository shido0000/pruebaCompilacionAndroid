export interface LevelDef {
  n: number
  moves: number
  target: number
  colors: number
  star2: number
  star3: number
}

export const LEVEL_COUNT = 60

export function levelDef(n: number): LevelDef {
  const i = n - 1
  const colors = n <= 8 ? 4 : n <= 22 ? 5 : 6
  const moves = 20 + Math.floor(i * 0.55)
  const target = 900 + Math.round(i * 82 * (colors / 5))
  return {
    n,
    moves,
    target,
    colors,
    star2: Math.round(target * 1.5),
    star3: Math.round(target * 2.25),
  }
}

export function starsFor(level: number, score: number): number {
  const d = levelDef(level)
  if (score >= d.star3) return 3
  if (score >= d.star2) return 2
  return 1
}