// Tráfico del mapa modular: los coches siguen exactamente las calles de la cuadrícula
// y la gente camina por las banquetas. Cada coche usa la vista correcta según su dirección.
import { useEffect, useRef } from 'react'
import { sprite } from '../renderer/assets'
import { RES, W, H, P, NX, NY, TW, toScreen, INSURGENTES_TY, REFORMA_TX, POTHOLES, alongPeriferico, DECK, blocked, AREAS, EXTRAS } from './modular'

const SKINS = ['px:microbus', 'px:camion_rtp', 'px:microbus', 'px:pipa_gas', 'px:camion_basura', 'px:ambulancia', 'px:trolebus', 'px:taxi_rosa', 'px:vocho_verde', 'px:vocho_verde', 'px:taxi_rosa', 'sedan-rojo', 'sedan-azul', 'px:camion_reparto', 'pickup', 'px:patrulla', 'px:taxi_rosa', 'sedan-azul']
// láminas pixel: el nombre del archivo no coincide con hacia dónde mira; esta tabla dice cuál usar
type Face = 'SE' | 'SW' | 'NE' | 'NW'
const OLD: Record<Face, string> = { SE: 'se', SW: 'sw', NE: 'nw', NW: 'ne' }
const PX_VIEW: Record<string, Record<Face, string>> = {
  taxi_rosa: OLD, patrulla: OLD, camion_reparto: OLD,
  metrobus_rojo: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  moto_repartidor: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  camion_rtp: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' }, trolebus: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  ambulancia: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' }, camion_basura: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  pipa_gas: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' }, microbus: { SE: 'se', SW: 'sw', NE: 'ne', NW: 'nw' },
  vocho_verde: { SE: 'sw', SW: 'se', NE: 'ne', NW: 'nw' }
}
// semáforos: cada 7 s cambia qué eje tiene verde
const CYCLE = 7
export const greenAxis = (t: number): 'x' | 'y' => Math.floor(t / CYCLE) % 2 ? 'y' : 'x'
// columna de la lámina que mira hacia abajo-izquierda (de frente) y hacia arriba-derecha (de espaldas)
const VIEWS: Record<string, { sw: number; ne: number; swIsSE?: boolean }> = { taxi: { sw: 1, ne: 2 }, vocho: { sw: 0, ne: 2 }, 'sedan-azul': { sw: 0, ne: 2 }, 'sedan-rojo': { sw: 0, ne: 2, swIsSE: true }, pickup: { sw: 0, ne: 2 }, metrobus: { sw: 0, ne: 2 }, moto: { sw: 0, ne: 2 }, camioneta: { sw: 0, ne: 2 } }
const PEOPLE = ['peaton_ejecutivo', 'peaton_compradora', 'peaton_paseador_perros', 'peaton_corredor',
  'vida:senora_mandado', 'vida:ninos_uniforme', 'vida:mariachi', 'vida:perro_callejero', 'vida:vendedor_globos', 'vida:senora_mandado']
// personajes animados (4 cuadros): hacia dónde mira el dibujo original
const FACES_LEFT = new Set(['senora_mandado', 'mariachi'])
// gente que se queda en su lugar: tránsito en las esquinas, organillero, franelero, obra y el gato en la barda
const STILL = ['policia_transito', 'organillero', 'franelero', 'trabajador_obra', 'gato_barda']
type Car = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; skin: string; cur?: number; wait?: number; turned?: number }
type Walker = { axis: 'x' | 'y'; line: number; pos: number; dir: 1 | -1; v: number; who: string; side: number }

// eventos de la ciudad que se ven en el mapa
export interface CityEvents { marcha: boolean; partido: boolean; tianguis: boolean }
export function ModularTraffic ({ night, density = 1, riders = 0, active = true, hour = 12, events, shops = [] }: { night: boolean; density?: number; riders?: number; active?: boolean; hour?: number; events?: CityEvents; shops?: { x: number; y: number; rate: number }[] }) {
  // hora pico: más coches de 7 a 9 y de 17 a 20; casi nada de madrugada
  const rush = hour >= 7 && hour < 9.5 ? 1.5 : hour >= 17 && hour < 20.5 ? 1.6 : hour < 5 ? 0.25 : hour >= 23 ? 0.45 : 1
  const evRef = useRef(events); evRef.current = events
  const shopsRef = useRef(shops); shopsRef.current = shops
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active); activeRef.current = active
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!
    void RES
    const rnd = Math.random
    const lines = (n: number) => Array.from({ length: Math.floor((n - 1) / P) + 1 }, (_, i) => i * P)
    const xs = lines(NY); const ys = lines(NX)
    const car = (): Car => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      const max = axis === 'x' ? NX : NY
      const c: Car = { axis, line, pos: rnd() * max, dir: rnd() < 0.5 ? 1 : -1, v: 1.6 + rnd() * 1.2, skin: SKINS[Math.floor(rnd() * SKINS.length)] }
      return inside(c.axis, c.line, c.pos) ? car() : c
    }
    const inside = (axis: 'x' | 'y', line: number, pos: number) => axis === 'x' ? blocked(pos, line + 0.5) : blocked(line + 0.5, pos)
    const cars: Car[] = Array.from({ length: Math.round(45 * density * rush) }, car)
    for (let i = 0; i < riders; i++) { const c = car(); c.skin = 'px:moto_repartidor'; c.v = 3; cars.push(c) }
    // Metrobús: corre sobre Insurgentes en los dos sentidos
    if (EXTRAS) for (let i = 0; i < 4; i++) cars.push({ axis: 'x', line: INSURGENTES_TY, pos: i * NX / 4, dir: i % 2 ? 1 : -1, v: 1.3, skin: 'px:metrobus_rojo' })
    const walkers: Walker[] = Array.from({ length: Math.round(40 * density) }, () => {
      const axis = rnd() < 0.5 ? 'x' : 'y'; const line = (axis === 'x' ? xs : ys)[Math.floor(rnd() * (axis === 'x' ? xs : ys).length)]
      return { axis, line, pos: rnd() * (axis === 'x' ? NX : NY), dir: rnd() < 0.5 ? 1 : -1, v: 0.3 + rnd() * 0.25, who: PEOPLE[Math.floor(rnd() * PEOPLE.length)], side: rnd() < 0.5 ? -0.13 : 1.13 }
    })
    const peri = Array.from({ length: EXTRAS ? Math.round(16 * density) : 0 }, (_, i) => ({ t: i / (16 * density), dir: i % 2 ? 1 : -1, v: 0.9 + rnd() * 0.5, skin: ['taxi_rosa', 'vocho_verde', 'camion_reparto', 'patrulla', 'taxi_rosa'][i % 5] }))
    // personajes fijos repartidos en banquetas y esquinas (siempre los mismos lugares)
    const still = Array.from({ length: Math.round(26 * density) }, (_, i) => {
      const ax = (i * 7) % 2 === 0; const line = ((i * 5) % Math.floor((ax ? NY : NX) / P)) * P
      const pos = 1.5 + ((i * 37) % ((ax ? NX : NY) - 3))
      const who = STILL[i % STILL.length]
      const p = ax ? toScreen(pos, line + (who === 'policia_transito' ? 0.5 : -0.15)) : toScreen(line + (who === 'policia_transito' ? 0.5 : -0.15), pos)
      return { who, x: p.x, y: p.y, ok: !(ax ? blocked(pos, line + 0.5) : blocked(line + 0.5, pos)), ph: i }
    }).filter(s => s.ok)
    let raf = 0; let last = performance.now()
    // optimización: 30 cuadros por segundo, se pausa si el mapa no está a la vista,
    // y solo se borra y se dibuja la parte de la ciudad que cabe en la pantalla
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 32 || document.hidden || !activeRef.current) return
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      // el lienzo mide solo lo que se ve en pantalla (no la ciudad entera): así el teléfono no se queda sin memoria.
      // Se coloca dentro del mundo sobre la zona visible y se le da la resolución justa para verse nítido.
      const r = cv.parentElement!.getBoundingClientRect(); const sc = r.width / W || 1
      const view = { x0: Math.max(0, -r.left / sc - 60), y0: Math.max(0, -r.top / sc - 80), x1: Math.min(W, (innerWidth - r.left) / sc + 60), y1: Math.min(H, (innerHeight - r.top) / sc + 80) }
      const k = Math.min(2, devicePixelRatio || 1) * sc
      const pw = Math.max(1, Math.round((view.x1 - view.x0) * k)); const ph = Math.max(1, Math.round((view.y1 - view.y0) * k))
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph }
      cv.style.left = `${view.x0 / W * 100}%`; cv.style.top = `${view.y0 / H * 100}%`; cv.style.width = `${(view.x1 - view.x0) / W * 100}%`; cv.style.height = `${(view.y1 - view.y0) / H * 100}%`
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pw, ph)
      ctx.setTransform(k, 0, 0, k, -view.x0 * k, -view.y0 * k)
      const seen = (x: number, y: number) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1
      const list: { y: number; draw: () => void }[] = []
      // carriles: cada coche solo mira a los de su mismo carril (en vez de revisar todos contra todos)
      const lanes = new Map<string, Car[]>()
      for (const c of cars) { const k = c.axis + c.line + c.dir; const a = lanes.get(k); if (a) a.push(c); else lanes.set(k, [c]) }
      for (const c of cars) {
        // se detiene antes de la esquina si su semáforo está en rojo
        const next = c.dir > 0 ? Math.ceil((c.pos + 0.05) / P) * P - 0.35 : Math.floor((c.pos - 0.05) / P) * P + 1.35
        const gap = (next - c.pos) * c.dir
        const red = greenAxis(now / 1000) !== c.axis
        // velocidad deseada: frena en baches, respeta al de adelante y a veces el taxi se para a subir pasaje
        let want = c.v * (0.85 + 0.15 * Math.sin(now / 1500 + c.pos))
        if (POTHOLES.some(h => h.axis === c.axis && h.line === c.line && (h.pos - c.pos) * c.dir > -0.2 && (h.pos - c.pos) * c.dir < 0.5)) want *= 0.3
        for (const o of lanes.get(c.axis + c.line + c.dir)!) if (o !== c) { const d = (o.pos - c.pos) * c.dir; if (d > 0 && d < 0.75) want = Math.min(want, (o.cur ?? 0) * (d < 0.5 ? 0.5 : 1)) }
        // marcha sobre Reforma: los coches no entran, se dan la vuelta
        if (EXTRAS && evRef.current?.marcha && c.axis === 'y' && c.line === REFORMA_TX && c.skin !== 'px:metrobus_rojo') { c.dir = (c.dir > 0 ? -1 : 1); c.axis = 'x'; c.line = Math.floor(c.pos / P) * P }
        if (c.wait && c.wait > 0) { c.wait -= dt; want = 0 } else if (c.skin === 'px:taxi_rosa' && Math.random() < dt * 0.02) c.wait = 2 + Math.random() * 3
        if (red && gap > 0 && gap < 0.5) want = 0
        c.cur = (c.cur ?? want) + (want - (c.cur ?? want)) * Math.min(1, dt * 3)
        const before = c.pos
        c.pos += c.dir * c.cur * dt
        // no entra a plazas ni parques grandes: da la vuelta en U
        const ahead = c.pos + c.dir * 0.6
        if (c.axis === 'x' ? blocked(ahead, c.line + 0.5) : blocked(c.line + 0.5, ahead)) { c.dir = (c.dir > 0 ? -1 : 1); c.pos = before }
        // al cruzar el centro de una esquina puede dar vuelta (el Metrobús sigue derecho por su carril)
        const mid = Math.floor((Math.max(before, c.pos) - 0.5) / P) * P + 0.5
        if (c.skin !== 'px:metrobus_rojo' && (before - mid) * (c.pos - mid) <= 0 && Math.abs(before - c.pos) < 1 && (c.turned ?? 0) < now - 1500 && Math.random() < 0.3) {
          const k = mid - 0.5; const newAxis = c.axis === 'x' ? 'y' : 'x'; const maxL = newAxis === 'x' ? NY : NX
          if (k >= 0 && k <= (c.axis === 'x' ? NX : NY) - 1 && c.line < maxL) { c.pos = c.line + 0.5; c.line = k; c.axis = newAxis; c.dir = Math.random() < 0.5 ? 1 : -1; c.turned = now }
        }
        const max = c.axis === 'x' ? NX : NY
        if (c.pos > max + 1) c.pos = -1; if (c.pos < -1) c.pos = max + 1
        // carril derecho: un poco desplazado según el sentido
        const off = 0.5 + (c.dir > 0 ? 0.2 : -0.2)
        const p = c.axis === 'x' ? toScreen(c.pos, c.line + off) : toScreen(c.line + off, c.pos)
        if (seen(p.x, p.y)) list.push({ y: p.y, draw: () => drawCar(ctx, c, p.x, p.y, night) })
      }
      for (const w of walkers) {
        w.pos += w.dir * w.v * dt
        if (inside(w.axis, w.line, w.pos + w.dir * 0.3)) w.dir = (w.dir > 0 ? -1 : 1)
        const max = w.axis === 'x' ? NX : NY
        if (w.pos > max) w.pos = 0; if (w.pos < 0) w.pos = max
        const p = w.axis === 'x' ? toScreen(w.pos, w.line + w.side) : toScreen(w.line + w.side, w.pos)
        if (seen(p.x, p.y)) list.push({ y: p.y, draw: () => drawWalker(ctx, w, p.x, p.y) })
      }
      // Periférico: coches en el segundo piso, sin semáforos (van por la curva)
      for (const f of peri) {
        f.t = (f.t + f.v * dt / 60 + 1) % 1
        const p = alongPeriferico(f.dir > 0 ? f.t : 1 - f.t)
        const sgn = f.dir > 0 ? 1 : -1; const len = Math.hypot(p.dx, p.dy) || 1
        const ox = -p.dy / len * 9 * sgn; const oy = p.dx / len * 9 * sgn
        const vx = p.dx * sgn; const vy = p.dy * sgn
        const fc = vy >= 0 ? (vx >= 0 ? 'SE' : 'SW') : (vx >= 0 ? 'NE' : 'NW')
        if (seen(p.x, p.y)) list.push({ y: p.y + 9999, draw: () => drawPx(ctx, f.skin, fc as Face, p.x + ox, p.y + oy - DECK) })
      }
      const ev = evRef.current
      // marcha: contingente caminando por Reforma con mantas
      if (ev?.marcha && EXTRAS) for (let k = 0; k < 60; k++) {
        const t = ((now / 9000 + k / 60) % 1) * (NY - 2) + 1; const p = toScreen(REFORMA_TX + 0.25 + (k % 3) * 0.25, t)
        if (seen(p.x, p.y)) list.push({ y: p.y, draw: () => drawVida(ctx, ['senora_mandado', 'ninos_uniforme', 'franelero', 'mariachi'][k % 4], Math.floor(now / 200 + k) % 4, p.x, p.y, false) })
      }
      // partido en el Azteca: aficionados alrededor del estadio
      if (ev?.partido) { const az = AREAS.find(a => a.id === 'azteca'); if (az) for (let k = 0; k < 40; k++) {
        const ang = k / 40 * Math.PI * 2 + now / 20000; const r = az.w * P / 2 + 0.6
        const p = toScreen(az.bx * P + 1 + az.w * P / 2 + Math.cos(ang) * r, az.by * P + 1 + az.h * P / 2 + Math.sin(ang) * r)
        if (seen(p.x, p.y)) list.push({ y: p.y, draw: () => drawVida(ctx, k % 3 ? 'ninos_uniforme' : 'vendedor_globos', Math.floor(now / 220 + k) % 4, p.x, p.y, k % 2 === 0) })
      } }
      // tianguis: fila de puestos con lonas sobre una calle de Iztapalapa y otra de la Roma
      if (ev?.tianguis) for (const [lx, ly] of [[9 * P, 8 * P + 1], [5 * P, 10 * P + 1]]) for (let k = 0; k < 3; k++) {
        const p = toScreen(lx + 0.5, ly + k + 0.5)
        if (seen(p.x, p.y)) list.push({ y: p.y + 1, draw: () => tianguis(ctx, p.x, p.y, k) })
      }
      // clientes entrando y saliendo de tus tiendas (más gente si vende más)
      for (const sh of shopsRef.current) for (let k = 0; k < Math.min(6, 1 + Math.round(sh.rate * 5)); k++) {
        const t = (now / 3200 + k / 6) % 1; const back = t > 0.5; const d = back ? (1 - t) * 2 : t * 2
        const x = sh.x + (k % 2 ? 1 : -1) * (30 + k * 8) * (1 - d); const y = sh.y + 18 + (1 - d) * 22
        if (seen(x, y)) list.push({ y, draw: () => drawVida(ctx, k % 3 ? 'senora_mandado' : 'ninos_uniforme', Math.floor(now / 170 + k) % 4, x, y, (k % 2 ? 1 : -1) * (back ? -1 : 1) > 0) })
      }
      for (const s of still) if (seen(s.x, s.y)) list.push({ y: s.y, draw: () => drawVida(ctx, s.who, Math.floor(now / 260 + s.ph) % 4, s.x, s.y, false) })
      // semáforos y farolas en las esquinas de las banquetas
      const g = greenAxis(now / 1000)
      for (const i of ys) for (const j of xs) {
        const a = toScreen(i + 1.12, j - 0.12); const b = toScreen(i - 0.12, j + 1.12)
        if (!seen(a.x, a.y) || blocked(i + 0.5, j + 0.5)) continue
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
        const halo = (x: number, y: number, r: number, c: string) => { if (seen(x, y)) ctx.drawImage(glow(c), x - r, y - r, r * 2, r * 2) }
        for (const i of ys) for (const j of xs) {
          if (blocked(i + 0.5, j + 0.5)) continue
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
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [night, density, riders, rush])
  return <canvas ref={ref} className='absolute pointer-events-none' style={{ left: 0, top: 0, width: 0, height: 0 }} aria-hidden />
}

// halos de luz pre-dibujados una sola vez (crear degradados en cada cuadro es caro)
const glows = new Map<string, HTMLCanvasElement>()
function glow (c: string) {
  let g = glows.get(c); if (g) return g
  g = document.createElement('canvas'); g.width = g.height = 64
  const x = g.getContext('2d')!; const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glows.set(c, g); return g
}
function tianguis (ctx: CanvasRenderingContext2D, x: number, y: number, k: number) {
  const c = ['#E8473B', '#F2B705', '#2E86DE', '#2E7D5B'][k % 4]
  ctx.fillStyle = '#8B6B4A'; ctx.fillRect(x - 16, y - 14, 32, 10)
  ctx.fillStyle = ['#E59A3A', '#D94B3B', '#7DBA4A'][k % 3]; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - 12 + i * 6, y - 15, 3, 0, 7); ctx.fill() }
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 22, y - 30); ctx.lineTo(x + 22, y - 30); ctx.lineTo(x + 18, y - 22); ctx.lineTo(x - 18, y - 22); ctx.fill()
  ctx.fillStyle = '#555'; ctx.fillRect(x - 19, y - 24, 2, 18); ctx.fillRect(x + 17, y - 24, 2, 18)
}
function drawPole (ctx: CanvasRenderingContext2D, name: string, x: number, y: number, hTiles: number) {
  const im = sprite(`kit/px/${name}.webp`); if (!im) return
  const h = TW * hTiles; const w = h * im.width / im.height
  ctx.drawImage(im, x - w / 2, y - h * 0.95, w, h)
}
function drawPx (ctx: CanvasRenderingContext2D, name: string, face: Face, x: number, y: number) {
  const im = sprite(`kit/px/${name}_${PX_VIEW[name][face]}.webp`); if (!im) return
  const w = (name === 'camion_reparto' ? 0.52 : 0.44) * TW; const h = w * im.height / im.width
  ctx.drawImage(im, x - w / 2, y - h * 0.75, w, h)
}
function drawCar (ctx: CanvasRenderingContext2D, c: Car, x: number, y: number, night: boolean) {
  if (c.skin.startsWith('px:')) {
    const face = c.axis === 'x' ? (c.dir > 0 ? 'SE' : 'NW') : (c.dir > 0 ? 'SW' : 'NE')
    const name = c.skin.slice(3); const im = sprite(`kit/px/${name}_${PX_VIEW[name][face]}.webp`)
    if (!im) return
    const w = (name === 'metrobus_rojo' ? 0.95 : /camion_rtp|trolebus/.test(name) ? 0.7 : /basura|pipa|microbus/.test(name) ? 0.55 : name === 'ambulancia' ? 0.48 : name === 'moto_repartidor' ? 0.26 : name === 'camion_reparto' ? 0.52 : 0.44) * TW; const h = w * im.height / im.width
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
function drawVida (ctx: CanvasRenderingContext2D, who: string, f: number, x: number, y: number, mirror: boolean) {
  const im = sprite(`kit/vida/${who}_${f}.webp`); if (!im) return
  const h = TW * (who === 'perro_callejero' || who === 'gato_barda' ? 0.2 : who === 'vendedor_globos' ? 0.38 : 0.28); const wd = h * im.width / im.height
  ctx.save(); ctx.translate(x, y); if (mirror) ctx.scale(-1, 1); ctx.drawImage(im, -wd / 2, -h, wd, h); ctx.restore()
}
function drawWalker (ctx: CanvasRenderingContext2D, w: Walker, x: number, y: number) {
  if (w.who.startsWith('vida:')) {
    const who = w.who.slice(5); const right = (w.axis === 'x' && w.dir > 0) || (w.axis === 'y' && w.dir < 0)
    drawVida(ctx, who, Math.floor(performance.now() / 160 + w.pos * 3) % 4, x, y, FACES_LEFT.has(who) ? right : !right)
    return
  }
  const im = sprite(`kit/polanco/${w.who}.webp`)
  if (!im) return
  const h = TW * 0.26; const wd = h * im.width / im.height
  // el dibujo mira hacia la izquierda: se refleja cuando camina hacia la derecha
  const right = (w.axis === 'x' && w.dir > 0) || (w.axis === 'y' && w.dir < 0)
  ctx.save(); ctx.translate(x, y + Math.sin(performance.now() / 140 + w.pos) * 0.8); if (right) ctx.scale(-1, 1)
  ctx.drawImage(im, -wd / 2, -h, wd, h); ctx.restore()
}
