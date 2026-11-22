// Analista de mercado: revisa la partida y propone acciones concretas con números.
import { CITIES, colonyOf, colonyById } from '../data/cities'
import { FORMATS } from '../data/formats'
import { PRODUCT_CATEGORIES, categoryOf, type CategoryId } from '../data/categories'
import { estimateStore } from './estimate'
import { priceFactor, priceAttraction, priceIndex, unitPrice, purchaseCost, serviceRate } from './pricing'
import { effectiveCompetition, rivalStoresIn } from './market'
import type { GameState, Store } from './types'

export type InsightKind = 'oportunidad' | 'precio' | 'alerta' | 'rival' | 'tendencia'
export interface Insight { kind: InsightKind; title: string; text: string; storeId?: number; colonyId?: string; cat?: CategoryId; margin?: number; score: number }

const pct = (v: number) => `${Math.round(v * 100)} %`

// utilidad bruta esperada de toda la tienda por hora, si esa categoría tuviera ese margen:
// cuenta lo que deja cada pieza, cuánta gente deja de entrar por precios altos y el enojo por precio caro
function catGrossPerVisitor (g: GameState, st: Store, cat: CategoryId, margin: number) {
  const prev = st.margins[cat]
  st.margins[cat] = margin
  let gross = 0
  for (const c of PRODUCT_CATEGORIES) {
    const p = c.basketProb * priceFactor(st, c.id, g)
    gross += p * ((c.qty[0] + c.qty[1]) / 2) * (unitPrice(st, c.id) - purchaseCost(g, c.id, st))
  }
  const over = Math.max(0, priceIndex(st, cat) - 1.12)
  const value = gross * priceAttraction(st, g) * Math.exp(-over * 4)
  st.margins[cat] = prev
  return value
}

export function bestMargin (g: GameState, st: Store, cat: CategoryId) {
  const cur = st.margins[cat]
  let best = cur; let bestVal = catGrossPerVisitor(g, st, cat, cur)
  // pasos prudentes: máximo 8 puntos de margen por sugerencia
  for (let m = Math.max(0.05, cur - 0.08); m <= Math.min(0.45, cur + 0.08) + 1e-9; m += 0.01) {
    const v = catGrossPerVisitor(g, st, cat, m)
    if (v > bestVal) { bestVal = v; best = +m.toFixed(2) }
  }
  const gain = bestVal / Math.max(0.0001, catGrossPerVisitor(g, st, cat, cur)) - 1
  return { margin: best, gain }
}

export function analyzeMarket (g: GameState): Insight[] {
  const out: Insight[] = []
  // 1) dónde abrir
  const options: { col: string; fmt: string; months: number; profit: number; cost: number }[] = []
  for (const city of CITIES.filter(x => g.cities.includes(x.id))) for (const c of city.colonies) for (const f of FORMATS.filter(x => x.available && (x.id !== 'hardDiscount' || g.startYear >= 2004 || g.minute > (2004 - g.startYear) * 525600))) {
    if (g.stores.filter(s => s.colonyId === c.id).length >= c.slots) continue
    const e = estimateStore(city.id, c.id, f.id, g)
    if (e.paybackMonths) options.push({ col: c.id, fmt: f.name, months: e.paybackMonths, profit: e.profitMonth, cost: e.openingCost })
  }
  options.sort((a, b) => a.months - b.months)
  const affordable = options.filter(o => o.cost <= g.cash)
  const pick = affordable[0] ?? options[0]
  if (pick) {
    out.push({ kind: 'oportunidad', colonyId: pick.col, score: 80,
      title: `Mejor apertura: ${pick.fmt} en ${colonyById(pick.col).colony.name}`,
      text: `Recuperas la inversión en ~${pick.months} meses con ${Math.round(pick.profit).toLocaleString('es-MX')} MXN de utilidad al mes.${pick.cost > g.cash ? ` Te faltan ${Math.round(pick.cost - g.cash).toLocaleString('es-MX')} MXN.` : ''}` })
  }
  // 2) precios de cada tienda
  for (const st of g.stores) {
    let bestCat: CategoryId | null = null; let bestGain = 0; let bestM = 0
    for (const c of PRODUCT_CATEGORIES) {
      const r = bestMargin(g, st, c.id)
      if (r.gain > bestGain && Math.abs(r.margin - st.margins[c.id]) >= 0.02) { bestGain = r.gain; bestCat = c.id; bestM = r.margin }
    }
    if (bestCat && bestGain > 0.04) {
      const up = bestM > st.margins[bestCat]
      out.push({ kind: 'precio', storeId: st.id, cat: bestCat, margin: bestM, score: 60 + bestGain * 100,
        title: `${up ? 'Sube' : 'Baja'} el margen de ${categoryOf(bestCat).name} en ${colonyOf(st.cityId, st.colonyId).name}`,
        text: `De ${pct(st.margins[bestCat])} a ${pct(bestM)}: la utilidad de esa categoría sube ~${pct(bestGain)} con los clientes de esta colonia.` })
    }
    // 3) operación
    const last = st.history[st.history.length - 1]
    if (last && last.tickets && last.abandoned / (last.tickets + last.abandoned) > 0.05) {
      out.push({ kind: 'alerta', storeId: st.id, score: 90, title: `Fila larga en ${colonyOf(st.cityId, st.colonyId).name}`,
        text: `Ayer se fueron ${last.abandoned} clientes sin comprar. Tu caja cobra ${Math.round(serviceRate(st))} clientes/hora: contrata, capacita o pon autocobro.` })
    }
    if (st.today.lostItems > 20) out.push({ kind: 'alerta', storeId: st.id, score: 85, title: `Desabasto en ${colonyOf(st.cityId, st.colonyId).name}`, text: `Hoy no hubo ${st.today.lostItems} piezas que pidieron. Pide antes o compra camiones si tienes CEDIS.` })
    if (!st.cashiers.length && !st.selfCheckouts) out.push({ kind: 'alerta', storeId: st.id, score: 100, title: 'Tienda sin cajeros', text: `${colonyOf(st.cityId, st.colonyId).name} no puede cobrar. Contrata a alguien.` })
  }
  // 4) rivales y tendencias
  if (g.market) {
    for (const [id, m] of Object.entries(g.market.colonies)) {
      const mine = g.stores.some(s => s.colonyId === id)
      const name = colonyById(id).colony.name
      if (m.war > 0 && mine) out.push({ kind: 'rival', colonyId: id, score: 88, title: `Guerra de precios en ${name}`, text: `Faltan ${m.war} días. Aguanta con buena atención o baja un poco los precios de Bebidas y Botanas.` })
      if (m.trend > 0.0005) out.push({ kind: 'tendencia', colonyId: id, score: mine ? 40 : 55, title: `${name} está creciendo`, text: `Su tráfico sube ~${(m.trend * 3000).toFixed(1)} % al mes. Competencia actual: ${Math.round(effectiveCompetition(g, '', id) * 100)} % con ${rivalStoresIn(g, id)} tiendas rivales.` })
      if (m.trend < -0.0005 && mine) out.push({ kind: 'tendencia', colonyId: id, score: 50, title: `${name} va a la baja`, text: `Su tráfico cae ~${(-m.trend * 3000).toFixed(1)} % al mes. No inviertas más ahí por ahora.` })
    }
  }
  return out.sort((a, b) => b.score - a.score)
}
