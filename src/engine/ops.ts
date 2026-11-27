// Vida diaria de la operación: clima, promociones, asaltos, apagones, aumento de renta,
// traspasos, misiones semanales y reseñas de clientes.
import type { GameState, Store, Result } from './types'
import { formatOf } from '../data/formats'
import { nextRandom } from './rng'
import { permitDone, PERMITS, requestPermit, deepClean } from './upkeep'

const today = (s: GameState) => Math.floor(s.minute / 1440)
const size = (st: Store) => Math.max(1, formatOf(st.formatId).shelfUnits / 420)
const hash = (n: number) => { const x = Math.sin(n * 91.37) * 43758.5; return x - Math.floor(x) }
const md = (day: number) => { const d = new Date(Date.UTC(2027, 0, 1 + day)); return { m: d.getUTCMonth() + 1, wd: d.getUTCDay() } }

// ---------- clima: temporada de lluvias (junio a septiembre), aguaceros por la tarde ----------
export function rainToday (day: number) { const { m } = md(day); return m >= 6 && m <= 9 && hash(day) < 0.65 }
export function weatherMult (g: GameState | null | undefined, hour: number) {
  if (!g) return 1
  return rainToday(today(g)) && hour >= 15 && hour <= 19 ? 0.78 : 1
}

// ---------- promoción de 3 días: volantes, lona y ofertas ----------
export const promoCost = (st: Store) => Math.round(6000 * size(st))
export const promoActive = (s: GameState, st: Store) => (st.promoUntil ?? -1) > today(s)
export function startPromo (s: GameState, storeId: number): Result {
  const st = s.stores.find(x => x.id === storeId); if (!st) return { ok: false, msg: 'No existe' }
  if (promoActive(s, st)) return { ok: false, msg: 'Ya hay una promoción activa' }
  const c = promoCost(st); if (s.cash < c) return { ok: false, msg: 'No alcanza el efectivo' }
  s.cash -= c; st.promoUntil = today(s) + 3
  return { ok: true, msg: '¡Promoción lanzada! 3 días con más clientes' }
}

// multiplicador de clientes por todo lo de este módulo
export function opsMult (g: GameState | null | undefined, st: Store, hour: number) {
  if (!g) return 1
  let k = weatherMult(g, hour)
  if (promoActive(g, st)) k *= 1.25
  if (st.loyalty) k *= 1.08
  if (st.app) k *= 1.12
  if ((st.outageDay ?? -1) === today(g)) k *= 0.35
  return k
}

// ---------- servicios extra por tienda (costo mensual) ----------
export const EXTRAS: { id: 'ext' | 'loyalty' | 'app'; name: string; desc: string; monthly: (st: Store) => number }[] = [
  { id: 'ext', name: 'Horario extendido', desc: 'Abre 1 hora antes y cierra 1 hora después', monthly: st => Math.round(formatOf(st.formatId).overhead * 0.25 + 3000) },
  { id: 'loyalty', name: 'Tarjeta de lealtad', desc: '+8 % clientes que regresan y mejor satisfacción', monthly: st => Math.round(3500 * size(st)) },
  { id: 'app', name: 'App de reparto PideYa', desc: '+12 % pedidos; la app cobra 4 % de comisión', monthly: () => 1500 }
]
export function toggleExtra (s: GameState, storeId: number, id: 'ext' | 'loyalty' | 'app'): Result {
  const st = s.stores.find(x => x.id === storeId); if (!st) return { ok: false, msg: 'No existe' }
  if (id === 'ext' && formatOf(st.formatId).allDay) return { ok: false, msg: 'Esta tienda ya abre las 24 horas' }
  st[id] = !st[id]
  return { ok: true, msg: `${EXTRAS.find(e => e.id === id)!.name}: ${st[id] ? 'activado' : 'desactivado'}` }
}
export const opsMonthly = (s: GameState, st: Store) => EXTRAS.reduce((a, e) => a + (st[e.id] ? e.monthly(st) : 0), 0) + (s.insured ? insuranceMonthly(st) : 0)
export const insuranceMonthly = (st: Store) => Math.round(2500 * size(st))
export function toggleInsurance (s: GameState): Result { s.insured = !s.insured; return { ok: true, msg: s.insured ? 'Seguro contratado: cubre el 80 % de los asaltos' : 'Cancelaste el seguro' } }

// ---------- renta: sube 4 % cada año que cumple el local ----------
export const rentFactor = (st: Store) => st.rentMult ?? 1

// ---------- traspaso: vender el local ----------
export function sellValue (st: Store) {
  const f = formatOf(st.formatId)
  return Math.round(f.capex * 0.45 * (1 + 0.1 * (st.remodel ?? 0)) * (0.6 + st.reputation / 10))
}
export function sellStore (s: GameState, storeId: number): Result {
  const i = s.stores.findIndex(x => x.id === storeId); if (i < 0) return { ok: false, msg: 'No existe' }
  if (s.stores.length === 1) return { ok: false, msg: 'Es tu única tienda: no la puedes traspasar' }
  const st = s.stores[i]; const v = sellValue(st)
  s.cash += v; s.stores.splice(i, 1)
  return { ok: true, msg: `Traspasaste ${st.label} por $${v.toLocaleString('es-MX')}` }
}

// ---------- acciones para todas las tiendas ----------
export function permitsForAll (s: GameState): Result {
  let n = 0
  for (const st of s.stores) for (const p of PERMITS) if (st.permits?.[p.id] == null && !formatOf(st.formatId).ownerSells && requestPermit(s, st.id, p.id).ok) n++
  return n ? { ok: true, msg: `${n} trámites iniciados` } : { ok: false, msg: 'No hay trámites pendientes o falta efectivo' }
}
export function cleanAll (s: GameState): Result {
  let n = 0
  for (const st of s.stores) if ((st.dirt ?? 0) > 30 && deepClean(s, st.id).ok) n++
  return n ? { ok: true, msg: `${n} tiendas limpias` } : { ok: false, msg: 'Ninguna tienda necesita limpieza (o falta efectivo)' }
}
export const pendingPermits = (s: GameState) => s.stores.reduce((a, st) => a + (formatOf(st.formatId).ownerSells ? 0 : PERMITS.filter(p => !permitDone(s, st, p.id) && st.permits?.[p.id] == null).length), 0)

// ---------- misiones semanales: una meta con premio ----------
export interface Mission { id: string; text: string; target: number; kind: 'ventas' | 'satisfaccion' | 'tiendas' | 'limpias'; reward: number; until: number; start: number; base: number }
export function missionProgress (s: GameState, m: Mission) {
  if (m.kind === 'ventas') return s.reports.filter(r => r.day >= m.start).reduce((a, r) => a + r.sales, 0)
  if (m.kind === 'satisfaccion') return s.stores.length ? Math.min(...s.stores.map(x => x.satisfaction)) : 0
  if (m.kind === 'tiendas') return s.stores.length - m.base
  return s.stores.filter(x => (x.dirt ?? 0) < 30).length
}
function newMission (s: GameState): Mission {
  const d = today(s); const n = s.stores.length
  const avg = s.reports.slice(-7).reduce((a, r) => a + r.sales, 0)
  const opts: Omit<Mission, 'until' | 'start' | 'base'>[] = [
    { id: 'ventas', text: 'Vende más que la semana pasada', target: Math.max(20000, Math.round(avg * 1.15)), kind: 'ventas', reward: Math.max(15000, Math.round(avg * 0.08)) },
    { id: 'satisfaccion', text: 'Que ninguna tienda baje de 70 de satisfacción', target: 70, kind: 'satisfaccion', reward: 20000 + n * 4000 },
    { id: 'tiendas', text: 'Abre una tienda nueva esta semana', target: 1, kind: 'tiendas', reward: 30000 + n * 5000 },
    { id: 'limpias', text: 'Ten todas tus tiendas limpias', target: Math.max(1, n), kind: 'limpias', reward: 10000 + n * 3000 }
  ]
  const m = opts[Math.floor(nextRandom(s) * opts.length)]
  return { ...m, start: d, until: d + 7, base: n }
}

// ---------- fin de día ----------
export function opsDaily (s: GameState, log: (t: string, k: 'good' | 'bad' | 'info') => void) {
  const d = today(s)
  for (const st of s.stores) {
    const f = formatOf(st.formatId)
    // asaltos: más probables sin seguridad y en tiendas que manejan efectivo de noche
    const p = [0.012, 0.005, 0.0015][st.security] * (f.hours[1] >= 23 || f.hours[0] === 0 ? 1.5 : 1)
    if (st.today.sales > 0 && nextRandom(s) < p) {
      const loss = Math.round(Math.min(st.today.sales * 0.35, 25000 * size(st)))
      const paid = s.insured ? Math.round(loss * 0.8) : 0
      s.cash -= loss - paid; st.satisfaction = Math.max(0, st.satisfaction - 4)
      log(`Asaltaron ${st.label}: se llevaron $${loss.toLocaleString('es-MX')}.${paid ? ` El seguro te repone $${paid.toLocaleString('es-MX')}` : ' Más seguridad o un seguro reducen la pérdida'}`, 'bad')
    }
    // apagones: mañana la tienda casi no vende, salvo que tenga planta de luz
    if (!st.equipment?.includes('planta') && nextRandom(s) < 0.006) { st.outageDay = d + 1; log(`Apagón en la zona de ${st.label}: mañana venderá muy poco. Una planta de luz lo evita`, 'bad') }
    // comisión de la app de reparto sobre lo vendido hoy
    const last = st.history[st.history.length - 1]
    const lp = last as (typeof last & { appPaid?: boolean }) | undefined
    if (st.app && lp && !lp.appPaid && lp.day >= d - 1) { lp.appPaid = true; const fee = Math.round(last.sales * 0.04); s.cash -= fee; last.profit -= fee; last.fees += fee }
    // Profeco: si los precios son abusivos, multa
    const m = Object.values(st.margins); const avg = m.reduce((a, x) => a + x, 0) / Math.max(1, m.length)
    if (avg > 0.42 && nextRandom(s) < 0.03) { const fine = Math.round(15000 * size(st)); s.cash -= fine; st.satisfaction = Math.max(0, st.satisfaction - 5); log(`Profeco multó a ${st.label} con $${fine.toLocaleString('es-MX')} por precios abusivos`, 'bad') }
    if (st.loyalty) st.satisfaction = Math.min(100, st.satisfaction + 0.3)
    // aumento de renta en cada aniversario
    if (d > st.openedDay && (d - st.openedDay) % 365 === 0) { st.rentMult = +((st.rentMult ?? 1) * 1.04).toFixed(3); log(`El casero de ${st.label} subió la renta 4 %`, 'info') }
  }
  // misiones
  const m = s.mission
  if (m) {
    const prog = missionProgress(s, m)
    if (prog >= m.target) { s.cash += m.reward; for (const st of s.stores) st.reputation = Math.min(5, st.reputation + 0.1); log(`¡Misión cumplida: ${m.text}! Premio de $${m.reward.toLocaleString('es-MX')}`, 'good'); s.mission = null }
    else if (d >= m.until) { log(`Misión no cumplida: ${m.text}`, 'info'); s.mission = null }
  }
  if (!s.mission && s.stores.length && d % 7 === 0) s.mission = newMission(s)
}

// ---------- reseñas: lo que dicen los clientes de una tienda ----------
export function reviews (st: Store): { stars: number; text: string }[] {
  const out: { stars: number; text: string }[] = []
  const last = st.history[st.history.length - 1]
  if ((st.dirt ?? 0) > 55) out.push({ stars: 2, text: 'El piso estaba sucio y olía feo.' })
  else if ((st.dirt ?? 0) < 20) out.push({ stars: 5, text: 'Siempre está limpiecita, da gusto entrar.' })
  if (last && last.abandoned > Math.max(4, last.tickets * 0.08)) out.push({ stars: 2, text: 'La fila era eterna, me salí sin comprar.' })
  else if (last && last.tickets > 30) out.push({ stars: 4, text: 'Me atendieron rápido.' })
  if ((st.wear ?? 0) > 70) out.push({ stars: 3, text: 'La fachada ya se ve muy descuidada.' })
  if (st.satisfaction >= 80) out.push({ stars: 5, text: 'Buenos precios y buen trato. Mi tienda de confianza.' })
  else if (st.satisfaction < 45) out.push({ stars: 1, text: 'Caro y mal servicio. No vuelvo.' })
  if (!out.length) out.push({ stars: 4, text: 'Cumple, tiene lo que necesito.' })
  return out.slice(0, 3)
}
