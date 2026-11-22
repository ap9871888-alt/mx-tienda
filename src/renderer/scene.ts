// Calle Viva: escena isométrica en Canvas. Lee el estado del motor (solo lectura) y reacciona a sus eventos:
// cada cliente que el motor genera camina, hace fila, compra y sale con su bolsa.
import { box, tile, toScreen, shade, leftFaceQuad, rightFaceQuad, roundRect, TW, TH, OUTLINE, type Camera } from './iso'
import {
  drawPerson, drawCashier, drawVehicle, drawJacaranda, drawLamp, drawTrafficLight, drawBusStop, drawVendor,
  randomLook, randomVehicle, dirFrom, vehicleLength, type Look, type Dir, type VehicleLook
} from './sprites'
import { daylight, hourOf, isOpen, shelfCapacity, dateOfDay, dayOf } from '../engine'
import { PRODUCT_CATEGORIES } from '../data/categories'
import { colonyOf, HOUR_PROFILE } from '../data/cities'
import { ECONOMY } from '../data/economy'
import type { GameState, GameEvent, Store } from '../engine/types'
import { sprite, preload } from './assets'

// lotes de 2×2 para los edificios de relleno (tu arte), sin pisar la tienda ni la rival
const LOTS: { x: number; y: number; v: number }[] = []
{
  const add = (xs: number[], ys: number[]) => { for (const x of xs) for (const y of ys) LOTS.push({ x, y, v: Math.abs((x * 7 + y * 13) % 8) }) }
  add([3, 1, -1, -3, -5], [3, 1, -1, -3, -5]) // cuadra de la tienda
  add([9, 11, 13, 15], [3, 1, -1, -3, -5]) // cuadra noreste
  add([3, 1, -1, -3, -5], [9, 11, 13, 15]) // cuadra suroeste
}
const overlaps = (l: { x: number; y: number }, r: { x: number; y: number; w: number; d: number }) => l.x < r.x + r.w && l.x + 2 > r.x && l.y < r.y + r.d && l.y + 2 > r.y
const SPRITES = ['sprites/edificio-0-dia.webp', 'sprites/cliente-0.webp', 'sprites/camioneta-0.webp', 'sprites/camion-0.webp', 'sprites/moto-0.webp']

export interface SceneSource { game: () => GameState | null; storeId: () => number | null; speed: () => number }

type P = { x: number; y: number }
interface Agent {
  id: number; x: number; y: number; path: P[]; speed: number; look: Look; bag: boolean; phase: number; dir: Dir
  customerId?: number; mode: 'walk' | 'line' | 'inside' | 'leave'; angry?: number; carry?: 'box' | 'dolly' | null; uniform?: boolean; onArrive?: () => void
}
interface Car { id: number; lane: number; pos: number; v: VehicleLook; skin?: string; wait: number; parkAt?: number; parked?: number; bus?: boolean }
interface Bubble { text: string; x: number; y: number; z: number; t: number; kind: 'money' | 'happy' | 'bad' | 'info' }

// --- trazado de la calle ---
const ROAD = (v: number) => v >= 6 && v < 8
const WALK = (v: number) => (v >= 5 && v < 6) || (v >= 8 && v < 9)
const DOOR_OUT: P = { x: 4.1, y: 5.5 }
const DOOR: P = { x: 4.1, y: 5.05 }
const NODES: Record<string, P> = {
  w1: { x: -3, y: 5.5 }, w2: { x: -3, y: 8.5 }, e1: { x: 17, y: 5.5 }, e2: { x: 17, y: 8.5 },
  n1: { x: 5.5, y: -3 }, n2: { x: 8.5, y: -3 }, s1: { x: 5.5, y: 17 }, s2: { x: 8.5, y: 17 },
  c11: { x: 5.5, y: 5.5 }, c21: { x: 8.5, y: 5.5 }, c12: { x: 5.5, y: 8.5 }, c22: { x: 8.5, y: 8.5 }, door: DOOR_OUT
}
const EDGES: [string, string][] = [['w1', 'door'], ['door', 'c11'], ['c11', 'c21'], ['c21', 'e1'], ['w2', 'c12'], ['c12', 'c22'], ['c22', 'e2'],
  ['n1', 'c11'], ['c11', 'c12'], ['c12', 's1'], ['n2', 'c21'], ['c21', 'c22'], ['c22', 's2']]
const ENDS = ['w1', 'w2', 'e1', 'e2', 'n1', 'n2', 's1', 's2']
const ADJ: Record<string, string[]> = {}
for (const [a, b] of EDGES) { (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a) }
function route (from: string, to: string): P[] {
  const prev: Record<string, string | null> = { [from]: null }; const q = [from]
  while (q.length) { const n = q.shift()!; if (n === to) break; for (const m of ADJ[n]) if (!(m in prev)) { prev[m] = n; q.push(m) } }
  const out: P[] = []; let c: string | null = to
  while (c) { out.unshift(NODES[c]); c = prev[c] }
  return out
}

// edificios: [x, y, w, d, alto, color]
const BUILDINGS: [number, number, number, number, number, string][] = [
  [-3, -3, 3, 4, 3, '#E8A0BF'], [-3, 1, 3, 4, 2, '#F2C14E'], [0, -3, 3, 3, 2.5, '#7FB3D5'], [3, -3, 2, 3, 3.2, '#F4A261'],
  [0, 0, 2, 2, 2.2, '#A3C4BC'], [0, 2, 2, 3, 1.6, '#E76F51'], [2, 0, 3, 2, 2.6, '#C9B6E4'],
  [9, -3, 4, 4, 3.5, '#9BC1BC'], [13, -3, 4, 4, 2.4, '#F2C14E'], [9, 1, 3, 4, 2, '#E8A0BF'],
  [-3, 9, 4, 3, 2.2, '#7FB3D5'], [1, 9, 4, 3, 3, '#F4A261'], [-3, 12, 4, 5, 2.6, '#A3C4BC'], [1, 12, 4, 5, 1.8, '#E76F51']
]
const STORE = { x: 2, y: 2, w: 3, d: 3, h: 1.5 }
// fachada por formato: muro, toldo, letrero y altura
const LOOKS: Record<string, { wall: string; awning: [string, string]; sign: string; signBg: string; signFg: string; h: number; band?: string }> = {
  tiendita: { wall: '#F3E6CF', awning: ['#D63B2F', '#FFFFFF'], sign: 'TIENDA MX', signBg: '#D63B2F', signFg: '#F2B705', h: 1.5 },
  conveniencia: { wall: '#FFFFFF', awning: ['#D63B2F', '#F2B705'], sign: 'TIENDA MX 24/7', signBg: '#D63B2F', signFg: '#FFFFFF', h: 1.6, band: '#F2B705' },
  hardDiscount: { wall: '#F2B705', awning: ['#D63B2F', '#D63B2F'], sign: 'TMX AHORRO', signBg: '#D63B2F', signFg: '#FFFFFF', h: 1.8, band: '#D63B2F' },
  bodega: { wall: '#FFFFFF', awning: ['#2E7D5B', '#FFFFFF'], sign: 'BODEGA MX + FARMACIA', signBg: '#2E7D5B', signFg: '#FFFFFF', h: 1.9, band: '#2E7D5B' },
  darkStore: { wall: '#2B2D33', awning: ['#1B4D8F', '#1B4D8F'], sign: 'TMX 15 MIN', signBg: '#1B4D8F', signFg: '#FFFFFF', h: 1.5 }
}
const RIVAL = { x: 12, y: 1, w: 3, d: 4, h: 1.4 }
const TREES: P[] = [{ x: 1.2, y: 5.25 }, { x: 5.2, y: 1.6 }, { x: 11.5, y: 5.25 }, { x: 8.8, y: 11.2 }, { x: 2.3, y: 8.78 }, { x: 14.6, y: 8.78 }, { x: 10.6, y: 10.6 }, { x: 12.8, y: 11.4 }, { x: 11.2, y: 13.4 }]
// objetos sueltos: [sprite, x, y, alto px]
const PROPS: [string, number, number, number][] = [['bote', 6.6, 5.3, 26], ['banca', 12.4, 8.7, 28], ['hidrante', 2.6, 5.35, 20], ['bici', 7.4, 8.75, 30], ['cono', 13.9, 6.2, 16]]
const LAMPS: P[] = [{ x: 0.2, y: 5.15 }, { x: 8.85, y: 2.5 }, { x: 13.5, y: 5.15 }, { x: 5.15, y: 12.5 }, { x: 11, y: 8.85 }]
const LIGHTS: [P, 'A' | 'B'][] = [[{ x: 5.15, y: 5.15 }, 'A'], [{ x: 8.85, y: 5.15 }, 'B'], [{ x: 5.15, y: 8.85 }, 'B'], [{ x: 8.85, y: 8.85 }, 'A']]
// carriles: eje, coordenada fija, sentido, línea de alto
const LANES = [
  { axis: 'x' as const, fixed: 6.5, dir: 1, stop: 5.0 }, { axis: 'x' as const, fixed: 7.5, dir: -1, stop: 9.0 },
  { axis: 'y' as const, fixed: 7.5, dir: 1, stop: 5.0 }, { axis: 'y' as const, fixed: 6.5, dir: -1, stop: 9.0 }
]

export class StreetScene {
  private ctx: CanvasRenderingContext2D
  private cam: Camera = { ox: 0, oy: 0, zoom: 1 }
  private ground: HTMLCanvasElement | null = null
  private w = 0; private h = 0; private dpr = 1
  private raf = 0; private last = 0; private t = 0; private light = 0
  private agents: Agent[] = []; private cars: Car[] = []; private bubbles: Bubble[] = []
  private nextId = 1; private rnd = Math.random
  private cashierAnim = 0; private lastBubble = 0; private pendingMoney = 0; private pendingCount = 0
  private delivery: { stage: number; t: number; via: 'mayorista' | 'cedis' } | null = null
  private currentStore: number | null = null
  private ro: ResizeObserver

  constructor (private canvas: HTMLCanvasElement, private src: SceneSource) {
    this.ctx = canvas.getContext('2d')!
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    preload([...SPRITES, ...Array.from({ length: 8 }, (_, i) => `sprites/edificio-${i}-dia.webp`), ...Array.from({ length: 6 }, (_, i) => `sprites/cliente-${i}.webp`), ...[0, 1, 2, 3].map(i => `sprites/repartidor-${i}.webp`), ...[0, 1, 2, 3].map(i => `sprites/cajero-${i}.webp`), ...Array.from({ length: 6 }, (_, i) => `sprites/peaton-${i}.webp`),
      ...['jacaranda', 'arbol', 'poste-luz', 'semaforo-rojo', 'semaforo-amarillo', 'semaforo-verde', 'parada', 'puesto', 'bote', 'banca', 'hidrante', 'bici', 'cono'].map(n => `sprites/obj-${n}.webp`),
      ...['taxi', 'vocho', 'sedan-rojo', 'sedan-azul', 'pickup', 'micro', 'metrobus'].flatMap(n => [0, 1, 2, 3].map(i => `sprites/veh-${n}-${i}.webp`))])
    this.resize()
  }

  start () { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame) } }
  stop () { cancelAnimationFrame(this.raf); this.raf = 0 }
  destroy () { this.stop(); this.ro.disconnect() }

  private resize () {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height)
    this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr)
    this.cam.zoom = this.w / (10 * TW / 2)
    const cx = 4.8; const cy = 5.4
    this.cam.ox = this.w / 2 - (cx - cy) * (TW / 2) * this.cam.zoom
    this.cam.oy = this.h * 0.52 - (cx + cy) * (TH / 2) * this.cam.zoom
    this.ground = null
  }

  // ---------- eventos del motor ----------
  onEvents (events: GameEvent[]) {
    const sid = this.src.storeId()
    if (sid !== this.currentStore) { this.currentStore = sid; this.agents = this.agents.filter(a => a.customerId == null) }
    for (const e of events) {
      if (!('storeId' in e) || e.storeId !== sid) continue
      const customers = this.agents.filter(a => a.customerId != null).length
      if (e.type === 'arrive') {
        if (customers > 12) continue
        const from = this.rnd() < 0.5 ? 'w1' : ENDS[Math.floor(this.rnd() * ENDS.length)]
        this.spawn(route(from, 'door').concat([DOOR]), { customerId: e.customerId, mode: 'walk' })
      } else if (e.type === 'sale') {
        const a = this.agents.find(x => x.customerId === e.customerId)
        if (a) { a.mode = 'leave'; a.bag = true; a.customerId = undefined; a.path = [DOOR, DOOR_OUT, ...this.exitPath()] } else if (customers < 12) this.spawn([DOOR, DOOR_OUT, ...this.exitPath()], { bag: true, mode: 'leave' })
        this.cashierAnim = 0.8
        this.pendingMoney += e.amount; this.pendingCount++
        if (e.happy && this.rnd() < 0.05) this.bubble('⭐⭐⭐⭐⭐', DOOR.x - 1, DOOR.y, 2.2, 'happy')
      } else if (e.type === 'abandon' || e.type === 'balk') {
        const a = e.type === 'abandon' ? this.agents.find(x => x.customerId === e.customerId) : null
        if (a) { a.mode = 'leave'; a.angry = 2; a.path = this.exitPath(); a.customerId = undefined } else if (customers < 12) {
          const ag = this.spawn([NODES.w1, { x: 2.6, y: 5.6 }, NODES.w1], { mode: 'leave' }); ag.angry = 3
        }
      } else if (e.type === 'delivery') this.delivery = { stage: 0, t: 0, via: e.via }
    }
  }
  private exitPath () { return route('door', ENDS[Math.floor(this.rnd() * ENDS.length)]).slice(1) }
  private spawn (path: P[], o: Partial<Agent>): Agent {
    const a: Agent = { id: this.nextId++, x: path[0].x, y: path[0].y, path: path.slice(1), speed: 1.3 + this.rnd() * 0.5, look: randomLook(this.rnd), bag: false, phase: this.rnd() * 6, dir: 'SE', mode: 'walk', ...o }
    this.agents.push(a); return a
  }
  private bubble (text: string, x: number, y: number, z: number, kind: Bubble['kind']) {
    this.bubbles.push({ text, x: x + (this.rnd() - 0.5) * 1.2, y, z, t: 0, kind }); if (this.bubbles.length > 5) this.bubbles.shift()
  }

  // ---------- semáforos ----------
  private lightState (axis: 'A' | 'B'): 'green' | 'yellow' | 'red' {
    const c = this.light % 20
    if (axis === 'A') return c < 8 ? 'green' : c < 10 ? 'yellow' : 'red'
    return c >= 10 && c < 18 ? 'green' : c >= 18 ? 'yellow' : 'red'
  }

  // ---------- actualización ----------
  private year = 2027
  private update (dt: number, g: GameState | null, store: Store | undefined) {
    if (g) this.year = dateOfDay(dayOf(g.minute)).getUTCFullYear()
    const sp = this.src.speed()
    const vm = sp === 0 ? 0 : 1 + (sp - 1) * 0.35
    const d = dt * vm
    this.t += dt; this.light += d
    this.cashierAnim = Math.max(0, this.cashierAnim - dt)
    const minute = g?.minute ?? 720; const hour = hourOf(minute)
    // peatones ambientales según la hora y el tráfico de la colonia
    const traffic = store ? colonyOf(store.cityId, store.colonyId).traffic : 400
    const target = Math.round(Math.max(2, Math.min(9, (traffic / 75) * HOUR_PROFILE[hour])))
    const ambient = this.agents.filter(a => a.customerId == null && !a.uniform && !a.angry).length
    if (vm > 0 && ambient < target && this.rnd() < dt * 1.5) {
      const a = ENDS[Math.floor(this.rnd() * ENDS.length)]; let b = ENDS[Math.floor(this.rnd() * ENDS.length)]
      if (b === a) b = ENDS[(ENDS.indexOf(a) + 3) % ENDS.length]
      this.spawn(route(a, b), { mode: 'walk' })
    }
    // fila visible afuera: los últimos clientes de la cola esperan en la banqueta
    const queueIds = store ? store.queue.map(c => c.id) : []
    for (const a of this.agents) {
      if (a.customerId == null || a.mode === 'leave') continue
      const pos = queueIds.indexOf(a.customerId)
      if (pos < 0 && a.mode !== 'walk') { a.mode = 'leave'; a.path = this.exitPath(); continue }
      if (pos >= 3 && (a.mode === 'walk' && a.path.length <= 1)) { a.mode = 'line' }
      if (a.mode === 'line') {
        if (pos < 3) { a.mode = 'walk'; a.path = [DOOR_OUT, DOOR] } else a.path = [{ x: 3.6 - (pos - 3) * 0.42, y: 5.62 }]
      }
    }
    // mover agentes
    for (const a of this.agents) {
      a.angry = a.angry ? Math.max(0, a.angry - dt) : 0
      const tgt = a.path[0]
      if (!tgt) {
        if (a.mode === 'walk' && a.customerId != null) a.mode = 'inside'
        continue
      }
      // cruces peatonales: esperar el verde
      const crossingB = Math.abs(a.y - tgt.y) < 0.01 && ((a.x <= 5.6 && tgt.x >= 8.4) || (a.x >= 8.4 && tgt.x <= 5.6))
      const crossingA = Math.abs(a.x - tgt.x) < 0.01 && ((a.y <= 5.6 && tgt.y >= 8.4) || (a.y >= 8.4 && tgt.y <= 5.6))
      const atCurb = (crossingB && (Math.abs(a.x - 5.5) < 0.05 || Math.abs(a.x - 8.5) < 0.05)) || (crossingA && (Math.abs(a.y - 5.5) < 0.05 || Math.abs(a.y - 8.5) < 0.05))
      if (atCurb && ((crossingB && this.lightState('A') !== 'green') || (crossingA && this.lightState('B') !== 'green'))) { a.phase = -1; continue }
      const dx = tgt.x - a.x; const dy = tgt.y - a.y; const dist = Math.hypot(dx, dy)
      const step = a.speed * d * (a.mode === 'leave' && a.angry ? 1.4 : 1)
      if (dist <= step) { a.x = tgt.x; a.y = tgt.y; a.path.shift(); a.onArrive?.() } else { a.x += dx / dist * step; a.y += dy / dist * step }
      if (dist > 0.001) a.dir = dirFrom(dx, dy)
      a.phase = (Math.max(0, a.phase) + d * 9) % 6
    }
    this.agents = this.agents.filter(a => !(a.mode === 'leave' && !a.path.length) && !(a.customerId == null && a.mode === 'walk' && !a.path.length && !a.uniform))
    // si el cliente ya está dentro y desapareció de la cola sin evento (velocidad alta), se va
    if (this.agents.length > 60) this.agents.splice(0, this.agents.length - 60)
    // burbujas de dinero agrupadas
    if (this.pendingCount && this.t - this.lastBubble > 0.7) {
      this.bubble(`+$${Math.round(this.pendingMoney).toLocaleString('es-MX')} MXN`, DOOR.x, DOOR.y, 1.5, 'money')
      this.pendingMoney = 0; this.pendingCount = 0; this.lastBubble = this.t
    }
    for (const b of this.bubbles) b.t += dt
    this.bubbles = this.bubbles.filter(b => b.t < 1.6)
    this.updateCars(d, hour)
    this.updateDelivery(d)
  }

  private updateCars (d: number, hour: number) {
    const density = HOUR_PROFILE[hour]
    if (d > 0 && this.cars.length < 3 + density * 6 && this.rnd() < d * 0.9 * density) {
      const lane = Math.floor(this.rnd() * 4); const L = LANES[lane]
      const start = L.dir > 0 ? -4 : 18
      if (!this.cars.some(c => c.lane === lane && Math.abs(c.pos - start) < 2.5)) {
        const bus = lane === 1 && this.rnd() < 0.12
        const v: VehicleLook = bus ? { kind: 'bus', color: '#D63B2F' } : randomVehicle(this.rnd)
        // antes de 2014 los taxis eran vochos verdes; antes de 2005 no había Metrobús
        const skin = bus ? (this.year >= 2005 ? 'metrobus' : 'micro')
          : v.kind === 'taxi' ? (this.year >= 2014 ? 'taxi' : 'vocho-taxi')
            : v.kind === 'vocho' ? 'vocho' : v.kind === 'car' ? ['sedan-rojo', 'sedan-azul', 'pickup', 'sedan-rojo'][Math.floor(this.rnd() * 4)] : undefined
        if (skin === 'vocho-taxi') v.color = '#3E9E4A'
        this.cars.push({ id: this.nextId++, lane, pos: start, v, skin, wait: 0, bus, parkAt: bus ? 11.6 : undefined })
      }
    }
    for (const c of this.cars) {
      const L = LANES[c.lane]; const len = vehicleLength(c.v.kind)
      const front = c.pos + L.dir * len / 2
      let speed = (c.v.kind === 'bus' ? 1.6 : c.v.kind === 'moto' ? 2.8 : 2.3) * d
      const axisLight = L.axis === 'x' ? 'A' : 'B'
      const beforeStop = L.dir > 0 ? front <= L.stop + 0.05 : front >= L.stop - 0.05
      const distStop = Math.abs(L.stop - front)
      if (beforeStop && distStop < 0.6 && this.lightState(axisLight) !== 'green') speed = 0
      // estacionado (Metrobús en su parada / camioneta)
      if (c.parkAt != null && c.parked == null && Math.abs(c.pos - c.parkAt) < 0.15) c.parked = 3
      if (c.parked != null && c.parked > 0) { c.parked -= d; speed = 0; if (c.parked <= 0) c.parkAt = undefined }
      if (c.v.kind === 'van' && this.delivery && this.delivery.stage < 3 && c.parkAt != null && Math.abs(c.pos - c.parkAt) < 0.1) speed = 0
      // distancia con el de enfrente
      for (const o of this.cars) {
        if (o === c || o.lane !== c.lane) continue
        const gap = (o.pos - c.pos) * L.dir
        if (gap > 0 && gap < (len + vehicleLength(o.v.kind)) / 2 + 0.35) speed = 0
      }
      c.pos += L.dir * speed
    }
    this.cars = this.cars.filter(c => c.pos > -6 && c.pos < 20)
  }

  private updateDelivery (d: number) {
    const dv = this.delivery
    if (!dv) return
    if (dv.stage === 0) {
      this.cars.push({ id: this.nextId++, lane: 0, pos: -4, v: { kind: 'van', color: dv.via === 'cedis' ? '#1B4D8F' : '#E9E4DA' }, wait: 0, parkAt: 3.7 })
      dv.stage = 1
    }
    const van = this.cars.find(c => c.v.kind === 'van' && c.parkAt === 3.7)
    if (dv.stage === 1 && van && Math.abs(van.pos - 3.7) < 0.15) {
      dv.stage = 2
      const carrier = this.spawn([{ x: 3.4, y: 6.1 }, { x: 3.6, y: 5.5 }, DOOR_OUT, DOOR], { mode: 'walk', uniform: true, carry: 'box', look: { skin: '#A0673D', shirt: '#E9DCC4', pants: '#2F4A7A', hair: '#111', long: false } })
      carrier.speed = 1.1
      carrier.onArrive = () => {
        if (carrier.path.length === 0) {
          carrier.carry = 'dolly'; carrier.path = [DOOR_OUT, { x: 3.6, y: 5.5 }, { x: 3.4, y: 6.1 }]
          carrier.mode = 'leave'
          this.bubble('📦 ¡Resurtido!', DOOR.x, DOOR.y, 1.6, 'info')
          carrier.onArrive = () => { if (!carrier.path.length && this.delivery) this.delivery.stage = 3 }
        }
      }
    }
    if (dv.stage === 3) { if (van) { van.parkAt = undefined; van.parked = undefined } this.delivery = null }
    dv.t += d
    if (dv.t > 40) { if (van) van.parkAt = undefined; this.delivery = null }
  }

  // ---------- dibujo ----------
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now
    const g = this.src.game(); const sid = this.src.storeId()
    const store = g && sid != null ? g.stores.find(s => s.id === sid) : undefined
    this.update(dt, g, store)
    this.draw(g, store)
    this.raf = requestAnimationFrame(this.frame)
  }

  private buildGround () {
    const c = document.createElement('canvas')
    c.width = this.canvas.width; c.height = this.canvas.height
    const ctx = c.getContext('2d')!
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const cam = this.cam
    ctx.fillStyle = '#CFC9BD'; ctx.fillRect(0, 0, this.w, this.h)
    for (let gx = -6; gx < 20; gx++) {
      for (let gy = -6; gy < 20; gy++) {
        const road = ROAD(gx) || ROAD(gy)
        const walk = !road && (WALK(gx) || WALK(gy)) && gx >= -6
        const park = gx >= 9 && gy >= 9
        let col = '#D9D2C4'
        if (road) col = ROAD(gx) && ROAD(gy) ? '#3A3D44' : '#40434B'
        else if (walk) col = '#C9C2B4'
        else if (park) col = (gx + gy) % 2 ? '#8CBF6E' : '#86B868'
        tile(ctx, cam, gx, gy, col, road ? null : 'rgba(43,45,51,.12)')
        // pasos de cebra
        const zebra = (ROAD(gx) && WALK(gy)) || (ROAD(gy) && WALK(gx))
        if (zebra && !(ROAD(gx) && ROAD(gy))) {
          ctx.save()
          const vertical = ROAD(gx) // cruza el eje x
          for (let k = 0; k < 4; k++) {
            const a = vertical ? gx + 0.1 + k * 0.22 : gx + 0.15; const b = vertical ? gy + 0.15 : gy + 0.1 + k * 0.22
            const w = vertical ? 0.12 : 0.7; const h = vertical ? 0.7 : 0.12
            const p = [toScreen(cam, a, b), toScreen(cam, a + w, b), toScreen(cam, a + w, b + h), toScreen(cam, a, b + h)]
            ctx.beginPath(); ctx.moveTo(p[0].sx, p[0].sy); for (const q of p.slice(1)) ctx.lineTo(q.sx, q.sy); ctx.fillStyle = '#F7F5F0'; ctx.fill()
          }
          ctx.restore()
        }
      }
    }
    // línea central amarilla
    ctx.strokeStyle = '#F2B705'; ctx.lineWidth = 1.6 * cam.zoom; ctx.setLineDash([8 * cam.zoom, 8 * cam.zoom])
    for (const [a, b] of [[[-6, 7], [5, 7]], [[9, 7], [20, 7]], [[7, -6], [7, 5]], [[7, 9], [7, 20]]] as [number, number][][]) {
      const p = toScreen(cam, a[0], a[1]); const q = toScreen(cam, b[0], b[1])
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy); ctx.stroke()
    }
    ctx.setLineDash([])
    // pétalos de jacaranda
    for (const t of TREES) for (let i = 0; i < 12; i++) {
      const p = toScreen(cam, t.x + Math.sin(i * 7.1) * 0.7, t.y + Math.cos(i * 3.3) * 0.5)
      ctx.fillStyle = 'rgba(155,111,209,.55)'; ctx.beginPath(); ctx.arc(p.sx, p.sy, 1.6 * cam.zoom, 0, Math.PI * 2); ctx.fill()
    }
    this.ground = c
  }

  private draw (g: GameState | null, store: Store | undefined) {
    const ctx = this.ctx; const cam = this.cam
    if (!this.ground) this.buildGround()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.ground!, 0, 0)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const minute = g?.minute ?? 720
    const day = daylight(minute)
    const open = store ? isOpen(store, hourOf(minute)) : false
    const glows: { sx: number; sy: number; r: number; c: string }[] = []
    // objetos ordenados por profundidad
    const items: { k: number; f: () => void }[] = []
    for (const l of LOTS) {
      if (overlaps(l, STORE) || overlaps(l, RIVAL)) continue
      const img = sprite(`sprites/edificio-${l.v}-${day < 0.45 ? 'noche' : 'dia'}.webp`)
      if (img) items.push({ k: l.x + l.y + 3, f: () => this.drawAnchored(img, l.x + 2, l.y + 2, 2 * TW * cam.zoom * 1.02) })
      else this.pushBuilding(items, l.x, l.y, 2, 2, 2, ['#E8A0BF', '#F2C14E', '#7FB3D5', '#F4A261', '#A3C4BC', '#E76F51', '#C9B6E4', '#9BC1BC'][l.v], day, glows)
    }
    void BUILDINGS
    this.pushStore(items, store, open, day, glows)
    this.pushRival(items, day, glows)
    TREES.forEach((t, i) => items.push({ k: t.x + t.y, f: () => { if (!this.prop(i % 3 === 2 ? 'arbol' : 'jacaranda', t.x, t.y, i % 3 === 2 ? 96 : 112)) drawJacaranda(ctx, cam, t.x, t.y) } }))
    for (const l of LAMPS) items.push({ k: l.x + l.y, f: () => {
      const z = cam.zoom; const q = toScreen(cam, l.x, l.y)
      const p = this.prop('poste-luz', l.x, l.y, 92) ? { sx: q.sx, sy: q.sy - 86 * z } : drawLamp(ctx, cam, l.x, l.y)
      if (day < 0.6) glows.push({ sx: p.sx, sy: p.sy, r: 46 * z, c: '255,214,120' })
    } })
    for (const [p, ax] of LIGHTS) items.push({ k: p.x + p.y, f: () => {
      const st = this.lightState(ax); const z = cam.zoom; const q = toScreen(cam, p.x, p.y)
      const name = st === 'green' ? 'semaforo-verde' : st === 'yellow' ? 'semaforo-amarillo' : 'semaforo-rojo'
      const sp = this.prop(name, p.x, p.y, 66) ? { sx: q.sx, sy: q.sy - 56 * z, color: st === 'green' ? '#34C759' : st === 'yellow' ? '#FFCC00' : '#FF3B30' } : drawTrafficLight(ctx, cam, p.x, p.y, st)
      glows.push({ sx: sp.sx, sy: sp.sy, r: 8 * z, c: sp.color === '#FF3B30' ? '255,59,48' : sp.color === '#34C759' ? '52,199,89' : '255,204,0' })
    } })
    items.push({ k: 11.5 + 8.6, f: () => { if (!this.prop('parada', 11, 8.55, 70)) drawBusStop(ctx, cam, 11, 8.55) } })
    items.push({ k: 9.6 + 9.6, f: () => { if (!this.prop('puesto', 9.3, 9.3, 64)) drawVendor(ctx, cam, 9.3, 9.3, this.t) } })
    for (const [n, x, y, h] of PROPS) items.push({ k: x + y, f: () => { this.prop(n, x, y, h) } })
    for (const c of this.cars) {
      const L = LANES[c.lane]; const x = L.axis === 'x' ? c.pos : L.fixed; const y = L.axis === 'x' ? L.fixed : c.pos
      items.push({ k: x + y, f: () => { if (!this.drawVehicleSprite(c, x, y, L.axis, L.dir)) drawVehicle(ctx, cam, x, y, L.axis, c.v, day < 0.5); if (day < 0.5) { const s = toScreen(cam, x, y, 6); glows.push({ sx: s.sx, sy: s.sy, r: 18 * cam.zoom, c: '255,240,180' }) } } })
    }
    const s = cam.zoom * 0.95
    for (const a of this.agents) {
      if (a.mode === 'inside') continue
      items.push({ k: a.x + a.y + 0.05, f: () => {
        const p = toScreen(cam, a.x, a.y)
        const fr = a.mode === 'line' || a.phase < 0 ? -1 : Math.floor(a.phase)
        if (!this.drawPersonSprite(a, p.sx, p.sy, fr)) drawPerson(ctx, p.sx, p.sy, s, a.dir, fr, a.look, { bag: a.bag, carry: a.carry, uniform: a.uniform })
        if (a.angry) { ctx.font = `${14 * cam.zoom}px system-ui`; ctx.fillText('😤', p.sx - 7 * cam.zoom, p.sy - 38 * cam.zoom) }
      } })
    }
    items.sort((a, b) => a.k - b.k)
    for (const it of items) it.f()
    // noche
    const dark = (1 - day) * 0.55
    if (dark > 0.01) {
      ctx.fillStyle = `rgba(14,20,48,${dark})`; ctx.fillRect(0, 0, this.w, this.h)
      ctx.globalCompositeOperation = 'lighter'
      for (const gl of glows) {
        const gr = ctx.createRadialGradient(gl.sx, gl.sy, 0, gl.sx, gl.sy, gl.r)
        gr.addColorStop(0, `rgba(${gl.c},${0.55 * (1 - day)})`); gr.addColorStop(1, `rgba(${gl.c},0)`)
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gl.sx, gl.sy, gl.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    } else if (day < 1) { ctx.fillStyle = `rgba(242,140,5,${(1 - day) * 0.08})`; ctx.fillRect(0, 0, this.w, this.h) }
    // burbujas
    for (const b of this.bubbles) {
      const p = toScreen(cam, b.x, b.y, b.z * TH)
      const y = p.sy - b.t * 34
      const alpha = b.t < 0.15 ? b.t / 0.15 : 1 - Math.max(0, b.t - 1.1) / 0.5
      this.pill(p.sx, y, b.text, b.kind, alpha)
    }
    // alertas fijas sobre la tienda
    if (store) {
      const alerts: [string, Bubble['kind']][] = []
      if (!store.cashiers.length && !store.selfCheckouts) alerts.push(['👤 Sin cajeros', 'bad'])
      if (store.queue.length > ECONOMY.queueTolerance) alerts.push(['⏱️ ¡Fila larga!', 'bad'])
      if (PRODUCT_CATEGORIES.some(c => store.inventory[c.id] < shelfCapacity(store) * 0.15)) alerts.push(['📦 ¡Reabastecer!', 'info'])
      if (!open) alerts.push(['🔒 Cerrado', 'info'])
      const top = toScreen(cam, STORE.x + 1.5, STORE.y + 1.5, (LOOKS[store.formatId].h + 0.9) * TH)
      const y0 = Math.max(18 + (alerts.length - 1) * 24, top.sy)
      alerts.forEach(([txt, k], i) => this.pill(top.sx, y0 - i * 24, txt, k, 1))
      // la caja: el cajero con sus 4 fotogramas, en una ventanita
      const fr = this.cashierAnim > 0 ? 3 - Math.min(3, Math.floor(this.cashierAnim / 0.2)) : 1
      const cj = store.cashiers.length ? sprite(`sprites/cajero-${fr}.webp`) : null
      if (cj) {
        const w = 74; const h = w * cj.height / cj.width
        ctx.save(); roundRect(ctx, 8, 8, w + 12, h + 22, 12); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.strokeStyle = '#E6E0D4'; ctx.stroke()
        ctx.drawImage(cj, 14, 12, w, h)
        ctx.font = '700 10px Archivo, system-ui'; ctx.fillStyle = '#2B2D33'; ctx.textAlign = 'center'; ctx.fillText(`Caja · ${store.queue.length} en fila`, 14 + w / 2, h + 24); ctx.restore()
      }
    }
  }

  // dibuja un sprite con su borde inferior en la esquina frontal (x, y) del lote
  private drawAnchored (img: HTMLImageElement, x: number, y: number, width: number) {
    const p = toScreen(this.cam, x, y)
    const h = width * img.height / img.width
    this.ctx.drawImage(img, p.sx - width / 2, p.sy - h + 2 * this.cam.zoom, width, h)
  }
  private drawPersonSprite (a: Agent, sx: number, sy: number, frame: number) {
    const z = this.cam.zoom; const ctx = this.ctx
    if (a.uniform) {
      const img = sprite(`sprites/repartidor-${a.carry === 'dolly' ? (frame < 0 ? 1 : 1 + (frame % 2)) : 0}.webp`)
      if (!img) return false
      const h = 40 * z; const w = h * img.width / img.height
      const flip = a.dir === 'SW' || a.dir === 'NW'
      ctx.save(); ctx.translate(sx, sy); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore()
      return true
    }
    // con bolsa: cliente que ya compró; sin bolsa: peatón
    const sheet = (!a.bag && a.customerId == null && sprite(`sprites/peaton-${a.id % 6}.webp`)) || sprite(`sprites/cliente-${a.id % 6}.webp`)
    if (!sheet) return false
    const cw = sheet.width / 6; const ch = sheet.height / 4
    const row = a.dir === 'SE' || a.dir === 'SW' ? 0 : 2
    const flip = a.dir === 'SW' || a.dir === 'NE'
    const col = frame < 0 ? 0 : frame % 6
    const h = 38 * z; const w = h * cw / ch
    ctx.save(); ctx.translate(sx, sy)
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 7 * z, 2.6 * z, 0, 0, Math.PI * 2); ctx.fill()
    if (flip) ctx.scale(-1, 1)
    ctx.drawImage(sheet, col * cw, row * ch, cw, ch, -w / 2, -h, w, h)
    ctx.restore()
    if (a.angry) { ctx.font = `${14 * z}px system-ui`; ctx.fillText('😤', sx - 7 * z, sy - 44 * z) }
    return true
  }
  // objeto de calle anclado por la base; alto en px a zoom 1
  private prop (name: string, x: number, y: number, hPx: number) {
    const img = sprite(`sprites/obj-${name}.webp`)
    if (!img) return false
    const z = this.cam.zoom; const p = toScreen(this.cam, x, y)
    const h = hPx * z; const w = h * img.width / img.height
    this.ctx.drawImage(img, p.sx - w / 2, p.sy - h + 2 * z, w, h)
    return true
  }
  private drawVehicleSprite (c: Car, x: number, y: number, axis: 'x' | 'y', dir: number) {
    if (c.skin) {
      const sk = c.skin === 'vocho-taxi' ? 'vocho' : c.skin
      // columnas de la lámina: 0 SE (+x), 1 SW (+y), 2 NE (−y), 3 NW (−x)
      const col = axis === 'x' ? (dir > 0 ? 0 : 3) : (dir > 0 ? 1 : 2)
      const img = sprite(`sprites/veh-${sk}-${col}.webp`)
      if (img) {
        const z = this.cam.zoom; const p = toScreen(this.cam, x, y)
        const width = (sk === 'metrobus' ? 2.5 : sk === 'micro' ? 2 : sk === 'pickup' ? 1.35 : sk === 'vocho' ? 1.05 : 1.2) * TW * z
        const h = width * img.height / img.width
        if (c.skin === 'vocho-taxi') this.ctx.filter = 'hue-rotate(95deg) saturate(1.3)'
        this.ctx.drawImage(img, p.sx - width / 2, p.sy - h * 0.72, width, h)
        this.ctx.filter = 'none'
        return true
      }
    }
    const kind = c.v.kind
    const name = kind === 'van' ? (c.v.color === '#1B4D8F' ? 'camion-0' : 'camioneta-0') : kind === 'moto' ? 'moto-0' : ''
    if (!name) return false
    const img = sprite(`sprites/${name}.webp`)
    if (!img) return false
    const z = this.cam.zoom; const p = toScreen(this.cam, x, y)
    const width = (name === 'camion-0' ? 2.1 : name === 'camioneta-0' ? 1.6 : 0.7) * TW * z
    const h = width * img.height / img.width
    // los sprites miran hacia +x (abajo a la derecha); se reflejan para los otros sentidos
    const flip = (axis === 'x' && dir < 0) || (axis === 'y' && dir > 0)
    this.ctx.save(); this.ctx.translate(p.sx, p.sy + h * 0.28); if (flip) this.ctx.scale(-1, 1)
    this.ctx.drawImage(img, -width / 2, -h, width, h); this.ctx.restore()
    return true
  }

  private pill (x: number, y: number, text: string, kind: Bubble['kind'], alpha: number) {
    const ctx = this.ctx
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
    ctx.font = '700 12px Archivo, system-ui, sans-serif'
    const w = ctx.measureText(text).width + 16
    const colors = { money: ['#E9F8EE', '#2E7D5B', '#1E6B45'], happy: ['#FFF6CC', '#F2B705', '#6A4D00'], bad: ['#D63B2F', '#9E2A21', '#FFFFFF'], info: ['#FFFFFF', '#1B4D8F', '#1B4D8F'] }[kind]
    roundRect(ctx, x - w / 2, y - 12, w, 22, 11)
    ctx.fillStyle = colors[0]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = colors[1]; ctx.stroke()
    ctx.fillStyle = colors[2]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y)
    ctx.restore()
  }

  private pushBuilding (items: { k: number; f: () => void }[], bx: number, by: number, bw: number, bd: number, bh: number, col: string, day: number, glows: { sx: number; sy: number; r: number; c: string }[]) {
    const ctx = this.ctx; const cam = this.cam
    for (let i = bx; i < bx + bw; i++) for (let j = by; j < by + bd; j++) {
      const isLeft = j === by + bd - 1; const isRight = i === bx + bw - 1
      items.push({ k: i + j + 1, f: () => {
        box(ctx, cam, i, j, 1, 1, bh, col, { left: isLeft, right: isRight, lw: 0.7 })
        const floors = Math.floor(bh / 0.9)
        for (let f = 0; f < floors; f++) {
          const lit = day < 0.5 && ((i * 7 + j * 3 + f) % 3 !== 0)
          const wc = lit ? '#FFD98A' : '#BFE3F2'
          if (isLeft) { leftFaceQuad(ctx, cam, j + 1, i + 0.3, i + 0.7, f * 0.9 + 0.3, f * 0.9 + 0.7, wc, shade(col, -0.5)); if (lit) { const p = toScreen(cam, i + 0.5, j + 1, (f * 0.9 + 0.5) * TH); glows.push({ sx: p.sx, sy: p.sy, r: 12 * cam.zoom, c: '255,200,120' }) } }
          if (isRight) rightFaceQuad(ctx, cam, i + 1, j + 0.3, j + 0.7, f * 0.9 + 0.3, f * 0.9 + 0.7, wc, shade(col, -0.5))
        }
        if ((i * 5 + j) % 4 === 0) { // tinaco
          const p = toScreen(cam, i + 0.5, j + 0.5, bh * TH)
          ctx.fillStyle = '#2B2D33'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy - 8 * cam.zoom, 6 * cam.zoom, 3 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill()
          ctx.fillRect(p.sx - 6 * cam.zoom, p.sy - 8 * cam.zoom, 12 * cam.zoom, 8 * cam.zoom)
        }
      } })
    }
  }

  private pushStore (items: { k: number; f: () => void }[], store: Store | undefined, open: boolean, day: number, glows: { sx: number; sy: number; r: number; c: string }[]) {
    const ctx = this.ctx; const cam = this.cam; const S = STORE
    if (!store) { this.pushBuilding(items, S.x, S.y, S.w, S.d, 1.3, '#D9D2C4', day, glows); items.push({ k: 9.1, f: () => this.faceText(S.y + S.d, S.x + 0.2, 0.9, 'SE RENTA', '#2B2D33', '#F7F5F0') }); return }
    const L = LOOKS[store.formatId]
    const stImg = sprite(`sprites/tienda-${store.formatId}-${open ? 'dia' : 'cerrada'}.webp`)
    if (stImg) {
      items.push({ k: S.x + S.w - 1 + S.y + S.d - 1 + 1, f: () => {
        this.drawAnchored(stImg, S.x + S.w, S.y + S.d, 3 * TW * cam.zoom * 1.04)
        if (open && day < 0.6) { const p = toScreen(cam, S.x + 1.5, S.y + S.d, 0.8 * TH); glows.push({ sx: p.sx, sy: p.sy, r: 70 * cam.zoom, c: '255,220,150' }) }
      } })
      return
    }
    for (let i = S.x; i < S.x + S.w; i++) for (let j = S.y; j < S.y + S.d; j++) {
      const isLeft = j === S.y + S.d - 1; const isRight = i === S.x + S.w - 1
      items.push({ k: i + j + 1, f: () => {
        box(ctx, cam, i, j, 1, 1, L.h, L.wall, { left: isLeft, right: isRight, lw: 0.7 })
        if (L.band) { if (isLeft) leftFaceQuad(ctx, cam, S.y + S.d, i, i + 1, L.h - 0.22, L.h, L.band, null); if (isRight) rightFaceQuad(ctx, cam, S.x + S.w, j, j + 1, L.h - 0.22, L.h, L.band, null) }
        const yF = S.y + S.d
        if (isLeft) {
          // zoclo rojo
          leftFaceQuad(ctx, cam, yF, i, i + 1, 0, 0.12, '#D63B2F', null)
          if (i === S.x + S.w - 1) { // puerta de vidrio
            leftFaceQuad(ctx, cam, yF, i + 0.15, i + 0.6, 0, 0.95, open ? '#CDE8F5' : '#7E8590')
            if (!open) for (let k = 1; k < 9; k++) leftFaceQuad(ctx, cam, yF, i + 0.15, i + 0.6, k * 0.1, k * 0.1 + 0.01, '#5B616B', null)
          } else { // ventana con anaqueles y cajero
            leftFaceQuad(ctx, cam, yF, i + 0.1, i + 0.9, 0.2, 0.95, open ? (day < 0.5 ? '#FFF1C9' : '#FFF8E6') : '#7E8590')
            if (open) {
              const cols = ['#D63B2F', '#1B4D8F', '#F2B705', '#2E7D5B']
              for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) leftFaceQuad(ctx, cam, yF, i + 0.15 + k * 0.18, i + 0.28 + k * 0.18, 0.28 + r * 0.22, 0.4 + r * 0.22, cols[(k + r + i) % 4], null)
              if (i === S.x + 1) {
                const p = toScreen(cam, i + 0.5, yF, 0.25 * TH)
                const fr = this.cashierAnim > 0 ? 3 - Math.min(3, Math.floor(this.cashierAnim / 0.2)) : 1
                if (store.cashiers.length) drawCashier(ctx, p.sx, p.sy, cam.zoom * 0.8, fr)
              }
              if (day < 0.6) { const p = toScreen(cam, i + 0.5, yF, 0.6 * TH); glows.push({ sx: p.sx, sy: p.sy, r: 34 * cam.zoom, c: '255,230,170' }) }
            } else for (let k = 1; k < 8; k++) leftFaceQuad(ctx, cam, yF, i + 0.1, i + 0.9, 0.2 + k * 0.1, 0.21 + k * 0.1, '#5B616B', null)
          }
        }
        if (isRight) {
          const xF = S.x + S.w
          rightFaceQuad(ctx, cam, xF, j, j + 1, 0, 0.12, '#D63B2F', null)
          if (j === S.y + 1) { // refrigerador de bebidas
            rightFaceQuad(ctx, cam, xF, j + 0.15, j + 0.85, 0.15, 0.95, open ? '#BFE3F2' : '#7E8590')
            if (open) for (let k = 0; k < 3; k++) rightFaceQuad(ctx, cam, xF, j + 0.2, j + 0.8, 0.3 + k * 0.22, 0.38 + k * 0.22, ['#D63B2F', '#2E7D5B', '#F2B705'][k], null)
          } else rightFaceQuad(ctx, cam, xF, j + 0.1, j + 0.9, 0.55, 0.95, '#F2B705', null)
        }
      } })
    }
    // toldo, letrero LED y tinaco
    items.push({ k: S.x + S.w - 1 + S.y + S.d - 1 + 1.02, f: () => {
      const yF = S.y + S.d
      for (let k = 0; k < 12; k++) {
        const x0 = S.x + k * (S.w / 12); const x1 = x0 + S.w / 12
        const p = [toScreen(cam, x0, yF, 1.12 * TH), toScreen(cam, x1, yF, 1.12 * TH), toScreen(cam, x1, yF + 0.35, 0.95 * TH), toScreen(cam, x0, yF + 0.35, 0.95 * TH)]
        ctx.beginPath(); ctx.moveTo(p[0].sx, p[0].sy); for (const q of p.slice(1)) ctx.lineTo(q.sx, q.sy); ctx.closePath()
        ctx.fillStyle = k % 2 ? L.awning[1] : L.awning[0]; ctx.fill()
      }
      const a = toScreen(cam, S.x, yF + 0.35, 0.95 * TH); const b = toScreen(cam, S.x + S.w, yF + 0.35, 0.95 * TH)
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke()
      this.faceText(yF, S.x + 0.15, Math.min(L.h - 0.05, 1.3), L.sign, L.signBg, L.signFg, open && day < 0.6 ? glows : undefined)
      const t = toScreen(cam, S.x + 0.7, S.y + 0.7, L.h * TH)
      ctx.fillStyle = '#2B2D33'; ctx.beginPath(); ctx.ellipse(t.sx, t.sy - 10 * cam.zoom, 7 * cam.zoom, 3.5 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(t.sx - 7 * cam.zoom, t.sy - 10 * cam.zoom, 14 * cam.zoom, 10 * cam.zoom)
    } })
  }

  private pushRival (items: { k: number; f: () => void }[], day: number, glows: { sx: number; sy: number; r: number; c: string }[]) {
    const R = RIVAL; const ctx = this.ctx; const cam = this.cam
    this.pushBuilding(items, R.x, R.y, R.w, R.d, R.h, '#ECECEC', 1, [])
    items.push({ k: R.x + R.w - 1 + R.y + R.d - 1 + 1.03, f: () => {
      const yF = R.y + R.d
      leftFaceQuad(ctx, cam, yF, R.x, R.x + R.w, 1.0, 1.35, '#D63B2F', OUTLINE)
      leftFaceQuad(ctx, cam, yF, R.x, R.x + R.w, 0.92, 1.0, '#F2B705', null)
      leftFaceQuad(ctx, cam, yF, R.x + 0.3, R.x + R.w - 0.3, 0.1, 0.85, day < 0.5 ? '#FFF1C9' : '#CDE8F5')
      this.faceText(yF, R.x + 0.9, 1.07, '24/7', '#FFFFFF', '#D63B2F', day < 0.6 ? glows : undefined)
    } })
  }

  // texto pintado sobre la cara izquierda (plano y = yFace)
  private faceText (yFace: number, x: number, z: number, text: string, bg: string, fg: string, glows?: { sx: number; sy: number; r: number; c: string }[]) {
    const ctx = this.ctx; const cam = this.cam
    const p = toScreen(cam, x, yFace, z * TH)
    ctx.save()
    ctx.setTransform(this.dpr, this.dpr * 0.5, 0, this.dpr, p.sx * this.dpr, p.sy * this.dpr)
    ctx.font = `800 ${11 * cam.zoom}px "Archivo Black", Archivo, sans-serif`
    const w = ctx.measureText(text).width + 10 * cam.zoom
    ctx.fillStyle = bg; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1
    ctx.fillRect(0, -14 * cam.zoom, w, 15 * cam.zoom); ctx.strokeRect(0, -14 * cam.zoom, w, 15 * cam.zoom)
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, 5 * cam.zoom, -6.5 * cam.zoom)
    ctx.restore()
    if (glows) glows.push({ sx: p.sx + w / 2, sy: p.sy, r: 40 * cam.zoom, c: '255,90,70' })
  }
}
