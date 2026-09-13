type OscType = OscillatorType

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicTimer: number | null = null
  private nextNoteTime = 0
  private musicStep = 0
  soundOn = true
  musicOn = true

  ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!this.ctx) {
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.18
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(freq: number, dur: number, type: OscType, gain = 0.2, delay = 0, target = this.master) {
    if (!this.ctx || !target) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(target)
    osc.start(t)
    osc.stop(t + dur)
  }

  unlocked = false
  unlock() {
    const c = this.ensure()
    if (c) this.unlocked = true
  }

  click() {
    if (!this.soundOn) return
    this.ensure()
    this.tone(660, 0.08, 'sine', 0.15)
  }

  pop(cascade: number) {
    if (!this.soundOn) return
    this.ensure()
    const base = 420 + cascade * 140
    this.tone(base, 0.1, 'sine', 0.2)
    this.tone(base * 1.5, 0.12, 'triangle', 0.12, 0.03)
  }

  match(count: number, cascade: number) {
    if (!this.soundOn) return
    this.ensure()
    const base = 500 + cascade * 100
    for (let i = 0; i < 3 + Math.min(count, 3); i++) {
      this.tone(base * Math.pow(1.25, i), 0.12, 'triangle', 0.18, i * 0.045)
    }
  }

  special() {
    if (!this.soundOn) return
    this.ensure()
    const notes = [587, 740, 880, 1175]
    notes.forEach((f, i) => this.tone(f, 0.16, 'sine', 0.2, i * 0.06))
  }

  bomb() {
    if (!this.soundOn) return
    this.ensure()
    this.tone(120, 0.5, 'sine', 0.3)
    this.tone(80, 0.6, 'triangle', 0.22, 0.02)
    this.tone(240, 0.4, 'sawtooth', 0.1, 0.01)
    for (let i = 0; i < 6; i++) this.tone(600 + Math.random() * 800, 0.05, 'square', 0.08, i * 0.02)
  }

  coin() {
    if (!this.soundOn) return
    this.ensure()
    this.tone(988, 0.12, 'sine', 0.2)
    this.tone(1319, 0.25, 'sine', 0.2, 0.06)
  }

  fail() {
    if (!this.soundOn) return
    this.ensure()
    const notes = [500, 420, 340, 260]
    notes.forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.2, i * 0.2))
  }

  win() {
    if (!this.soundOn) return
    this.ensure()
    const notes = [523, 659, 784, 1047, 784, 1047, 1319]
    notes.forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.2, i * 0.12))
    this.tone(1568, 0.7, 'sine', 0.2, 0.9)
  }

  private static MELODY = [523, 587, 659, 784, 659, 587, 523, 440, 494, 587, 659, 880, 659, 587, 523, 440]
  private static BASS = [130.8, 130.8, 196, 196, 174.6, 174.6, 146.8, 146.8]

  startMusic() {
    const c = this.ensure()
    if (!c || !this.musicGain) return
    if (this.musicTimer !== null) return
    this.nextNoteTime = c.currentTime + 0.1
    this.musicStep = 0
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 80)
  }

  private scheduleMusic() {
    if (!this.ctx || !this.musicOn || !this.musicOn) return
    if (!this.musicGain) return
    const stepDur = 0.24
    while (this.nextNoteTime < this.ctx.currentTime + 0.5) {
      const i = this.musicStep % AudioEngine.MELODY.length
      const beat = Math.floor(this.musicStep / 2) % AudioEngine.BASS.length
      if (this.musicStep % 2 === 0) this.tone(AudioEngine.BASS[beat], stepDur * 1.8, 'triangle', 0.5, this.nextNoteTime - this.ctx.currentTime, this.musicGain)
      const melodyFreq = AudioEngine.MELODY[i]
      if (this.musicStep % 4 < 3) this.tone(melodyFreq, stepDur * 0.9, 'sine', 0.5, this.nextNoteTime - this.ctx.currentTime, this.musicGain)
      this.nextNoteTime += stepDur
      this.musicStep++
    }
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on
  }
}

export const audio = new AudioEngine()