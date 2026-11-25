// Motor de "Imperio MX": temporadas, dilemas, inversionistas, estilo de vida y Bolsa MX.
import { MILESTONES, DIRECTORS, SOCIAL_PROGRAMS, SEASONS, DILEMMAS, INVESTORS, STATUS_ITEMS, STOCKS, STOCK_FEE, CITY_EVENTS, IPO, BUYOUT_PER_STORE, SUBSIDIARY_DAILY } from '../data/empire'
import { cityOf, colonyById } from '../data/cities'
import { formatOf } from '../data/formats'
import { nextRandom } from './rng'
import type { GameState, Result } from './types'

const ok = (msg = ''): Result => ({ ok: true, msg })
const fail = (msg: string): Result => ({ ok: false, msg })
const mmdd = (d: Date) => d.toISOString().slice(5, 10)
const inRange = (md: string, from: string, to: string) => from <= to ? md >= from && md <= to : md >= from || md <= to

// ---------- temporadas ----------
export function seasonsAt (d: Date) { const md = mmdd(d); return SEASONS.filter(s => inRange(md, s.from, s.to)) }
export function seasonMultiplier (d: Date, cityId: string) {
  const t = cityOf(cityId).tourism ?? 0
  const local = cityEventsAt(d, cityId).reduce((a, e) => a * (1 + e.mult), 1)
  return local * seasonsAt(d).reduce((a, s) => a * (1 + s.mult + (s.tourism ? s.tourism * t * 2.5 : 0)), 1)
}

// ---------- dilemas ----------
export interface Dilemma { id: string; colonies: string[] }
export function maybeDilemma (s: GameState) {
  if (s.dilemma || !s.stores.length || nextRandom(s) > 1 / 9) return
  const cities = new Set(s.stores.map(x => x.cityId))
  const staffed = s.stores.some(x => x.cashiers.length)
  // con Jefa de RH, la mitad de los problemas laborales se resuelven solos
  const ok2 = DILEMMAS.filter(d => d.when === 'staff' ? staffed && !(s.directors?.rh && nextRandom(s) < 0.5) : d.when === 'smog' ? [...cities].some(c => cityOf(c).smog || c === 'cdmx')
    : d.when === 'hurricane' ? [...cities].some(c => cityOf(c).hurricane)
      : d.when === 'food' ? s.stores.some(x => formatOf(x.formatId).food) : true)
  const d = ok2[Math.floor(nextRandom(s) * ok2.length)]
  if (!d) return
  const cols = s.stores.filter(x => d.when === 'smog' ? (cityOf(x.cityId).smog || x.cityId === 'cdmx') : d.when === 'hurricane' ? cityOf(x.cityId).hurricane : true).map(x => x.colonyId)
  s.dilemma = { id: d.id, colonies: [...new Set(cols)] }
}
export function resolveDilemma (s: GameState, idx: number): Result {
  const cur = s.dilemma; if (!cur) return fail('No hay nada pendiente')
  const d = DILEMMAS.find(x => x.id === cur.id)!; const o = d.options[idx]
  s.dilemma = null
  let msg = o.text
  s.cash -= o.cost ?? 0
  if (o.risk && nextRandom(s) < o.risk.p) { s.cash -= o.risk.cost; msg = o.risk.text; for (const st of s.stores) st.satisfaction = Math.max(0, st.satisfaction - 5) }
  if (o.traffic && s.market) for (const c of cur.colonies) s.market.colonies[c]?.events.push({ text: `${d.title}`, traffic: o.traffic, days: o.days ?? 7 })
  for (const st of s.stores) {
    if (o.sat) st.satisfaction = Math.max(0, Math.min(100, st.satisfaction + o.sat))
    if (o.rep) st.reputation = Math.max(0, Math.min(5, st.reputation + o.rep))
    if (o.margin) for (const k of Object.keys(st.margins) as (keyof typeof st.margins)[]) st.margins[k] = Math.min(0.5, st.margins[k] + o.margin)
  }
  if (o.morale) s.morale = Math.max(0, Math.min(100, (s.morale ?? 70) + o.morale))
  if (o.fire) {
    const st = s.stores.filter(x => x.cashiers.length).sort((a, b) => b.cashiers.length - a.cashiers.length)[0]
    if (st) { const c = st.cashiers.pop()!; msg += ` (${c.name} ya no trabaja contigo)` }
  }
  s.log.unshift({ minute: s.minute, text: `📰 ${d.title}: ${msg}`, kind: o.risk && msg === o.risk.text ? 'bad' : 'info' })
  return ok(msg)
}

// ---------- estilo de vida ----------
export const statusBonus = (s: GameState) => (s.lifestyle ?? []).reduce((a, id) => a + (STATUS_ITEMS.find(i => i.id === id)?.bonus ?? 0), 0)
export const lifestyleValue = (s: GameState) => (s.lifestyle ?? []).reduce((a, id) => a + (STATUS_ITEMS.find(i => i.id === id)?.cost ?? 0) * 0.5, 0)
export function buyStatus (s: GameState, id: string): Result {
  const it = STATUS_ITEMS.find(i => i.id === id); if (!it) return fail('No existe')
  if ((s.lifestyle ??= []).includes(id)) return fail('Ya lo tienes')
  if (s.cash < it.cost) return fail('No alcanza el efectivo')
  s.cash -= it.cost; s.lifestyle.push(id)
  return ok(`${it.emoji} ¡Estrenaste ${it.name.toLowerCase()}!`)
}

// ---------- inversionistas ----------
// confianza 0–1: utilidad reciente, número de tiendas y estatus
export function confidence (s: GameState) {
  const prof = s.reports.slice(-30).reduce((a, r) => a + r.profit, 0)
  return Math.max(0, Math.min(1, 0.2 + Math.min(0.35, s.stores.length * 0.03) + (prof > 0 ? Math.min(0.3, prof / 2e6) : -0.15) + statusBonus(s) * 2))
}
export function maybeInvestor (s: GameState, worth: number) {
  if (s.offer || s.stores.length < 3 || (s.equity ?? 1) < 0.4 || nextRandom(s) > 1 / 20) return
  const who = Math.floor(nextRandom(s) * INVESTORS.length)
  const pct = [0.1, 0.15, 0.2, 0.25][Math.floor(nextRandom(s) * 4)]
  const valuation = Math.max(800000, worth) * (1.4 + confidence(s) * 1.6)
  s.offer = { who, pct, amount: Math.round(valuation * pct / 10000) * 10000, tries: 0 }
  s.log.unshift({ minute: s.minute, text: `🤝 ${INVESTORS[who].name} quiere invertir en tu empresa: Más → Inversionistas`, kind: 'good' })
}
export function answerOffer (s: GameState, a: 'aceptar' | 'negociar' | 'rechazar'): Result {
  const o = s.offer; if (!o) return fail('No hay oferta')
  const inv = INVESTORS[o.who]
  if (a === 'rechazar') { s.offer = null; return ok(`${inv.name} se despidió con amabilidad`) }
  if (a === 'negociar') {
    o.tries++
    if (nextRandom(s) < 0.35 + confidence(s) * 0.4 + statusBonus(s) - o.tries * 0.1) { o.pct = Math.max(0.05, +(o.pct - 0.05).toFixed(2)); return ok(`Aceptó: ahora pide solo ${Math.round(o.pct * 100)} %`) }
    s.offer = null; return fail(`${inv.name} se levantó de la mesa`)
  }
  s.cash += o.amount; s.equity = +((s.equity ?? 1) * (1 - o.pct)).toFixed(4)
  ;(s.investors ??= []).push({ who: o.who, pct: o.pct, amount: o.amount })
  s.offer = null
  s.log.unshift({ minute: s.minute, text: `🤝 ${inv.name} invirtió ${o.amount.toLocaleString('es-MX')} MXN por el ${Math.round(o.pct * 100)} %`, kind: 'good' })
  return ok('¡Trato hecho! El dinero ya está en tu cuenta')
}

// ---------- Bolsa MX ----------
export function initStocks (s: GameState) {
  s.stocks ??= Object.fromEntries(STOCKS.map(k => [k.id, { price: k.price, hist: [k.price], shares: 0, cost: 0 }]))
  return s.stocks
}
export function dailyStocks (s: GameState) {
  const st = initStocks(s); const mkt = (nextRandom(s) - 0.5) * 0.01 + (s.market?.regime ?? 0) * 0.0003
  for (const k of STOCKS) {
    const x = st[k.id]; const z = (nextRandom(s) + nextRandom(s) + nextRandom(s) - 1.5) * 1.15
    x.price = Math.max(1, +(x.price * (1 + k.drift / 365 + k.vol * z + mkt)).toFixed(2))
    x.hist.push(x.price); if (x.hist.length > 120) x.hist.shift()
  }
}
export const portfolioValue = (s: GameState) => Object.values(s.stocks ?? {}).reduce((a, x) => a + x.shares * x.price, 0)
export function tradeStock (s: GameState, id: string, shares: number): Result {
  const x = initStocks(s)[id]; if (!x || !shares) return fail('Operación no válida')
  if (shares > 0) {
    const total = shares * x.price * (1 + STOCK_FEE)
    if (s.cash < total) return fail('No alcanza el efectivo')
    s.cash -= total; x.cost += shares * x.price; x.shares += shares
    return ok(`Compraste ${shares} acciones`)
  }
  const n = Math.min(-shares, x.shares); if (!n) return fail('No tienes acciones')
  x.cost -= x.cost * (n / x.shares); x.shares -= n
  s.cash += n * x.price * (1 - STOCK_FEE)
  return ok(`Vendiste ${n} acciones`)
}

// ---------- día ----------
export function empireDaily (s: GameState, worth: number) {
  dailyStocks(s); maybeDilemma(s); maybeInvestor(s, worth); dailyIpo(s, worth); dailySubsidiaries(s)
}

// ---------- eventos por ciudad y calendario ----------
export function cityEventsAt (d: Date, cityId?: string) { const md = mmdd(d); return CITY_EVENTS.filter(e => (!cityId || e.city === cityId) && inRange(md, e.from, e.to)) }
export function upcomingEvents (d: Date, days = 60) {
  const out: { date: Date; name: string; city?: string; mult: number; tip: string; id: string }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < days; i++) {
    const x = new Date(d.getTime() + i * 864e5); const md = mmdd(x)
    for (const e of CITY_EVENTS) if (md === e.from && !seen.has(e.id)) { seen.add(e.id); out.push({ date: x, name: e.name, city: e.city, mult: e.mult, tip: e.tip, id: e.id }) }
    for (const e of SEASONS) if (md === e.from && !seen.has(e.id)) { seen.add(e.id); out.push({ date: x, name: e.name, mult: e.mult, tip: e.tip, id: e.id }) }
  }
  return out
}

// ---------- salida a Bolsa (OPI) ----------
export function ipoCheck (s: GameState, worth: number) {
  const reasons: string[] = []
  if (s.stores.length < IPO.minStores) reasons.push(`Ten ${IPO.minStores} tiendas (tienes ${s.stores.length})`)
  if (worth < IPO.minWorth) reasons.push(`Llega a $${(IPO.minWorth / 1e6).toFixed(0)} M de patrimonio (pesos de hoy)`)
  if ((s.office ?? 0) < IPO.minOffice) reasons.push('Muda tu sede al piso corporativo (Banco)')
  if (s.reports.slice(-30).reduce((a, r) => a + r.profit, 0) <= 0) reasons.push('Ten utilidad en los últimos 30 días')
  return reasons
}
export function companyValuation (s: GameState, worth: number) {
  const prof = s.reports.slice(-30).reduce((a, r) => a + r.profit, 0) * 12
  return Math.max(worth, worth * 0.6 + Math.max(0, prof) * 9)
}
export function goPublic (s: GameState, worth: number): Result {
  if (s.ipo) return fail('Ya cotizas en la Bolsa MX')
  const r = ipoCheck(s, worth); if (r.length) return fail(r[0])
  const val = companyValuation(s, worth); const price = +(val / IPO.shares).toFixed(2)
  const raised = val * IPO.float * (1 - IPO.fee)
  s.cash += raised
  const own = (s.equity ?? 1) * (1 - IPO.float)
  s.equity = own
  s.ipo = { day: Math.floor(s.minute / 1440), price0: price, hist: [price], price, own }
  s.log.unshift({ minute: s.minute, text: `🔔 ¡${s.company} toca la campana! Sales a la Bolsa MX a $${price} por acción`, kind: 'good' })
  return ok(`Recaudaste ${Math.round(raised).toLocaleString('es-MX')} MXN`)
}
function dailyIpo (s: GameState, worth: number) {
  const p = s.ipo; if (!p) return
  const fair = companyValuation(s, worth) / IPO.shares
  const z = (nextRandom(s) + nextRandom(s) + nextRandom(s) - 1.5) * 0.02
  p.price = Math.max(0.5, +(p.price + (fair - p.price) * 0.08 + p.price * z).toFixed(2))
  p.hist.push(p.price); if (p.hist.length > 120) p.hist.shift()
}
// recomprar o vender acciones propias: cambia qué parte de la empresa es tuya
export function tradeOwn (s: GameState, pct: number): Result {
  const p = s.ipo; if (!p) return fail('Aún no cotizas')
  const cost = IPO.shares * Math.abs(pct) * p.price
  if (pct > 0) {
    if (p.own + pct > 0.95) return fail('No puedes recomprar más')
    if (s.cash < cost) return fail('No alcanza el efectivo')
    s.cash -= cost; p.own += pct; s.equity = p.own
    return ok(`Recompraste ${Math.round(pct * 100)} % de ${s.company}`)
  }
  if (p.own + pct < 0.3) return fail('Te quedarías sin el control de tu empresa')
  s.cash += cost * (1 - STOCK_FEE); p.own += pct; s.equity = p.own
  return ok(`Vendiste ${Math.round(-pct * 100)} % en la Bolsa`)
}

// ---------- conglomerado: comprar cadenas rivales ----------
export const rivalTotal = (s: GameState, i: number) => Object.values(s.market?.rivals[i]?.stores ?? {}).reduce((a, b) => a + b, 0)
export const buyoutCost = (s: GameState, i: number) => Math.round(rivalTotal(s, i) * BUYOUT_PER_STORE * (0.8 + (s.market?.rivals[i]?.aggression ?? 1) * 0.3))
export function buyRival (s: GameState, i: number): Result {
  const r = s.market?.rivals[i]; if (!r) return fail('No existe')
  if (s.stores.length < 6) return fail('Primero ten 6 tiendas propias')
  const n = rivalTotal(s, i); if (!n) return fail('Esa cadena ya no tiene tiendas')
  const cost = buyoutCost(s, i); if (s.cash < cost) return fail('No alcanza el efectivo')
  s.cash -= cost
  ;(s.subsidiaries ??= []).push({ name: r.name, color: r.color, stores: n, day: Math.floor(s.minute / 1440) })
  s.market!.rivals = s.market!.rivals.filter((_, k) => k !== i)
  s.log.unshift({ minute: s.minute, text: `🏢 Compraste ${r.name}: ${n} tiendas se suman a tu conglomerado`, kind: 'good' })
  return ok(`${r.name} ahora es parte de tu grupo`)
}
export const subsidiaryValue = (s: GameState) => (s.subsidiaries ?? []).reduce((a, x) => a + x.stores * BUYOUT_PER_STORE * 0.7, 0)
function dailySubsidiaries (s: GameState) {
  const n = (s.subsidiaries ?? []).reduce((a, x) => a + x.stores, 0)
  if (n) s.cash += n * SUBSIDIARY_DAILY * (0.8 + nextRandom(s) * 0.4)
}
export { colonyById }

// ---------- metas de patrimonio ----------
export function checkMilestones (s: GameState, worth: number) {
  const hit = s.milestonesHit ?? 0
  if (hit < MILESTONES.length && worth * (s.equity ?? 1) >= MILESTONES[hit].amount) {
    s.milestonesHit = hit + 1; s.milestone = hit
    s.log.unshift({ minute: s.minute, text: `🏆 ${MILESTONES[hit].title}`, kind: 'good' })
  }
}
export const reachedWorth = (s: GameState) => (s.milestonesHit ?? 0) > 0 ? MILESTONES[(s.milestonesHit ?? 1) - 1].amount : 0

// ---------- directivos ----------
export function hireDirector (s: GameState, id: 'ops' | 'com' | 'rh' | 'dg'): Result {
  const d = DIRECTORS.find(x => x.id === id)!
  if (reachedWorth(s) < d.minWorth) return fail(`Se desbloquea al llegar a $${(d.minWorth / 1e6).toFixed(0)} M`)
  s.directors ??= {}
  s.directors[id] = !s.directors[id]
  return ok(s.directors[id] ? `${d.who} ya trabaja como ${d.name}` : `${d.who} dejó el puesto`)
}
export const directorsMonthly = (s: GameState) => DIRECTORS.reduce((a, d) => a + (s.directors?.[d.id] ? d.salary : 0), 0)

// ---------- programas sociales ----------
export function toggleSocial (s: GameState, id: string): Result {
  const p = SOCIAL_PROGRAMS.find(x => x.id === id)!; s.social ??= []
  if (s.social.includes(id)) { s.social = s.social.filter(x => x !== id); return ok(`Terminaste ${p.name}`) }
  if (s.cash < p.cost) return fail('No alcanza el efectivo')
  s.cash -= p.cost; s.social.push(id)
  for (const st of s.stores) st.reputation = Math.min(5, st.reputation + p.rep)
  s.morale = Math.min(100, (s.morale ?? 70) + 3)
  s.log.unshift({ minute: s.minute, text: `${p.emoji} Iniciaste ${p.name}. La comunidad lo nota.`, kind: 'good' })
  return ok(`${p.name} en marcha`)
}
export const socialMonthly = (s: GameState) => (s.social ?? []).reduce((a, id) => a + (SOCIAL_PROGRAMS.find(x => x.id === id)?.monthly ?? 0), 0)
export const socialTraffic = (s: GameState) => 1 + (s.social ?? []).reduce((a, id) => a + (SOCIAL_PROGRAMS.find(x => x.id === id)?.traffic ?? 0), 0) * ((s.milestonesHit ?? 0) >= 4 ? 2 : 1)
