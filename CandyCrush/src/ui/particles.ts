export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  grav: number
  life: number
  maxLife: number
  size: number
  color: string
  round: boolean
}

export class Particles {
  list: Particle[] = []

  spawn(x: number, y: number, colors: string[], count: number, speed = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const v = (40 + Math.random() * 260) * speed
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        grav: 420,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() > 0.3,
      })
    }
  }

  confetti(x: number, y: number, colors: string[], count = 60) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 60 + Math.random() * 220
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120,
        grav: 300,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.6,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() > 0.5,
      })
    }
  }

  ring(x: number, y: number, color: string) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * 300,
        vy: Math.sin(a) * 300,
        grav: 60,
        life: 0,
        maxLife: 0.45,
        size: 4,
        color,
        round: true,
      })
    }
  }

  update(dt: number) {
    const list = this.list
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      p.life += dt
      if (p.life >= p.maxLife) {
        list.splice(i, 1)
        continue
      }
      p.vy += p.grav * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const k = 1 - p.life / p.maxLife
      ctx.globalAlpha = Math.max(0, k)
      ctx.fillStyle = p.color
      if (p.round) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * k + 1, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - p.size * k / 2, p.y - p.size * k / 2, p.size * k, p.size * k * 0.8)
      }
    }
    ctx.globalAlpha = 1
  }
}