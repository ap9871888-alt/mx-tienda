// Funciones de época: índice de precios, tasa de crédito, tecnología disponible y sucesos históricos.
import { PRICE_INDEX, LOAN_RATE, FEATURES, HISTORIC_EVENTS } from '../data/eras'

function interp (table: [number, number][], year: number) {
  if (year <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) {
    const [y1, v1] = table[i]; const [y0, v0] = table[i - 1]
    if (year <= y1) return v0 + (v1 - v0) * (year - y0) / (y1 - y0)
  }
  const [yl, vl] = table[table.length - 1]
  return table === PRICE_INDEX ? vl * Math.pow(1.04, year - yl) : vl
}
// año con decimales a partir de una fecha
export const yearFrac = (d: Date) => d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365
export const priceLevelAt = (d: Date) => interp(PRICE_INDEX, yearFrac(d))
export const loanRateAt = (d: Date) => interp(LOAN_RATE, yearFrac(d))
export const hasFeature = (d: Date, f: keyof typeof FEATURES) => d.getUTCFullYear() >= FEATURES[f]

const iso = (d: Date) => d.toISOString().slice(0, 10)
export function historicEvents (d: Date, cityId?: string) {
  const day = iso(d)
  return HISTORIC_EVENTS.filter(e => day >= e.from && day <= e.to && (!e.city || e.city === cityId))
}
export function historicMultiplier (d: Date, cityId?: string) {
  return historicEvents(d, cityId).reduce((a, e) => a * (1 + e.traffic), 1)
}
