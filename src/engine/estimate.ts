// Pronóstico para mostrar CAPEX, renta y retorno ANTES de abrir (regla de UX: nada de costos ocultos).
import { CATEGORIES, PRODUCT_CATEGORIES } from '../data/categories'
import { formatOf, type FormatId } from '../data/formats'
import { ECONOMY } from '../data/economy'
import { colonyOf } from '../data/cities'
import { defaultMargins, arrivalsPerHour, priceFactor, unitPrice, purchaseCost, cashierRate, monthlyRent, salaryFor } from './pricing'
import { openingCost } from './game'
import type { Store, CatMap, GameState } from './types'

export interface Estimate {
  openingCost: number; capex: number; rent: number; customersDay: number; ticket: number
  salesMonth: number; grossMonth: number; costsMonth: number; profitMonth: number; paybackMonths: number | null
}
export function estimateStore (cityId: string, colonyId: string, formatId: FormatId, g?: GameState | null): Estimate {
  const f = formatOf(formatId)
  const probe: Store = {
    id: 0, label: '', cityId, colonyId, formatId, openedDay: 0, margins: defaultMargins(formatId),
    cashiers: Array.from({ length: Math.max(2, Math.ceil(f.maxCashiers * 0.6)) }, (_, i) => ({ id: i, name: '', stars: 2, salary: salaryFor(2) })),
    selfCheckouts: 0, security: 0, cleaning: 0, bonus: false, autoReorder: true,
    inventory: {} as CatMap<number>, orders: [], queue: [], serviceCarry: 0, satisfaction: 70, reputation: 3,
    today: { sales: 0, commissions: 0, cogs: 0, fees: 0, arrivals: 0, tickets: 0, abandoned: 0, lostItems: 0, waitSum: 0, maxQueue: 0, catUnits: {} }, history: []
  }
  const capacity = probe.cashiers.reduce((a, c) => a + cashierRate(c.stars, false), 0)
  let customers = 0
  for (let h = 0; h < 24; h++) customers += Math.min(arrivalsPerHour(probe, h, 1.08, g ? { ...g, stores: [...g.stores, probe] } : null), capacity)
  let ticket = 0; let gross = 0; let units = 0
  for (const c of CATEGORIES) {
    const p = Math.min(1, c.basketProb * Math.sqrt(colonyOf(cityId, colonyId).wealth) * priceFactor(probe, c.id))
    const qty = ((c.qty[0] + c.qty[1]) / 2) * (c.service ? 1 : f.basketMult)
    const price = unitPrice(probe, c.id)
    ticket += p * qty * price
    gross += p * qty * (c.service ? price : price - purchaseCost(g ? { ...g, stores: [...g.stores, probe] } : null, c.id))
    if (!c.service) units += p * qty
  }
  customers *= 0.92 // margen de prudencia: reputación y desabastos reales
  const salesMonth = customers * ticket * 30
  const grossMonth = customers * gross * 30
  const shrink = salesMonth * ECONOMY.shrinkBase * (1 - f.grossMargin)
  const deliveriesMonth = Math.ceil((customers * units * 30) / (PRODUCT_CATEGORIES.length * f.shelfUnits * (1 - ECONOMY.reorderThreshold)))
  const costsMonth = monthlyRent(probe) + probe.cashiers.reduce((a, c) => a + c.salary, 0) + f.kwhDay * ECONOMY.kwhPrice * 30 + f.overhead + shrink + deliveriesMonth * ECONOMY.restockFee
  const profitMonth = grossMonth - costsMonth
  return {
    openingCost: openingCost(cityId, colonyId, formatId), capex: f.capex, rent: monthlyRent(probe),
    customersDay: Math.round(customers), ticket: Math.round(ticket), salesMonth: Math.round(salesMonth), grossMonth: Math.round(grossMonth),
    costsMonth: Math.round(costsMonth), profitMonth: Math.round(profitMonth), paybackMonths: profitMonth > 0 ? +(f.capex / profitMonth).toFixed(1) : null
  }
}
