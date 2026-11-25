// Laboratorio de inventos y reparto a domicilio (Hito 4).
import { nextRandom } from './rng'
import type { GameState, Result } from './types'

const ok = (msg = ''): Result => ({ ok: true, msg })
const fail = (msg: string): Result => ({ ok: false, msg })
const dayOf = (s: GameState) => Math.floor(s.minute / 1440)
const say = (s: GameState, text: string, kind: 'info' | 'good' | 'bad') => { s.log.unshift({ minute: s.minute, text, kind }); if (s.log.length > 60) s.log.length = 60 }

// ---------- laboratorio ----------
export interface InventionDef { id: string; name: string; desc: string; cost: number; days: number; chance: number; effect: string; icon: string }
export const INVENTIONS: InventionDef[] = [
  { id: 'app', name: 'App de pedidos TMX', desc: 'Tus clientes piden desde el celular.', cost: 600000, days: 30, chance: 0.75, effect: '+6 % clientes en todas tus tiendas y desbloquea pedidos por app', icon: 'ic-tiendas' },
  { id: 'bebida', name: 'Bebida energética de la casa', desc: 'Receta propia con sabor a tamarindo.', cost: 350000, days: 20, chance: 0.65, effect: '+15 % ventas de bebidas', icon: 'ic-precios' },
  { id: 'lealtad', name: 'Tarjeta de puntos', desc: 'Cada compra suma puntos canjeables.', cost: 250000, days: 15, chance: 0.85, effect: '+8 % satisfacción y clientes que regresan', icon: 'ic-logros' },
  { id: 'caja-ia', name: 'Caja inteligente con IA', desc: 'Cobra sola reconociendo los productos.', cost: 1500000, days: 45, chance: 0.55, effect: '+25 % rapidez de cobro en todas tus tiendas', icon: 'ic-ajustes' },
  { id: 'drones', name: 'Drones de reparto', desc: 'Entregas por aire en 10 minutos.', cost: 3000000, days: 60, chance: 0.5, effect: 'Pedidos a domicilio ×2 sin sueldo de repartidor', icon: 'ic-viajar' },
  { id: 'solar', name: 'Techos solares', desc: 'Paneles en todas tus tiendas.', cost: 900000, days: 30, chance: 0.9, effect: '−60 % del recibo de luz', icon: 'ic-interior' },
  { id: 'empaque', name: 'Empaque compostable', desc: 'Bolsas y charolas que se deshacen solas.', cost: 400000, days: 25, chance: 0.8, effect: '+0.3 reputación y mejor opinión pública', icon: 'ic-trato' }
]
export interface LabState { active: { id: string; end: number } | null; done: string[]; failed: string[] }
export const lab = (s: GameState): LabState => (s.lab ??= { active: null, done: [], failed: [] })
export const hasInvention = (s: GameState, id: string) => !!s.lab?.done.includes(id)

export function startInvention (s: GameState, id: string): Result {
  const L = lab(s); const d = INVENTIONS.find(x => x.id === id)!
  if (L.active) return fail('El laboratorio ya está trabajando en otro invento')
  if (L.done.includes(id)) return fail('Ya lo inventaste')
  if (s.cash < d.cost) return fail('No alcanza el efectivo')
  s.cash -= d.cost; L.active = { id, end: dayOf(s) + d.days }
  say(s, `🔬 Tu laboratorio empezó a desarrollar: ${d.name} (${d.days} días)`, 'info')
  return ok(`${d.name} en desarrollo`)
}

// ---------- reparto a domicilio ----------
export const RIDER_COST = 85000 // moto + equipo
export const RIDER_MONTHLY = 9000 // sueldo del repartidor
export function hireRider (s: GameState, storeId: number): Result {
  const st = s.stores.find(x => x.id === storeId); if (!st) return fail('No existe')
  if ((st.riders ?? 0) >= 4) return fail('Máximo 4 repartidores por tienda')
  if (s.cash < RIDER_COST) return fail('No alcanza el efectivo')
  s.cash -= RIDER_COST; st.riders = (st.riders ?? 0) + 1
  return ok('Repartidor listo: ya llevas pedidos a domicilio')
}
export const ridersTotal = (s: GameState) => s.stores.reduce((a, st) => a + (st.riders ?? 0), 0)

// cada día: pedidos a domicilio y avance del laboratorio. Devuelve la utilidad del reparto.
export function labDaily (s: GameState) {
  const L = lab(s); const day = dayOf(s)
  if (L.active && day >= L.active.end) {
    const d = INVENTIONS.find(x => x.id === L.active!.id)!
    if (nextRandom(s) < d.chance) {
      L.done.push(d.id); say(s, `🎉 ¡Invento exitoso! ${d.name}: ${d.effect}`, 'good')
      if (d.id === 'empaque') for (const st of s.stores) st.reputation = Math.min(5, st.reputation + 0.3)
      if (d.id === 'lealtad') for (const st of s.stores) st.satisfaction = Math.min(100, st.satisfaction + 8)
    } else { L.failed.push(d.id); say(s, `🧪 ${d.name} no funcionó. Puedes intentarlo otra vez`, 'bad') }
    L.active = null
  }
  // reparto: cada repartidor entrega pedidos según el tamaño del ticket y la satisfacción
  let profit = 0
  for (const st of s.stores) {
    const r = st.riders ?? 0; if (!r) { st.deliveries = 0; continue }
    const mult = (hasInvention(s, 'drones') ? 2 : 1) * (hasInvention(s, 'app') ? 1.4 : 1)
    const orders = Math.round(r * (14 + nextRandom(s) * 10) * mult * (0.6 + st.satisfaction / 250))
    const ticket = 140 + nextRandom(s) * 60
    const gain = orders * ticket * 0.2 - (hasInvention(s, 'drones') ? 0 : r * RIDER_MONTHLY / 30)
    st.deliveries = orders; profit += gain
  }
  s.cash += profit
  return profit
}
