// Tráfico del mapa modular: los coches siguen exactamente las calles de la cuadrícula
// y la gente camina por las banquetas. Cada coche usa la vista correcta según su dirección.
import { useEffect, useRef } from 'react'
import { sprite } from '../renderer/assets'
import { RES, W, H, P, NX, NY, TW, toScreen, INSURGENTES_TY } from './modular'

const SKINS = ['px:taxi_rosa', 'px:vocho_verde', 'px:vocho_verde', 'px:taxi_rosa', 'sedan-rojo', 'sedan-azul', 'px:camion_reparto', 'pickup', 'px:patrulla', 'px:taxi_rosa', 'sedan-azul']
// láminas pixel: el nombre del archivo no coincide con hacia dónde mira; esta tabla dice cuál usar
type Face = 'SE' | 'SW' | 'NE' | 'NW'
const OLD: Record<Face, string> = { SE: 'se', SW: 'sw', NE: 'nw', NW: 'ne' }
const PX_VIEW: Record<string, Record<Face, string>> = {
  taxi_rosa: OLD, patrulla: OLD, camion_reparto: OLD,
  metrobus_rojo: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  moto_repartidor: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  vocho_verde: { SE: 'sw', SW: 'se', NE: 'ne', NW: 'nw' }
}
// semáforos: cada 7 s cambia qué eje tiene verde
const CYCLE = 7
export const greenAxis = (t: number): 'x' | 'y' => Math.floor(t / CYCLE) % 2 ? 'y' : 'x'
// columna de la lámina que mira hacia abajo-izquierda (de frente) y hacia arriba-derecha (de espaldas)
const VIEWS: Record<string, { sw: number; ne: number; swIsSE?: boolean }> = { taxi: { sw: 1, ne: 2 }, vocho: { sw: 0, ne: 2 }, 'sedan-azul': { sw: 0, ne: 2 }, 'sedan-rojo': { sw: 0, ne: 2, swIsSE: true }, pickup: { sw: 0, ne: 2 }, metrobus: { sw: 0, ne: 2 }, moto: { sw: 0, ne: 2 }, camioneta: { sw: 0, ne: 2 } }
const PEOPLE = ['peaton_ejecutivo', 'peaton_compradora', 'peaton_paseador_perros', 'peaton_corredor']
type Car = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; skin: string }
type Walker = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; who: string; side: number }

export function ModularTraffic ({ night, density = 1, riders = 0 }: { night: boolean; density?: number; riders?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!
    cv.width = Math.round(W * RES); cv.height = Math.round(H * RES); ctx.setTransform(RES, 0, 0, RES, 0, 0)
    const rnd = Math.random
    const lines = (n: number) => Array.from({ length: Math.floor((n - 1) / P) + 1 }, (_, i) => i * P)
    const xs = lines(NY); const ys = lines(NX)
    const car = (): Car => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      const max = axis === 'x' ? NX : NY
      return { axis, line, pos: rnd() * max, dir: rnd() < 0.5 ? 1 : -1, v: 1.6 + rnd() * 1.2, skin: SKINS[Math.floor(rnd() * SKINS.length)] }
    }
    const cars: Car[] = Array.from({ length: Math.round(45 * density) }, car)
    for (let i = 0; i < riders; i++) { const c = car(); c.skin = 'px:moto_repartidor'; c.v = 3; cars.push(c) }
    // Metrobús: corre sobre Insurgentes en los dos sentidos
    for (let i = 0; i < 4; i++) cars.push({ axis: 'x', line: INSURGENTES_TY, pos: i * NX / 4, dir: i % 2 ? 1 : -1, v: 1.3, skin: 'px:metrobus_rojo' })
    const walkers: Walker[] = Array.from({ length: Math.round(40 * density) }, () => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      return { axis, line, pos: rnd() * (axis === 'x' ? NX : NY), dir: rnd() < 0.5 ? 1 : -1, v: 0.3 + rnd() * 0.25, who: PEOPLE[Math.floor(rnd() * PEOPLE.length)], side: rnd() < 0.5 ? -0.13 : 1.13 }
    })
    let raf = 0; let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      ctx.clearRect(0, 0, W, H)
      const list: { y: number; draw: () => void }[] = []
      for (const c of cars) {
        // se detiene antes de la esquina si su semáforo está en rojo
        const next = c.dir > 0 ? Math.ceil((c.pos + 0.05) / P) * P - 0.35 : Math.floor((c.pos - 0.05) / P) * P + 1.35
        const gap = (next - c.pos) * c.dir
        const red = greenAxis(now / 1000) !== c.axis
        if (!(red && gap > 0 && gap < 0.5)) c.pos += c.dir * c.v * dt
        const max = c.axis === 'x' ? NX : NY
        if (c.pos > max + 1) c.pos = -1; if (c.pos < -1) c.pos = max + 1
        // carril derecho: un poco desplazado según el sentido
        const off = 0.5 + (c.dir > 0 ? 0.2 : -0.2)
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
      // semáforos y farolas en las esquinas de las banquetas
      const g = greenAxis(now / 1000)
      for (const i of ys) for (const j of xs) {
        const a = toScreen(i + 1.12, j - 0.12); const b = toScreen(i - 0.12, j + 1.12)
        list.push({ y: a.y, draw: () => drawPole(ctx, `semaforo_${g === 'x' ? 'verde' : 'rojo'}_frente`, a.x, a.y, 0.5) })
        list.push({ y: b.y, draw: () => drawPole(ctx, `semaforo_${g === 'y' ? 'verde' : 'rojo'}_izq`, b.x, b.y, 0.5) })
        const f = toScreen(i + 1.12, j + 1.12)
        list.push({ y: f.y, draw: () => drawPole(ctx, 'farola_frente', f.x, f.y, 0.55) })
      }
      list.sort((a, b) => a.y - b.y)
      for (const it of list) it.draw()
      // de noche: halos de farolas, semáforos y faros encima de todo, sumando luz
      if (night) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        const halo = (x: number, y: number, r: number, c: string) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2) }
        for (const i of ys) for (const j of xs) {
          const f = toScreen(i + 1.12, j + 1.12); halo(f.x, f.y - TW * 0.48, 30, 'rgba(255,210,120,.9)'); halo(f.x, f.y, 60, 'rgba(255,190,100,.35)')
          const a = toScreen(i + 1.12, j - 0.12); halo(a.x, a.y - TW * 0.4, 12, g === 'x' ? 'rgba(80,255,140,.6)' : 'rgba(255,60,50,.6)')
          const b = toScreen(i - 0.12, j + 1.12); halo(b.x, b.y - TW * 0.4, 12, g === 'y' ? 'rgba(80,255,140,.6)' : 'rgba(255,60,50,.6)')
        }
        for (const c of cars) {
          const off = 0.5 + (c.dir > 0 ? 0.2 : -0.2)
          const p = c.axis === 'x' ? toScreen(c.pos + c.dir * 0.35, c.line + off) : toScreen(c.line + off, c.pos + c.dir * 0.35)
          halo(p.x, p.y - 6, 22, 'rgba(255,245,200,.45)')
        }
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [night, density, riders])
  return <canvas ref={ref} className='absolute inset-0 w-full h-full pointer-events-none' aria-hidden />
}

function drawPole (ctx: CanvasRenderingContext2D, name: string, x: number, y: number, hTiles: number) {
  const im = sprite(`kit/px/${name}.webp`); if (!im) return
  const h = TW * hTiles; const w = h * im.width / im.height
  ctx.drawImage(im, x - w / 2, y - h * 0.95, w, h)
}
function drawCar (ctx: CanvasRenderingContext2D, c: Car, x: number, y: number, night: boolean) {
  if (c.skin.startsWith('px:')) {
    const face = c.axis === 'x' ? (c.dir > 0 ? 'SE' : 'NW') : (c.dir > 0 ? 'SW' : 'NE')
    const name = c.skin.slice(3); const im = sprite(`kit/px/${name}_${PX_VIEW[name][face]}.webp`)
    if (!im) return
    const w = (name === 'metrobus_rojo' ? 0.95 : name === 'moto_repartidor' ? 0.26 : name === 'camion_reparto' ? 0.52 : 0.44) * TW; const h = w * im.height / im.width
    ctx.drawImage(im, x - w / 2, y - h * 0.75, w, h)
    return
  }
  // +x avanza hacia abajo-derecha (SE), +y hacia abajo-izquierda (SW)
  const back = c.dir < 0
  const view = VIEWS[c.skin] ?? { sw: 0, ne: 2 }
  let mirror = c.axis === 'x'
  if (!back && view.swIsSE) mirror = !mirror
  const im = sprite(`sprites/veh-${c.skin}-${back ? view.ne : view.sw}.webp`)
  const w = (c.skin === 'moto' ? 0.24 : 0.42) * TW
  if (!im) { ctx.fillStyle = '#C0392B'; ctx.fillRect(x - 8, y - 6, 16, 10); return }
  const h = w * im.height / im.width
  ctx.save(); ctx.translate(x, y); if (mirror) ctx.scale(-1, 1)
  ctx.drawImage(im, -w / 2, -h * 0.72, w, h); ctx.restore()
  if (night) { ctx.fillStyle = 'rgba(255,240,170,.5)'; ctx.beginPath(); ctx.arc(x, y - h * 0.2, 4, 0, 7); ctx.fill() }
}
function drawWalker (ctx: CanvasRenderingContext2D, w: Walker, x: number, y: number) {
  const im = sprite(`kit/polanco/${w.who}.webp`)
  if (!im) return
  const h = TW * 0.26; const wd = h * im.width / im.height
  // el dibujo mira hacia la izquierda: se refleja cuando camina hacia la derecha
  const right = (w.axis === 'x' && w.dir > 0) || (w.axis === 'y' && w.dir < 0)
  ctx.save(); ctx.translate(x, y + Math.sin(performance.now() / 140 + w.pos) * 0.8); if (right) ctx.scale(-1, 1)
  ctx.drawImage(im, -wd / 2, -h, wd, h); ctx.restore()
}
