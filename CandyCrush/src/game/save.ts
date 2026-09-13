export interface UserSettings {
  name: string
  avatar: string
  avatarColor: string
  sound: boolean
  music: boolean
  anim: boolean
  haptics: boolean
}

export interface Stats {
  matches: number
  maxCascade: number
  winCount: number
  threeStarsCount: number
  bombCreated: number
  bombUsed: number
  stripedCreated: number
  wrappedCreated: number
  totalScore: number
  coinsEarned: number
  coinsSpent: number
  hammerUsed: number
  shuffleUsed: number
  bonusMovesUsed: number
}

export interface SaveData {
  v: number
  user: UserSettings
  unlocked: number
  stars: Record<number, number>
  bestScore: Record<number, number>
  coins: number
  boosters: { hammer: number; moves: number; shuffle: number }
  achievements: Record<string, number>
  stats: Stats
  seenTutorial: boolean
  lastPlayed: number
}

export const AVATARS = ['🐼', '🦄', '🐸', '🐱', '🐶', '🦊', '🐯', '🐹', '🐰', '🐨']
export const AVATAR_COLORS = ['#ff4d5e', '#ffa02e', '#34d17b', '#4d9bff', '#a06bff', '#ff7ab2']

const KEY = 'candycrush_save_v1'

export function defaultSave(): SaveData {
  return {
    v: 1,
    user: {
      name: 'Jugador',
      avatar: '🐼',
      avatarColor: '#ff4d5e',
      sound: true,
      music: true,
      anim: true,
      haptics: true,
    },
    unlocked: 1,
    stars: {},
    bestScore: {},
    coins: 150,
    boosters: { hammer: 2, moves: 1, shuffle: 1 },
    achievements: {},
    stats: {
      matches: 0,
      maxCascade: 0,
      winCount: 0,
      threeStarsCount: 0,
      bombCreated: 0,
      bombUsed: 0,
      stripedCreated: 0,
      wrappedCreated: 0,
      totalScore: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      hammerUsed: 0,
      shuffleUsed: 0,
      bonusMovesUsed: 0,
    },
    seenTutorial: false,
    lastPlayed: Date.now(),
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const data = JSON.parse(raw) as SaveData
    const d = defaultSave()
    data.stats = { ...d.stats, ...data.stats }
    data.boosters = { ...d.boosters, ...data.boosters }
    data.user = { ...d.user, ...data.user }
    data.unlocked = Math.max(1, data.unlocked | 0)
    return data
  } catch {
    return defaultSave()
  }
}

export function persistSave(data: SaveData) {
  data.lastPlayed = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage full / private mode */
  }
}

export function resetSave(): SaveData {
  localStorage.removeItem(KEY)
  return defaultSave()
}