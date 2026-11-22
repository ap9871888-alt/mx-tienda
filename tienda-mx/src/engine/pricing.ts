// Precios, demanda y capacidad: funciones puras sobre una tienda.
import { CATEGORIES, PRODUCT_CATEGORIES, categoryOf, type CategoryId } from '../data/categories'
import { formatOf } from '../data/formats'
import { colonyOf, HOUR_PROFILE } from '../data/cities'
import { ECONOMY } from '../data/economy'
import type { Store, CatMap } from './types'

export const defaultMargins = (): CatMap<number> =>
  Object.fromEntries(CATEGORIES.map(c => [c.id, c.service ? 1 : c.margin])) as CatMap<number>

export function unitCost (cat: CategoryId) {
  const c = categoryOf(cat)
  return c.service ? 0 : c.price * (1 - c.margin) * ECONOMY.wholesaleCostMult
}
// precio de venta con el margen que eligió el jugador
export function unitPrice (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  if (c.service) return c.price
  return unitCost(cat) / (1 - store.margins[cat])
}
// precio relativo al mercado (1 = igual que la competencia)
export function priceIndex (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  if (c.service) return 1
  return unitPrice(store, cat) / c.price
}
// qué tanto aumenta o baja la probabilidad de comprar la categoría por el precio
export function priceFactor (store: Store, cat: CategoryId) {
  const c = categoryOf(cat)
  const wealth = colonyOf(store.cityId, store.colonyId).wealth
  const f = Math.exp(-(c.elasticity / wealth) * (priceIndex(store, cat) - 1))
  return Math.min(1.6, Math.max(0.04, f))
}
// atracción global de la tienda por precios (afecta cuánta gente entra)
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

// clientes por hora que llegan a la tienda a esa hora
export function arrivalsPerHour (store: Store, hour: number, dayMult: number) {
  if (!isOpen(store, hour)) return 0
  const f = formatOf(store.formatId); const col = colonyOf(store.cityId, store.colonyId)
  return col.traffic * HOUR_PROFILE[hour] * f.capture * dayMult * (1 - col.competition * 0.3) *
    reputationFactor(store.reputation) * priceAttraction(store)
}

export const cashierRate = (stars: number, bonus: boolean) =>
  (ECONOMY.cashierBaseRate + ECONOMY.cashierRatePerStar * stars) * (bonus ? 1 + ECONOMY.bonusSpeed : 1)
// clientes por hora que puede cobrar la tienda
export function serviceRate (store: Store) {
  return store.cashiers.reduce((a, c) => a + cashierRate(c.stars, store.bonus), 0) + store.selfCheckouts * ECONOMY.selfCheckoutRate
}
export const shelfCapacity = (store: Store) => formatOf(store.formatId).shelfUnits
export const salaryFor = (stars: number) => ECONOMY.salaryBase + ECONOMY.salaryPerStar * stars
export function monthlyRent (store: Store) {
  return formatOf(store.formatId).rent * colonyOf(store.cityId, store.colonyId).rentMult
}
