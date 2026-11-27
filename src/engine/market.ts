// IA de mercado: cada partida genera colonias y cadenas rivales distintas a partir de su semilla,
// y los rivales reaccionan a lo que hace el jugador. También el fondo de inversión y el analista.
import { CITIES, colonyById } from '../data/cities'
import { RIVAL_POOL, MARKET_EVENTS, MAX_RIVAL_STORES_PER_COLONY, FUNDS, FUND_FEE, type RivalStyle } from '../data/market'
import { nextRandom } from './rng'
import type { GameState, GameEvent, Result, MarketState, ColonyMarket } from './types'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const r = (s: { rng: number }) => nextRandom(s)
function gauss (s: { rng: number }) {
  let u = 0; let v = 0
  while (!u) u = r(s)
  while (!v) v = r(s)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ---------- generación ----------
export function generateMarket (s: { rng: number }): MarketState {
  const colonies: Record<string, ColonyMarket> = {}
  for (const city of CITIES) {
    for (const c of city.colonies) {
      colonies[c.id] = {
        traffic: +(0.85 + r(s) * 0.35).toFixed(3),
        wealth: +(0.92 + r(s) * 0.16).toFixed(3),
        trend: +((r(s) - 0.45) * 0.0016).toFixed(5),
        events: [],
        war: 0
      }
    }
  }
  const pool = [...RIVAL_POOL]
  const styles: RivalStyle[] = ['precio', 'expansion', 'premium', 'barrio']
  const rivals = styles.map((style, i) => {
    const p = pool.splice(Math.floor(r(s) * pool.length), 1)[0]
    const stores: Record<string, number> = {}
    for (const city of CITIES) for (const c of city.colonies) stores[c.id] = Math.floor(r(s) * (style === 'premium' ? c.wealth * 1.4 : style === 'barrio' ? 3 / c.wealth : 2.2))
    return { id: `r${i}`, name: p.name, color: p.color, style, stores, aggression: +(0.6 + r(s) * 0.8).toFixed(2) }
  })
  const funds = Object.fromEntries(FUNDS.map(f => [f.id, { nav: 100, hist: [100], units: 0, invested: 0 }]))
  return { colonies, rivals, funds, regime: 0, insightsDay: -1 }
}

// ---------- lectura ----------
export function colonyMarket (g: GameState | null | undefined, colonyId: string): ColonyMarket | null {
  return g?.market?.colonies[colonyId] ?? null
}
export function rivalStoresIn (g: GameState | null | undefined, colonyId: string) {
  if (!g?.market) return 0
  return g.market.rivals.reduce((a, x) => a + (x.stores[colonyId] || 0), 0)
}
// eventos de la ciudad que se ven en el mapa y mueven a la gente (CDMX)
export function cityEvents (day: number) {
  const wd = new Date(Date.UTC(2027, 0, 1 + day)).getUTCDay()
  return { tianguis: wd === 0, partido: wd === 0 || (wd === 6 && day % 2 === 0), marcha: wd >= 1 && wd <= 5 && (day * 7) % 11 === 3 }
}
// cuánto cambia la gente en una colonia por los eventos del día
export function eventTraffic (g: GameState | null | undefined, colonyId: string) {
  if (!g) return 1
  const e = cityEvents(Math.floor(g.minute / 1440)); let k = 1
  if (e.marcha && ['centro', 'polanco', 'roma'].includes(colonyId)) k *= 0.85 // Reforma cerrada: menos gente llega
  if (e.partido && ['coyoacan', 'delvalle'].includes(colonyId)) k *= 1.25 // aficionados rumbo al Azteca
  if (e.tianguis && ['iztapalapa', 'roma'].includes(colonyId)) k *= 1.12 // el tianguis atrae compradores
  return k
}
export function effectiveTraffic (g: GameState | null | undefined, cityId: string, colonyId: string) {
  const base = colonyById(colonyId).colony.traffic; void cityId
  const m = colonyMarket(g, colonyId)
  if (!m) return base * eventTraffic(g, colonyId)
  return base * m.traffic * m.events.reduce((a, e) => a * (1 + e.traffic), 1) * eventTraffic(g, colonyId)
}
export function effectiveWealth (g: GameState | null | undefined, cityId: string, colonyId: string) {
  const base = colonyById(colonyId).colony.wealth; void cityId
  const m = colonyMarket(g, colonyId)
  return m ? base * m.wealth : base
}
export function effectiveCompetition (g: GameState | null | undefined, cityId: string, colonyId: string) {
  const base = colonyById(colonyId).colony.competition; void cityId
  if (!g?.market) return base
  const m = g.market.colonies[colonyId]
  return clamp(base * 0.55 + rivalStoresIn(g, colonyId) * 0.07 + ((m?.war ?? 0) > 0 ? 0.15 : 0), 0.05, 0.92)
}

// ---------- decisiones de los rivales (cada lunes) ----------
export function weeklyMarketAI (g: GameState, events: GameEvent[], log: (t: string, k: 'info' | 'good' | 'bad') => void) {
  if (!g.market) return
  const ids = Object.keys(g.market.colonies)
  // utilidad de la última semana por colonia del jugador: los rivales la huelen
  const playerProfit: Record<string, number> = {}
  for (const st of g.stores) playerProfit[st.colonyId] = (playerProfit[st.colonyId] || 0) + st.history.slice(-7).reduce((a, h) => a + h.profit, 0)
  for (const rv of g.market.rivals) {
    // con más ciudades abiertas, los rivales tienen más hambre de crecer
    const tries = 1 + Math.floor(g.cities.length / 2)
    for (let t = 0; t < tries; t++) {
    if (r(g) > 0.55 * rv.aggression) continue
    // cada rival puntúa las colonias con su propia estrategia
    let best = ''; let bestScore = -Infinity
    for (const id of ids) {
      const traffic = effectiveTraffic(g, '', id); const wealth = effectiveWealth(g, '', id)
      const crowd = 1 + rivalStoresIn(g, id) + g.stores.filter(s => s.colonyId === id).length * 0.8
      let score = traffic * (rv.style === 'premium' ? wealth * wealth : wealth) / crowd
      if (rv.style === 'precio') score += Math.max(0, playerProfit[id] || 0) / 2000
      if (rv.style === 'expansion') score *= 1.2
      if (rv.style === 'barrio') score *= 1.6 / wealth
      score *= 0.8 + r(g) * 0.4
      if ((rv.stores[id] || 0) >= MAX_RIVAL_STORES_PER_COLONY) score = -Infinity
      if (score > bestScore) { bestScore = score; best = id }
    }
    if (!best) continue
    const name = colonyById(best).colony.name
    if (rv.style === 'precio' && (playerProfit[best] || 0) > 0 && g.market.colonies[best].war <= 0 && r(g) < 0.5) {
      g.market.colonies[best].war = 14
      log(`⚔️ ${rv.name} lanzó guerra de precios en ${name}: vas a sentir menos clientes 2 semanas`, 'bad')
    } else {
      rv.stores[best] = (rv.stores[best] || 0) + 1
      log(`🏪 ${rv.name} abrió una tienda en ${name}`, g.stores.some(s => s.colonyId === best) ? 'bad' : 'info')
    }
    }
  }
  // cierres: si una colonia está saturada, el rival más débil se va
  for (const id of ids) {
    if (rivalStoresIn(g, id) > 12) {
      const rv = g.market.rivals.find(x => (x.stores[id] || 0) > 0)
      if (rv) { rv.stores[id]--; log(`${rv.name} cerró una tienda en ${colonyById(id).colony.name}`, 'good') }
    }
  }
  void events
}

// ---------- evolución diaria de colonias y fondos ----------
export function dailyMarket (g: GameState, log: (t: string, k: 'info' | 'good' | 'bad') => void) {
  const m = g.market
  if (!m) return
  for (const [id, c] of Object.entries(m.colonies)) {
    c.traffic = clamp(c.traffic * (1 + c.trend), 0.6, 1.6)
    c.war = Math.max(0, c.war - 1)
    c.events = c.events.filter(e => --e.days > 0)
    void id
  }
  // de vez en cuando, un evento de mercado en alguna colonia
  if (r(g) < 1 / 18) {
    const ids = Object.keys(m.colonies); const id = ids[Math.floor(r(g) * ids.length)]
    const ev = MARKET_EVENTS[Math.floor(r(g) * MARKET_EVENTS.length)]
    const name = colonyById(id).colony.name
    if (ev.days >= 9999) { m.colonies[id].traffic = clamp(m.colonies[id].traffic * (1 + ev.traffic), 0.6, 1.6); if (ev.wealth) m.colonies[id].wealth += ev.wealth } else m.colonies[id].events.push({ text: ev.text.replace('{c}', name), traffic: ev.traffic, days: ev.days })
    log(`📰 ${ev.text.replace('{c}', name)}`, ev.traffic >= 0 ? 'good' : 'bad')
  }
  // régimen de la bolsa: normal, rally o corrección
  if (m.regime === 0 && r(g) < 1 / 120) { m.regime = r(g) < 0.5 ? -20 : 20; log(m.regime < 0 ? '📉 Corrección en la bolsa: las acciones bajan' : '📈 Rally en la bolsa: las acciones suben', m.regime < 0 ? 'bad' : 'good') }
  const shock = m.regime === 0 ? 0 : Math.sign(m.regime) * 0.004
  if (m.regime > 0) m.regime--; else if (m.regime < 0) m.regime++
  const z = gauss(g)
  for (const f of FUNDS) {
    const st = m.funds[f.id]
    const beta = f.id === 'acciones' ? 1 : f.id === 'balanceado' ? 0.5 : 0
    const ret = f.annual / 365 + f.vol * (beta ? z * 0.7 + gauss(g) * 0.3 : gauss(g)) + shock * beta
    st.nav = Math.max(1, st.nav * (1 + ret))
    st.hist.push(+st.nav.toFixed(3)); if (st.hist.length > 120) st.hist.shift()
  }
}

// ---------- fondo de inversión ----------
export const fundValue = (g: GameState, id?: string) => {
  if (!g.market) return 0
  return Object.entries(g.market.funds).filter(([k]) => !id || k === id).reduce((a, [, f]) => a + f.units * f.nav, 0)
}
export function investFund (g: GameState, id: string, amount: number): Result {
  const f = g.market?.funds[id]
  if (!f || amount <= 0) return { ok: false, msg: 'Fondo no válido' }
  if (g.cash < amount) return { ok: false, msg: 'No alcanza el efectivo' }
  g.cash -= amount
  f.units += amount * (1 - FUND_FEE) / f.nav
  f.invested += amount
  return { ok: true, msg: `Invertiste ${Math.round(amount).toLocaleString('es-MX')} MXN` }
}
export function withdrawFund (g: GameState, id: string, amount: number): Result {
  const f = g.market?.funds[id]
  if (!f || f.units <= 0) return { ok: false, msg: 'No tienes dinero en ese fondo' }
  const value = f.units * f.nav
  const take = Math.min(amount, value)
  const units = take / f.nav
  f.invested -= f.invested * (units / f.units)
  f.units -= units
  if (f.units < 1e-9) { f.units = 0; f.invested = 0 }
  g.cash += take * (1 - FUND_FEE)
  return { ok: true, msg: `Retiraste ${Math.round(take * (1 - FUND_FEE)).toLocaleString('es-MX')} MXN` }
}
