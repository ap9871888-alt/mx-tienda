// Precios, costos, demanda y capacidad: funciones puras.
import { CATEGORIES, PRODUCT_CATEGORIES, categoryOf, type CategoryId } from '../data/categories'
import { formatOf, type FormatId } from '../data/formats'
import { colonyOf, HOUR_PROFILE } from '../data/cities'
import { ECONOMY } from '../data/economy'
import { VOLUME_DISCOUNT, CEDIS, PRIVATE_LABELS, LABEL_COST_FACTOR, LABEL_LOYALTY } from '../data/logistics'
import type { Store, CatMap, GameState } from './types'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export const defaultMargins = (formatId: FormatId = 'tiendita'): CatMap<number> => {
  const m = formatOf(formatId).marginMult
  return Object.fromEntries(CATEGORIES.map(c => [c.id, c.service ? 1 : +clamp(c.margin * m, 0.05, 0.5).toFixed(3)])) as CatMap<number>
}

// costo de lista del mayorista: la base para fijar precios y comparar con el mercado
export function unitCost (cat: CategoryId) {
  const c = categoryOf(cat)
  return c.service ? 0 : c.price * (1 - c.margin) * ECONOMY.wholesaleCostMult
}
// lo que de verdad pagas por pieza: descuento por volumen, CEDIS y Marca Propia
export function purchaseFactor (g: GameState | null | undefined, cat: CategoryId) {
  if (!g) return 1
  let f = 1
  if (g.stores.length >= VOLUME_DISCOUNT.minStores) f *= VOLUME_DISCOUNT.factor
  if (g.cedis) f *= 1 - CEDIS.savings[g.cedis.level - 1]
  for (const l of PRIVATE_LABELS) if (l.cat === cat && g.labels.includes(l.id)) f *= LABEL_COST_FACTOR
  return f
}
export const purchaseCost = (g: GameState | null | undefined, cat: CategoryId) => unitCost(cat) * purchaseFactor(g, cat)

// precio de venta con el margen que eligió el jugador
export function unitPrice (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  if (c.service) return c.price
  return unitCost(cat) / (1 - store.margins[cat])
}
export function priceIndex (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  if (c.service) return 1
  return unitPrice(store, cat) / c.price
}
export function priceFactor (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  const wealth = colonyOf(store.cityId, store.colonyId).wealth
  const sens = formatOf(store.formatId).priceSensitivity
  const f = Math.exp(-(c.elasticity * sens / wealth) * (priceIndex(store, cat) - 1))
  return Math.min(1.6, Math.max(0.04, f))
}
export function priceAttraction (store: Store) {
  let w = 0; let sum = 0
  for (const c of PRODUCT_CATEGORIES) { w += c.basketProb; sum += c.basketProb * priceFactor(store, c.id) }
  return Math.sqrt(sum / w)
}
export const reputationFactor = (rep: number) => 0.75 + rep * 0.07

export function isOpen (store: Store, hour: number) {
  const f = formatOf(store.formatId)
  if (f.allDay) return true
  return hour >= f.hours[0] && hour < f.hours[1]
}
// dos tiendas propias en la misma colonia se reparten el tráfico
export function cannibalization (g: GameState | null | undefined, store: Store) {
  if (!g) return 1
  const others = g.stores.filter(s => s.id !== store.id && s.cityId === store.cityId && s.colonyId === store.colonyId).length
  return Math.max(0.55, 1 - 0.15 * others)
}
export function labelLoyalty (g: GameState | null | undefined, store: Store) {
  if (!g) return 1
  return 1 + g.labels.length * (store.formatId === 'hardDiscount' ? LABEL_LOYALTY.hardDiscount : LABEL_LOYALTY.other)
}

export function arrivalsPerHour (store: Store, hour: number, dayMult: number, g?: GameState | null) {
  if (!isOpen(store, hour)) return 0
  const f = formatOf(store.formatId); const col = colonyOf(store.cityId, store.colonyId)
  return col.traffic * HOUR_PROFILE[hour] * f.capture * dayMult * (1 - col.competition * 0.3) *
    reputationFactor(store.reputation) * priceAttraction(store) * cannibalization(g, store) * labelLoyalty(g, store)
}

export const cashierRate = (stars: number, bonus: boolean) =>
  (ECONOMY.cashierBaseRate + ECONOMY.cashierRatePerStar * stars) * (bonus ? 1 + ECONOMY.bonusSpeed : 1)
export function serviceRate (store: Store) {
  return store.cashiers.reduce((a, c) => a + cashierRate(c.stars, store.bonus), 0) + store.selfCheckouts * ECONOMY.selfCheckoutRate
}
export const shelfCapacity = (store: Store) => formatOf(store.formatId).shelfUnits
export const salaryFor = (stars: number) => ECONOMY.salaryBase + ECONOMY.salaryPerStar * stars
export function monthlyRent (store: Store) {
  return formatOf(store.formatId).rent * colonyOf(store.cityId, store.colonyId).rentMult
}
