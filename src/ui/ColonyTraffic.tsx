// Tráfico en miniatura sobre el mapa de la colonia: coches por las calles y gente por las banquetas.
import { useEffect, useRef } from 'react'

interface Grid { n: number; ny: number; road: string; side: string }
type Agent = { x: number; y: number; tx: number; ty: number; dx: number; dy: number; v: number; color: string; car: boolean; moto?: boolean; fly?: boolean }
const CAR_COLORS = ['#E5649B', '#2E86C1', '#F2F3F4', '#C0392B', '#F2B705', '#1E8449', '#5D6D7E', '#D63B2F']
const PEOPLE = ['#D63B2F', '#1B4D8F', '#F2B705', '#2E7D5B', '#7C4DDB', '#E76F51']
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]

export function ColonyTraffic ({ grid, night, density = 1, riders = 0, drones = false }: { grid: Grid; night: boolean; density?: number; riders?: number; drones?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const { n, ny } = grid
    const road = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < ny && grid.road[y * n + x] === '1'
    const walk = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= n || y >= ny || road(x, y)) return false
      if (grid.side[y * n + x] === '1') return true
      return road(x + 1, y) || road(x - 1, y) || road(x, y + 1) || road(x, y - 1)
    }
    const cells = (f: (x: number, y: number) => boolean) => { const c: [number, number][] = []; for (let y = 0; y < ny; y++) for (let x = 0; x < n; x++) if (f(x, y)) c.push([x, y]); return c }
    const rc = cells(road); const wc = cells(walk)
    const spawn = (car: boolean): Agent => {
      const pool = car ? rc : wc; const [x, y] = pool[Math.floor(Math.random() * pool.length)] ?? [0, 0]
      return { x, y, tx: x, ty: y, dx: 1, dy: 0, v: car ? 2.2 + Math.random() * 1.6 : 0.5 + Math.random() * 0.4, color: (car ? CAR_COLORS : PEOPLE)[Math.floor(Math.random() * 6)], car }
    }
    const agents: Agent[] = [...Array.from({ length: Math.round(12 * density) }, () => spawn(true)), ...Array.from({ length: Math.round(26 * density) }, () => spawn(false))]
    // tus repartidores: motos naranjas (o drones que vuelan en línea recta)
    for (let i = 0; i < Math.min(30, riders); i++) { const a = spawn(true); a.moto = true; a.color = '#F28C05'; a.v = 4.5; if (drones) { a.fly = true; a.tx = Math.random() * n; a.ty = Math.random() * ny } agents.push(a) }
    const next = (a: Agent) => {
      const ok = a.car ? road : walk
      // sigue derecho si puede; si no, gira
      const opts = DIRS.filter(([dx, dy]) => ok(a.tx + dx, a.ty + dy) && !(dx === -a.dx && dy === -a.dy))
      const straight = opts.find(([dx, dy]) => dx === a.dx && dy === a.dy)
      const pick = straight && Math.random() < 0.9 ? straight : opts[Math.floor(Math.random() * opts.length)]
      if (!pick) { a.dx = -a.dx; a.dy = -a.dy; return }
      a.dx = pick[0]; a.dy = pick[1]; a.tx += a.dx; a.ty += a.dy
    }
    let raf = 0; let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      const w = cv.clientWidth; const h = cv.clientHeight; const dpr = Math.min(2, devicePixelRatio || 1)
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
      const cw = w / n; const ch = h / ny
      for (const a of agents) {
        const ddx = a.tx - a.x; const ddy = a.ty - a.y; const d = Math.hypot(ddx, ddy); const step = a.v * dt
        if (d <= step) { a.x = a.tx; a.y = a.ty; if (a.fly) { a.tx = Math.random() * n; a.ty = Math.random() * ny } else next(a) } else { a.x += ddx / d * step; a.y += ddy / d * step }
        const px = (a.x + 0.5) * cw; const py = (a.y + 0.5) * ch
        if (a.fly) {
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(px, py + 10, 4, 1.6, 0, 0, 7); ctx.fill()
          ctx.fillStyle = '#2B2D33'; ctx.fillRect(px - 6, py - 1, 12, 2); ctx.fillStyle = '#F28C05'; ctx.fillRect(px - 2.5, py - 2, 5, 5)
          ctx.fillStyle = 'rgba(200,220,255,.8)'; for (const o of [-6, 6]) { ctx.beginPath(); ctx.ellipse(px + o, py - 1.5, 3.5, 1, 0, 0, 7); ctx.fill() }
        } else if (a.moto) {
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(a.dy * ch, a.dx * cw))
          ctx.fillStyle = '#2B2D33'; ctx.fillRect(-cw * 0.8, -1.2, cw * 1.6, 2.4)
          ctx.fillStyle = '#F28C05'; ctx.fillRect(-cw * 0.85, -2.6, cw * 0.7, 5.2)
          ctx.restore()
        } else if (a.car) {
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(a.dy * ch, a.dx * cw))
          const L = cw * 2.7; const Wd = cw * 1.45
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-L / 2 + 1, -Wd / 2 + 1.5, L, Wd)
          ctx.fillStyle = a.color; ctx.strokeStyle = '#2B2D33'; ctx.lineWidth = 0.8
          ctx.beginPath(); ctx.roundRect(-L / 2, -Wd / 2, L, Wd, 1.5); ctx.fill(); ctx.stroke()
          ctx.fillStyle = 'rgba(120,180,230,.9)'; ctx.fillRect(L * 0.05, -Wd / 2 + 1, L * 0.22, Wd - 2)
          if (night) { ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.beginPath(); ctx.arc(L / 2, -Wd / 4, 1.8, 0, 7); ctx.arc(L / 2, Wd / 4, 1.8, 0, 7); ctx.fill() }
          ctx.restore()
        } else {
          const bob = Math.sin(now / 120 + a.x * 3) * 0.6
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px, py + 2, 2, 1, 0, 0, 7); ctx.fill()
          ctx.fillStyle = a.color; ctx.fillRect(px - 1.8, py - 7 + bob, 3.6, 6.5)
          ctx.fillStyle = '#A0673D'; ctx.beginPath(); ctx.arc(px, py - 8.8 + bob, 2, 0, 7); ctx.fill()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [grid, night, density, riders, drones])
  return <canvas ref={ref} className='absolute inset-0 w-full h-full pointer-events-none' aria-hidden />
}
