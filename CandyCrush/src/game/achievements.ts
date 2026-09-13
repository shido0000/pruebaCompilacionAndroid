import type { SaveData, Stats } from './save'

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  coins: number
  test: (s: Stats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_match', name: 'Primer Match', desc: 'Consigue tu primer match', icon: '🍬', coins: 30, test: (s) => s.matches >= 1 },
  { id: 'match_50', name: 'Máquina de Combos', desc: '50 matches', icon: '💫', coins: 80, test: (s) => s.matches >= 50 },
  { id: 'match_200', name: 'Frenesí de Dulces', desc: '200 matches', icon: '🌪️', coins: 150, test: (s) => s.matches >= 200 },
  { id: 'cascade3', name: 'Cascada', desc: 'Cascada de 3 niveles', icon: '💧', coins: 60, test: (s) => s.maxCascade >= 3 },
  { id: 'cascade5', name: 'Cascada Épica', desc: 'Cascada de 5 niveles', icon: '🌊', coins: 120, test: (s) => s.maxCascade >= 5 },
  { id: 'bomb_create', name: 'Dulce Explosivo', desc: 'Crea un color bomb', icon: '💣', coins: 100, test: (s) => s.bombCreated >= 1 },
  { id: 'bomb_use', name: '¡Booom!', desc: 'Activa un color bomb', icon: '🎆', coins: 80, test: (s) => s.bombUsed >= 1 },
  { id: 'striped_create', name: 'Rayados', desc: 'Crea 5 candies rayados', icon: '🍭', coins: 90, test: (s) => s.stripedCreated >= 5 },
  { id: 'wrapped_create', name: 'Envueltos', desc: 'Crea 5 candies envueltos', icon: '🍬', coins: 90, test: (s) => s.wrappedCreated >= 5 },
  { id: 'win1', name: 'Primera Victoria', desc: 'Supera tu primer nivel', icon: '🏆', coins: 50, test: (s) => s.winCount >= 1 },
  { id: 'win10', name: 'Diez Victorias', desc: 'Supera 10 niveles', icon: '🥇', coins: 130, test: (s) => s.winCount >= 10 },
  { id: 'win25', name: 'Veterano', desc: 'Supera 25 niveles', icon: '👑', coins: 220, test: (s) => s.winCount >= 25 },
  { id: 'star3_3', name: 'Casi Perfecto', desc: '3 estrellas en 3 niveles', icon: '⭐', coins: 120, test: (s) => s.threeStarsCount >= 3 },
  { id: 'star3_10', name: 'Maestro Estelar', desc: '3 estrellas en 10 niveles', icon: '🌟', coins: 250, test: (s) => s.threeStarsCount >= 10 },
  { id: 'score_100k', name: 'Puntuación Brutal', desc: 'Acumula 100.000 puntos', icon: '📊', coins: 200, test: (s) => s.totalScore >= 100000 },
  { id: 'rich', name: 'Rico en Dulces', desc: 'Acumula 2.000 monedas', icon: '💰', coins: 60, test: (s) => s.coinsEarned >= 2000 },
  { id: 'shopper', name: 'Comprador Compulsivo', desc: 'Gasta 1.000 monedas', icon: '🛒', coins: 100, test: (s) => s.coinsSpent >= 1000 },
  { id: 'hammer_master', name: 'Martillazos', desc: 'Usa el martillo 25 veces', icon: '🔨', coins: 80, test: (s) => s.hammerUsed >= 25 },
]

/**
 * Runs the achievement check against current stats. Returns the newly unlocked
 * achievements and pays their coin rewards into the save.
 */
export function checkAchievements(save: SaveData): AchievementDef[] {
  const fresh: AchievementDef[] = []
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue
    if (a.test(save.stats)) {
      save.achievements[a.id] = Date.now()
      save.coins += a.coins
      save.stats.coinsEarned += a.coins
      fresh.push(a)
    }
  }
  return fresh
}