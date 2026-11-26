// Tráfico del mapa modular: los coches siguen exactamente las calles de la cuadrícula
// y la gente camina por las banquetas. Cada coche usa la vista correcta según su dirección.
import { useEffect, useRef } from 'react'
import { sprite } from '../renderer/assets'
import { W, H, P, NX, NY, TW, toScreen } from './modular'

const SKINS = ['taxi', 'vocho', 'sedan-rojo', 'sedan-azul', 'pickup', 'taxi', 'sedan-azul']
// columna de la lámina que mira hacia abajo-izquierda (de frente) y hacia arriba-derecha (de espaldas)
const VIEWS: Record<string, { sw: number; ne: number; swIsSE?: boolean }> = { taxi: { sw: 1, ne: 2 }, vocho: { sw: 0, ne: 2 }, 'sedan-azul': { sw: 0, ne: 2 }, 'sedan-rojo': { sw: 0, ne: 2, swIsSE: true }, pickup: { sw: 0, ne: 2 }, metrobus: { sw: 0, ne: 2 }, moto: { sw: 0, ne: 2 }, camioneta: { sw: 0, ne: 2 } }
const PEOPLE = ['peaton_ejecutivo', 'peaton_compradora', 'peaton_paseador_perros', 'peaton_corredor']
type Car = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; skin: string }
type Walker = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; who: string; side: number }

export function ModularTraffic ({ night, density = 1, riders = 0 }: { night: boolean; density?: number; riders?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!
    cv.width = W; cv.height = H
    const rnd = Math.random
    const lines = (n: number) => Array.from({ length: Math.floor((n - 1) / P) + 1 }, (_, i) => i * P)
    const xs = lines(NY); const ys = lines(NX)
    const car = (): Car => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      const max = axis === 'x' ? NX : NY
      return { axis, line, pos: rnd() * max, dir: rnd() < 0.5 ? 1 : -1, v: 1.6 + rnd() * 1.2, skin: SKINS[Math.floor(rnd() * SKINS.length)] }
    }
    const cars: Car[] = Array.from({ length: Math.round(45 * density) }, car)
    for (let i = 0; i < riders; i++) { const c = car(); c.skin = 'moto'; c.v = 3; cars.push(c) }
    const walkers: Walker[] = Array.from({ length: Math.round(40 * density) }, () => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      return { axis, line, pos: rnd() * (axis === 'x' ? NX : NY), dir: rnd() < 0.5 ? 1 : -1, v: 0.3 + rnd() * 0.25, who: PEOPLE[Math.floor(rnd() * PEOPLE.length)], side: rnd() < 0.5 ? -0.42 : 1.42 }
    })
    let raf = 0; let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      ctx.clearRect(0, 0, W, H)
      const list: { y: number; draw: () => void }[] = []
      for (const c of cars) {
        c.pos += c.dir * c.v * dt
        const max = c.axis === 'x' ? NX : NY
        if (c.pos > max + 1) c.pos = -1; if (c.pos < -1) c.pos = max + 1
        // carril derecho: un poco desplazado según el sentido
        const off = 0.5 + (c.dir > 0 ? 0.22 : -0.22)
        const p = c.axis === 'x' ? toScreen(c.pos, c.line + off) : toScreen(c.line + off, c.pos)
        list.push({ y: p.y, draw: () => drawCar(ctx, c, p.x, p.y, night) })
      }
      for (const w of walkers) {
        w.pos += w.dir * w.v * dt
        const max = w.axis === 'x' ? NX : NY
        if (w.pos > max) w.pos = 0; if (w.pos < 0) w.pos = max
        const p = w.axis === 'x' ? toScreen(w.pos, w.line + w.side) : toScreen(w.line + w.side, w.pos)
        list.push({ y: p.y, draw: () => drawWalker(ctx, w, p.x, p.y) })
      }
      list.sort((a, b) => a.y - b.y)
      for (const it of list) it.draw()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [night, density, riders])
  return <canvas ref={ref} className='absolute inset-0 w-full h-full pointer-events-none' aria-hidden />
}

function drawCar (ctx: CanvasRenderingContext2D, c: Car, x: number, y: number, night: boolean) {
  // +x avanza hacia abajo-derecha (SE), +y hacia abajo-izquierda (SW)
  const back = c.dir < 0
  const view = VIEWS[c.skin] ?? { sw: 0, ne: 2 }
  let mirror = c.axis === 'x'
  if (!back && view.swIsSE) mirror = !mirror
  const im = sprite(`sprites/veh-${c.skin}-${back ? view.ne : view.sw}.webp`)
  const w = (c.skin === 'moto' ? 0.55 : 0.95) * TW
  if (!im) { ctx.fillStyle = '#C0392B'; ctx.fillRect(x - 8, y - 6, 16, 10); return }
  const h = w * im.height / im.width
  ctx.save(); ctx.translate(x, y); if (mirror) ctx.scale(-1, 1)
  ctx.drawImage(im, -w / 2, -h * 0.72, w, h); ctx.restore()
  if (night) { ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.arc(x, y - h * 0.2, 7, 0, 7); ctx.fill() }
}
function drawWalker (ctx: CanvasRenderingContext2D, w: Walker, x: number, y: number) {
  const im = sprite(`kit/polanco/${w.who}.webp`)
  if (!im) return
  const h = TW * 0.42; const wd = h * im.width / im.height
  // el dibujo mira hacia la izquierda: se refleja cuando camina hacia la derecha
  const right = (w.axis === 'x' && w.dir > 0) || (w.axis === 'y' && w.dir < 0)
  ctx.save(); ctx.translate(x, y + Math.sin(performance.now() / 140 + w.pos) * 0.8); if (right) ctx.scale(-1, 1)
  ctx.drawImage(im, -wd / 2, -h, wd, h); ctx.restore()
}
