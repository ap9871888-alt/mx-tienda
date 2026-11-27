// Mantenimiento y permisos de cada tienda: la suciedad sube con los clientes, la pintura se gasta con el tiempo
// y para operar tranquilo necesitas tres permisos. Sin ellos, un inspector puede poner sellos de clausura.
import type { GameState, Store, Result } from './types'
import { formatOf } from '../data/formats'
import { nextRandom } from './rng'

export type PermitId = 'licencia' | 'proteccion' | 'salud'
export const PERMITS: { id: PermitId; name: string; cost: number; days: number; desc: string }[] = [
  { id: 'licencia', name: 'Licencia de funcionamiento', cost: 8000, days: 5, desc: 'La alcaldía te autoriza a vender.' },
  { id: 'proteccion', name: 'Protección Civil', cost: 6000, days: 4, desc: 'Extintores, salidas y señalización.' },
  { id: 'salud', name: 'Aviso sanitario', cost: 5000, days: 3, desc: 'Necesario si vendes comida o bebidas.' }
]
const GRACE = 7 // días que el inspector tarda en aparecer después de abrir
const big = (st: Store) => formatOf(st.formatId).shelfUnits / 420 // tamaño relativo a una tiendita

const today = (s: GameState) => Math.floor(s.minute / 1440)
export const permitDone = (s: GameState, st: Store, id: PermitId) => { const v = st.permits?.[id]; return v != null && today(s) >= v }
export const missingPermits = (s: GameState, st: Store) => formatOf(st.formatId).ownerSells ? [] : PERMITS.filter(p => !permitDone(s, st, p.id))
export const isSealed = (s: GameState, st: Store) => (st.sealedUntil ?? -1) > today(s)
export const permitCost = (st: Store, id: PermitId) => Math.round(PERMITS.find(p => p.id === id)!.cost * Math.max(1, Math.sqrt(big(st))))

export function requestPermit (s: GameState, storeId: number, id: PermitId): Result {
  const st = s.stores.find(x => x.id === storeId); const p = PERMITS.find(x => x.id === id)
  if (!st || !p) return { ok: false, msg: 'No existe' }
  if (st.permits?.[id] != null) return { ok: false, msg: 'Ya está en trámite o listo' }
  const cost = permitCost(st, id)
  if (s.cash < cost) return { ok: false, msg: 'No alcanza el efectivo' }
  s.cash -= cost; st.permits = { ...(st.permits ?? {}), [id]: today(s) + p.days }
  return { ok: true, msg: `Trámite iniciado: ${p.name} estará listo en ${p.days} días` }
}
export const cleanCost = (st: Store) => Math.round(2500 * Math.max(1, big(st)))
export const paintCost = (st: Store) => Math.round(18000 * Math.max(1, big(st)))
export function deepClean (s: GameState, storeId: number): Result {
  const st = s.stores.find(x => x.id === storeId); if (!st) return { ok: false, msg: 'No existe' }
  const c = cleanCost(st); if (s.cash < c) return { ok: false, msg: 'No alcanza el efectivo' }
  s.cash -= c; st.dirt = 0; st.satisfaction = Math.min(100, st.satisfaction + 3)
  return { ok: true, msg: '¡Tienda rechinando de limpia! Los clientes lo notan' }
}
export function paintStore (s: GameState, storeId: number): Result {
  const st = s.stores.find(x => x.id === storeId); if (!st) return { ok: false, msg: 'No existe' }
  const c = paintCost(st); if (s.cash < c) return { ok: false, msg: 'No alcanza el efectivo' }
  s.cash -= c; st.wear = 0; st.satisfaction = Math.min(100, st.satisfaction + 5)
  return { ok: true, msg: 'Paredes y fachada recién pintadas: se ve como nueva' }
}
// cuánto pesa el estado de la tienda en la llegada de clientes (0 si está clausurada)
export function upkeepMult (s: GameState | null | undefined, st: Store) {
  if (!s) return 1
  if (isSealed(s, st)) return 0
  const d = st.dirt ?? 0; const w = st.wear ?? 0
  return (d > 70 ? 0.88 : d > 45 ? 0.95 : 1) * (w > 75 ? 0.93 : w > 50 ? 0.97 : 1)
}
// fin de día: se ensucia, se desgasta y a veces llega el inspector
export function upkeepDaily (s: GameState, log: (t: string, k: 'good' | 'bad' | 'info') => void) {
  const day = today(s)
  for (const st of s.stores) {
    const f = formatOf(st.formatId)
    st.dirt = Math.max(0, Math.min(100, (st.dirt ?? 0) + st.today.tickets / (60 * Math.max(1, big(st))) + 2.5 - st.cleaning * 3))
    st.wear = Math.min(100, (st.wear ?? 0) + 0.3)
    if (st.dirt > 60) st.satisfaction = Math.max(0, st.satisfaction - 1.2)
    if (st.wear > 70) st.satisfaction = Math.max(0, st.satisfaction - 0.4)
    if (f.ownerSells || isSealed(s, st) || day - st.openedDay < GRACE) continue
    const miss = missingPermits(s, st)
    if (miss.length && nextRandom(s) < 0.05 * miss.length) {
      const fine = 10000 * miss.length; s.cash -= fine; st.sealedUntil = day + 3
      log(`Un inspector puso sellos de clausura en ${st.label}: faltan ${miss.map(p => p.name).join(', ')}. Multa de $${fine.toLocaleString('es-MX')} y 3 días cerrada`, 'bad')
    }
  }
}
