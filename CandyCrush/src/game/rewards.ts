export interface BoosterDef {
  id: 'hammer' | 'moves' | 'shuffle'
  name: string
  desc: string
  icon: string
  cost: number
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'hammer', name: 'Martillo', desc: 'Elimina un dulce', icon: '🔨', cost: 80 },
  { id: 'moves', name: '+3 Movimientos', desc: 'Añade 3 movimientos', icon: '⏱️', cost: 100 },
  { id: 'shuffle', name: 'Barajar', desc: 'Reordena el tablero', icon: '🔀', cost: 60 },
]

export const BOOSTER_BY_ID = Object.fromEntries(BOOSTERS.map((b) => [b.id, b])) as Record<
  BoosterDef['id'],
  BoosterDef
>

export interface Boosters {
  hammer: number
  moves: number
  shuffle: number
}

export const STAR_COINS = [30, 50, 70]
export const FIRST_CLEAR_BONUS = 50

export function levelReward(stars: number, firstClear: boolean): number {
  const coins = STAR_COINS[Math.max(0, Math.min(2, stars - 1))] ?? 30
  return coins + (firstClear ? FIRST_CLEAR_BONUS : 0)
}