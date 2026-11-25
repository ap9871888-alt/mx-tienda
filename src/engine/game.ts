// Partida, acciones del jugador y simulación minuto a minuto. Sin React: se puede probar en Node.
import { CATEGORIES, PRODUCT_CATEGORIES, categoryOf, type CategoryId } from '../data/categories'
import { formatOf, type FormatId } from '../data/formats'
import { CITIES, colonyOf, cityOf } from '../data/cities'
import { ECONOMY } from '../data/economy'
import { FIRST_NAMES, LAST_NAMES } from '../data/names'
import { CEDIS, PRIVATE_LABELS, VOLUME_DISCOUNT, type LabelId } from '../data/logistics'
import { nextRandom, pick, poisson, randInt } from './rng'
import { generateMarket, dailyMarket, weeklyMarketAI, fundValue, effectiveWealth, effectiveTraffic, effectiveCompetition } from './market'
import { dayOf, hourOf, MIN_PER_DAY, dayMultiplier, dateLabel, setEpoch, dateOfDay } from './time'
import { PRODUCTS, QUALITY, EQUIPMENT } from '../data/products'
import { worldDaily } from './world'
import { labDaily, hasInvention } from './lab'
import { checkMilestones, directorsMonthly, socialMonthly, socialTraffic, subsidiaryValue, initStocks, empireDaily, seasonMultiplier, lifestyleValue, portfolioValue } from './empire'
import { OFFICES, OFFICE_CREDIT, OFFICE_RATE_CUT, TERM_LOANS } from '../data/bank'
import { priceLevelAt, loanRateAt, hasFeature, historicMultiplier, historicEvents } from './era'
import { HISTORIC_EVENTS } from '../data/eras'
import {
  setLabInventions, defaultMargins, unitCost, unitPrice, priceFactor, arrivalsPerHour, serviceRate, shelfCapacity, salaryFor, monthlyRent, priceIndex, purchaseCost
} from './pricing'
import type { WeeklyReport, CompanyProfile, GameState, Store, Result, GameEvent, DayStats, DayReport, Candidate, BasketLine, CatMap, LogEntry } from './types'

export const SAVE_VERSION = 6
const STREETS = ['Av. Insurgentes', 'Calle Morelos', 'Av. Juárez', 'Calle Hidalgo', 'Av. Revolución', 'Calle Allende', 'Av. Universidad', 'Calle Zaragoza', 'Calle Madero', 'Av. Reforma', 'Calle Guerrero', 'Av. Cuauhtémoc']
const ok = <T>(msg = '', data?: T): Result<T> => ({ ok: true, msg, data })
const fail = (msg: string): Result<never> => ({ ok: false, msg })
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ---------- partida ----------
export const DIFFICULTY = {
  facil: { cash: 1.6, rivals: 0.6, label: 'Tranquilo', desc: 'Más dinero inicial y rivales calmados. Ideal para aprender.', rivalsDesc: 'Rivales calmados y pocas crisis. Ideal para aprender.' },
  normal: { cash: 1, rivals: 1, label: 'Normal', desc: 'La experiencia de un emprendedor real.', rivalsDesc: 'Competencia real: los rivales reaccionan a ti.' },
  dificil: { cash: 0.6, rivals: 1.4, label: 'Tiburón', desc: 'Poco capital y rivales agresivos.', rivalsDesc: 'Rivales agresivos y guerras de precios.' }
}
export function newGame (seed: number, company = 'Tienda MX Inc.', startYear = 2027, profile?: CompanyProfile): GameState {
  setEpoch(startYear)
  const s: GameState = {
    version: SAVE_VERSION, seed: seed >>> 0, rng: seed >>> 0, company, startYear, cities: ['cdmx'],
    minute: 6 * 60 + 30, carry: 0, cash: ECONOMY.startCash * DIFFICULTY[profile?.difficulty ?? 'normal'].cash, loan: 0, profile, here: 'cdmx', trip: null, tutorial: 0,
    stores: [], candidates: [], nextId: 1, log: [], reports: [], todayFees: 0, cedis: null, labels: [], tripsToday: 0,
    market: null as unknown as GameState['market']
  }
  s.market = generateMarket(s)
  // modo «desde la calle»: ciudad aleatoria, poco dinero y un puesto ambulante
  if (profile?.street) {
    const c = CITIES[Math.floor(nextRandom(s) * CITIES.length)]
    s.here = c.id; s.cities = [c.id]; s.cash = 6000
    s.founder = { age: profile.age ?? 16, skin: profile.skin ?? '#C68642', street: true }
  }
  if (profile?.capital != null && !profile.street) s.cash = profile.capital
  for (const r of s.market.rivals) r.aggression = +(r.aggression * DIFFICULTY[profile?.difficulty ?? 'normal'].rivals).toFixed(2)
  refreshCandidates(s)
  initStocks(s)
  log(s, profile?.street ? `Empiezas en ${cityOf(s.here!).name} con $6,000 y muchas ganas: abre un puesto ambulante en Mapa.` : `¡Bienvenido a ${company}! Abre tu tienda piloto en la Ciudad de México.`, 'info')
  return s
}
export function log (s: GameState, text: string, kind: LogEntry['kind'] = 'info', events?: GameEvent[]) {
  const entry = { minute: s.minute, text, kind }
  s.log.unshift(entry)
  if (s.log.length > 60) s.log.length = 60
  events?.push({ type: 'log', entry })
}
const emptyDay = (): DayStats => ({ sales: 0, commissions: 0, cogs: 0, fees: 0, arrivals: 0, tickets: 0, abandoned: 0, lostItems: 0, waitSum: 0, maxQueue: 0, catUnits: {} })
export const storeById = (s: GameState, id: number) => s.stores.find(x => x.id === id)
export const storeName = (st: Store) => `${formatOf(st.formatId).name} ${colonyOf(st.cityId, st.colonyId).name}`
export const storeShort = (st: Store) => `${colonyOf(st.cityId, st.colonyId).name} · ${st.label}`
export const priceLevel = (s: GameState) => priceLevelAt(dateOfDay(dayOf(s.minute)))
export const nominal = (s: GameState, v: number) => Math.round(v * priceLevel(s))
export function formatAvailable (s: GameState, formatId: FormatId): Result {
  const f = formatOf(formatId); const d = dateOfDay(dayOf(s.minute))
  if (!f.available) return fail(`${f.name} se desbloquea en el ${f.unlockNote}`)
  if (formatId === 'hardDiscount' && !hasFeature(d, 'hardDiscount')) return fail('Los hard discount llegan a México en 2004')
  return ok()
}
export const ownIn = (s: GameState, colonyId: string) => s.stores.filter(x => x.colonyId === colonyId).length

// ---------- ciudades ----------
// productos propios y equipo: cada uno empuja las ventas de su línea
export function lineBoost (s: GameState, st: Store, cat: CategoryId) {
  let b = cat === 'bebidas' && hasInvention(s, 'bebida') ? 1.15 : 1
  for (const p of s.products ?? []) { const d = PRODUCTS.find(x => x.id === p.id); if (d?.cat === cat && (!d.only || d.only.includes(st.formatId))) b *= 1 + QUALITY[p.quality].attract }
  for (const id of st.equipment ?? []) { const e = EQUIPMENT.find(x => x.id === id); if (e?.cat === cat) b *= 1 + (e.boost ?? 0); if (id === 'farmacia') b *= 1.08 }
  return b
}
export function createProduct (s: GameState, id: string, quality: number): Result {
  const q = QUALITY[quality]; const d = PRODUCTS.find(x => x.id === id)
  if (!q || !d) return fail('Producto no válido')
  const cur = (s.products ??= []).find(p => p.id === id)
  if (cur && cur.quality >= quality) return fail('Ya lo tienes en esa calidad')
  const cost = q.cost - (cur ? QUALITY[cur.quality].cost : 0)
  if (s.cash < cost) return fail('No alcanza el efectivo')
  s.cash -= cost
  if (cur) cur.quality = quality; else s.products.push({ id, quality, sold: 0 })
  log(s, `🏷️ Lanzaste ${d.name} (${q.name}) con tu marca`, 'good')
  return ok(`${d.name} ya está en tus anaqueles`)
}
export function buyEquipment (s: GameState, storeId: number, id: string): Result {
  const st = s.stores.find(x => x.id === storeId); const e = EQUIPMENT.find(x => x.id === id)
  if (!st || !e) return fail('No aplica')
  if ((st.equipment ??= []).includes(id)) return fail('Ya lo tienes')
  if (s.cash < e.cost) return fail('No alcanza el efectivo')
  s.cash -= e.cost; st.equipment.push(id)
  return ok(`${e.name} instalado`)
}
// directivos: hacen solos el trabajo repetitivo de cada tienda
export function runDirectors (s: GameState, events: GameEvent[]) {
  const d = s.directors ?? {}
  for (const st of s.stores) {
    const f = formatOf(st.formatId)
    if (d.ops) {
      st.autoReorder = true
      const last = st.history[st.history.length - 1]
      const needs = !f.ownerSells && (st.cashiers.length === 0 || (last && last.abandoned > Math.max(3, last.tickets * 0.06)))
      if (needs && st.cashiers.length < f.maxCashiers && s.candidates.length) {
        const best = s.candidates.reduce((bi, c, i, a) => (c.stars > a[bi].stars ? i : bi), 0)
        hireCashier(s, st.id, best)
      }
    }
    if (d.rh) {
      const low = st.cashiers.find(c => c.stars < 3)
      if (low && s.cash > 200000 && nextRandom(s) < 0.15) trainCashier(s, st.id, low.id)
    }
    if (d.com) {
      // precios al punto del mercado de la colonia: margen base ajustado por poder adquisitivo
      const base = defaultMargins(st.formatId); const w = effectiveWealth(s, st.cityId, st.colonyId)
      for (const k of Object.keys(base) as CategoryId[]) {
        if (categoryOf(k).service) continue
        const target = Math.max(0.08, Math.min(0.45, base[k] * (0.85 + 0.3 * (w - 0.9))))
        st.margins[k] = +(st.margins[k] + (target - st.margins[k]) * 0.5).toFixed(3)
      }
    }
  }
  // Director General: abre una tienda nueva cuando hay dinero de sobra (si lo autorizaste)
  if (d.dg && s.dgBudget && s.cash > 3_000_000 && nextRandom(s) < 0.2) {
    const here = s.here ?? 'cdmx'
    const opts = cityOf(here).colonies.filter(c => ownIn(s, c.id) < c.slots)
      .map(c => ({ c, score: effectiveTraffic(s, here, c.id) * effectiveWealth(s, here, c.id) / (1 + effectiveCompetition(s, here, c.id)) }))
      .sort((a, b) => b.score - a.score)
    const pick = opts[0]
    if (pick) {
      const fmt: FormatId = s.cash > 8_000_000 ? 'conveniencia' : 'tiendita'
      const r = openStore(s, here, pick.c.id, fmt)
      if (r.ok) log(s, `👔 Lic. Valeria abrió una ${formatOf(fmt).name} en ${pick.c.name}`, 'good', events)
    }
  }
  if ((s.morale ?? 70) < 35 && s.stores.length) for (const st of s.stores) st.satisfaction = Math.max(0, st.satisfaction - 0.5)
}
// remodelación: más gente entra y sale contenta
export const remodelCost = (st: Store) => Math.round(formatOf(st.formatId).capex * 0.3 * ((st.remodel ?? 0) + 1))
export function remodelStore (s: GameState, storeId: number): Result {
  const st = s.stores.find(x => x.id === storeId)
  if (!st) return fail('Tienda no encontrada')
  if ((st.remodel ?? 0) >= 3) return fail('Ya es una tienda insignia')
  const c = remodelCost(st)
  if (s.cash < c) return fail('No alcanza el efectivo')
  if (st.works) return fail('Ya hay una obra en curso')
  const day = dayOf(s.minute); const days = [7, 14, 30][st.remodel ?? 0]
  s.cash -= c; st.works = { to: (st.remodel ?? 0) + 1, start: day, end: day + days }
  log(s, `🚧 Empezó la remodelación de ${storeShort(st)}: ${days} días de obra`, 'info')
  return ok(`Obra iniciada: ${days} días. Mientras tanto entra menos gente`)
}
// reporte semanal: resumen de los últimos 7 días y consejos concretos
export function weeklyReport (s: GameState, week: number): WeeklyReport {
  const sum = (rs: DayReport[], k: keyof DayReport) => rs.reduce((a, r) => a + ((r[k] as number) || 0), 0)
  const w = s.reports.slice(-7); const prev = s.reports.slice(-14, -7)
  const per = s.stores.map(st => ({ id: st.id, name: storeShort(st), profit: st.history.slice(-7).reduce((a, h) => a + h.profit, 0), st }))
  per.sort((a, b) => b.profit - a.profit)
  const tips: string[] = []
  const ab = sum(w, 'abandoned'); const tk = sum(w, 'tickets')
  if (ab > tk * 0.08) tips.push(`Se fueron ${ab} clientes por la fila: contrata otro cajero o pon autocobro.`)
  const worst = per[per.length - 1]
  if (per.length > 1 && worst.profit < 0) tips.push(`${worst.name} perdió dinero: revisa sus precios o considera cambiar de formato.`)
  if (s.cash < 50000) tips.push('Tu efectivo está bajo: cuida la nómina del lunes o pide una línea de crédito.')
  if (s.stores.length >= 4 && !s.cedis) tips.push('Ya tienes 4 tiendas: un CEDIS te bajaría el costo de mercancía.')
  if (!(s.products ?? []).length && s.stores.length >= 3) tips.push('Lanza tu primer producto de marca propia: más margen en toda tu cadena.')
  if (!tips.length) tips.push('¡Buena semana! Considera abrir otra tienda en una colonia con poca competencia.')
  const avgSat = s.stores.reduce((a, x) => a + x.satisfaction, 0) / s.stores.length
  return {
    week, sales: sum(w, 'sales') + sum(w, 'commissions'), profit: sum(w, 'profit'), prevProfit: prev.length ? sum(prev, 'profit') : null,
    tickets: tk, abandoned: ab, best: per[0] ? { id: per[0].id, name: per[0].name, profit: per[0].profit } : null,
    worst: per.length > 1 ? { id: worst.id, name: worst.name, profit: worst.profit } : null,
    cash: s.cash, worth: netWorth(s), satisfaction: avgSat, tips: tips.slice(0, 3)
  }
}
export const canExpand = (s: GameState) => s.stores.length >= 4
// ---------- viajes: para abrir o administrar otra ciudad tienes que ir ----------
export function tripQuote (s: GameState, to: string) {
  const a = cityOf(s.here ?? 'cdmx'); const b = cityOf(to)
  const km = Math.round(Math.hypot((a.nx - b.nx) * 1.49, a.ny - b.ny) * 23)
  return { km, bus: { hours: Math.max(2, Math.round(km / 75)), cost: Math.round(200 + km * 1.1) }, avion: { hours: Math.round(2.5 + km / 700), cost: Math.round(2200 + km * 2.2) } }
}
export function travel (s: GameState, to: string, mode: 'bus' | 'avion'): Result {
  if (s.trip) return fail('Ya vas en camino')
  if ((s.here ?? 'cdmx') === to) return fail('Ya estás aquí')
  const q = tripQuote(s, to)[mode]
  if (s.cash < q.cost) return fail('No alcanza para el boleto')
  s.cash -= q.cost
  s.trip = { to, arrive: s.minute + q.hours * 60, mode }
  log(s, `${mode === 'avion' ? '✈️ Vuelo' : '🚌 Autobús'} a ${cityOf(to).name}: llegas en ${q.hours} h`, 'info')
  return ok(`Buen viaje: llegas en ${q.hours} horas`)
}
export function updateTrip (s: GameState) {
  if (s.trip && s.minute >= s.trip.arrive) {
    s.here = s.trip.to; log(s, `📍 Llegaste a ${cityOf(s.trip.to).name}`, 'good'); s.trip = null
  }
}
export function unlockCity (s: GameState, cityId: string): Result {
  const c = cityOf(cityId)
  if (s.cities.includes(cityId)) return fail('Ya operas en esa ciudad')
  if (!canExpand(s)) return fail('Primero llega a Clúster Urbano: 4 tiendas en la CDMX')
  if ((s.here ?? 'cdmx') !== cityId) return fail(`Primero viaja a ${c.name} para conocer la plaza`)
  if (s.cash < c.unlock) return fail('No alcanza el efectivo')
  s.cash -= c.unlock; s.cities.push(cityId)
  log(s, `🗺️ Expansión: ya puedes abrir tiendas en ${c.name}`, 'good')
  return ok(`${c.name} desbloqueada`)
}

// ---------- personal ----------
function makeCandidate (s: GameState): Candidate {
  const r = nextRandom(s)
  const stars = r < 0.3 ? 1 : r < 0.62 ? 2 : r < 0.86 ? 3 : r < 0.97 ? 4 : 5
  return { name: `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`, stars, salary: Math.round((salaryFor(stars) + nextRandom(s) * 900) / 50) * 50 }
}
export function refreshCandidates (s: GameState) { s.candidates = Array.from({ length: 4 }, () => makeCandidate(s)) }
export function hireCashier (s: GameState, storeId: number, idx: number): Result {
  const st = storeById(s, storeId); const c = s.candidates[idx]
  if (!st || !c) return fail('Candidato no disponible')
  if (st.cashiers.length >= formatOf(st.formatId).maxCashiers) return fail('Ya no caben más cajeros en este formato')
  st.cashiers.push({ id: s.nextId++, ...c })
  s.candidates.splice(idx, 1)
  return ok(`${c.name} ya cobra en caja`)
}
export function fireCashier (s: GameState, storeId: number, cashierId: number): Result {
  const st = storeById(s, storeId); const c = st?.cashiers.find(x => x.id === cashierId)
  if (!st || !c) return fail('No existe')
  s.cash -= Math.round(c.salary * 0.5) // finiquito
  st.cashiers = st.cashiers.filter(x => x.id !== cashierId)
  return ok(`${c.name} salió (finiquito ${Math.round(c.salary * 0.5).toLocaleString('es-MX')} MXN)`)
}
export const trainCost = (stars: number) => ECONOMY.trainCostPerStar * stars
export function trainCashier (s: GameState, storeId: number, cashierId: number): Result {
  const st = storeById(s, storeId); const c = st?.cashiers.find(x => x.id === cashierId)
  if (!st || !c) return fail('No existe')
  if (c.stars >= 5) return fail('Ya tiene 5 estrellas')
  const cost = trainCost(c.stars)
  if (s.cash < cost) return fail('No alcanza el efectivo')
  s.cash -= cost; c.stars++; c.salary += ECONOMY.salaryPerStar
  return ok(`${c.name} subió a ${c.stars} ★`)
}

// ---------- apertura y mejoras ----------
export function canOpen (s: GameState, cityId: string, colonyId: string, formatId: FormatId): Result {
  const fa = formatAvailable(s, formatId)
  if (!fa.ok) return fa
  if (!s.cities.includes(cityId)) return fail(`Primero desbloquea ${cityOf(cityId).name} en el mapa nacional`)
  if (ownIn(s, colonyId) >= colonyOf(cityId, colonyId).slots) return fail('Ya no hay locales disponibles en esta colonia')
  if ((s.here ?? 'cdmx') !== cityId) return fail(`Estás en ${cityOf(s.here ?? 'cdmx').name}: viaja a ${cityOf(cityId).name} para abrir ahí`)
  const cost = openingCost(cityId, colonyId, formatId)
  if (s.cash < cost) return fail('No alcanza el efectivo')
  return ok()
}
// CAPEX + un mes de depósito + inventario inicial
export function openingCost (cityId: string, colonyId: string, formatId: FormatId) {
  const f = formatOf(formatId); const col = colonyOf(cityId, colonyId)
  const stock = PRODUCT_CATEGORIES.reduce((a, c) => a + f.shelfUnits * unitCost(c.id), 0)
  return Math.round(f.capex + f.rent * col.rentMult + stock)
}
export function openStore (s: GameState, cityId: string, colonyId: string, formatId: FormatId): Result<Store> {
  const chk = canOpen(s, cityId, colonyId, formatId)
  if (!chk.ok) return fail(chk.msg)
  s.cash -= openingCost(cityId, colonyId, formatId)
  const f = formatOf(formatId)
  const st: Store = {
    id: s.nextId++, cityId, colonyId, formatId, openedDay: dayOf(s.minute),
    label: `${pick(s, STREETS)} ${randInt(s, 10, 990)}`,
    margins: defaultMargins(formatId), cashiers: [], selfCheckouts: 0, security: 0, cleaning: 0, bonus: false, autoReorder: true,
    inventory: Object.fromEntries(CATEGORIES.map(c => [c.id, c.service ? 0 : f.shelfUnits])) as CatMap<number>,
    orders: [], queue: [], serviceCarry: 0, satisfaction: 70, reputation: 3, today: emptyDay(), history: []
  }
  s.stores.push(st)
  log(s, `Abriste ${f.name} en ${colonyOf(cityId, colonyId).name}, ${cityOf(cityId).name}`, 'good')
  return ok(f.ownerSells ? '¡Puesto listo! Tú mismo atiendes: a vender' : 'Tienda abierta: contrata cajeros para empezar a vender', st)
}
export function setMargin (s: GameState, storeId: number, cat: CategoryId, margin: number): Result {
  const st = storeById(s, storeId)
  if (!st || categoryOf(cat).service) return fail('No aplica')
  st.margins[cat] = clamp(margin, 0.02, 0.6)
  return ok()
}
export function buySelfCheckout (s: GameState, storeId: number): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  if (!hasFeature(dateOfDay(dayOf(s.minute)), 'selfCheckout')) return fail('Las cajas de autocobro llegan en 2012')
  if (st.selfCheckouts >= formatOf(st.formatId).selfCheckoutSlots) return fail('No cabe otra caja de autocobro')
  if (s.cash < ECONOMY.selfCheckoutCost) return fail('No alcanza el efectivo')
  s.cash -= ECONOMY.selfCheckoutCost; st.selfCheckouts++
  return ok('Caja de autocobro instalada')
}
export function upgradeSecurity (s: GameState, storeId: number): Result {
  const st = storeById(s, storeId)
  if (!st || st.security >= 2) return fail('Ya está al máximo')
  const cost = ECONOMY.securityCost[st.security + 1]
  if (s.cash < cost) return fail('No alcanza el efectivo')
  s.cash -= cost; st.security++
  return ok(st.security === 1 ? 'Cámaras instaladas: menos robo hormiga' : 'Auditoría de inventario y control de caducidades activos')
}
export function setCleaning (s: GameState, storeId: number, level: number): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  st.cleaning = clamp(Math.round(level), 0, 2)
  return ok()
}
export function toggleBonus (s: GameState, storeId: number): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  st.bonus = !st.bonus
  return ok(st.bonus ? 'Bono de desempeño activo: +10 % rapidez, menos rotación' : 'Bono desactivado')
}
export function toggleAutoReorder (s: GameState, storeId: number): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  st.autoReorder = !st.autoReorder
  return ok(st.autoReorder ? 'Pedido automático al mayorista activado' : 'Pedido automático desactivado')
}

// ---------- abasto (Fase 1: mayorista) ----------
export function pendingUnits (st: Store, cat: CategoryId) {
  return st.orders.reduce((a, o) => a + (o.items[cat] || 0), 0)
}
export function orderQuote (st: Store, g?: GameState) {
  const cap = shelfCapacity(st)
  const items: Partial<CatMap<number>> = {}
  let cost = 0
  for (const c of PRODUCT_CATEGORIES) {
    const need = Math.max(0, Math.round(cap - st.inventory[c.id] - pendingUnits(st, c.id)))
    if (need > 0) { items[c.id] = need; cost += need * purchaseCost(g, c.id, st) }
  }
  const cedis = !!g?.cedis && !!cityOf(st.cityId).cedisRadius
  return { items, cost: Math.round(cost), fee: cedis ? CEDIS.fuelPerTrip : ECONOMY.restockFee, via: (cedis ? 'cedis' : 'mayorista') as 'cedis' | 'mayorista' }
}
export function placeOrder (s: GameState, storeId: number, events?: GameEvent[]): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  const q = orderQuote(st, s)
  if (!Object.keys(q.items).length) return fail('El anaquel ya está lleno o el pedido viene en camino')
  if (s.cash < q.cost + q.fee) return fail(q.via === 'cedis' ? 'No alcanza para surtir desde el CEDIS' : 'No alcanza para el pedido al mayorista')
  s.cash -= q.cost + q.fee
  st.today.fees += q.fee
  const where = colonyOf(st.cityId, st.colonyId).name
  if (q.via === 'cedis') {
    // sin camión libre hoy, el pedido sale mañana temprano: eso es desabasto
    const busy = s.tripsToday >= tripCapacity(s)
    const arrivesAt = busy ? (dayOf(s.minute) + 1) * MIN_PER_DAY + 6 * 60 + CEDIS.leadMinutes : s.minute + CEDIS.leadMinutes
    if (!busy) s.tripsToday++
    st.orders.push({ id: s.nextId++, arrivesAt, items: q.items, cost: q.cost, via: 'cedis', delayed: busy })
    if (busy && events) log(s, `Flotilla saturada: el resurtido de ${where} sale mañana. Compra otro camión.`, 'bad', events)
    return ok(busy ? 'Sin camiones libres: el pedido sale mañana a las 6:00' : 'Despacho desde el CEDIS: llega en 3 horas')
  }
  st.orders.push({ id: s.nextId++, arrivesAt: s.minute + ECONOMY.restockLeadMinutes, items: q.items, cost: q.cost, via: 'mayorista' })
  if (events) log(s, `Pedido al mayorista para ${where}: llega en 6 h`, 'info', events)
  return ok('Pedido enviado: el mayorista llega en 6 horas')
}

// ---------- CEDIS, flotilla y Marca Propia ----------
export const tripCapacity = (s: GameState) => s.cedis ? s.cedis.trucks * CEDIS.tripsPerTruck : 0
export function cedisRequirement (s: GameState) {
  const okStores = s.stores.length >= CEDIS.requiredStores
  const okWorth = netWorth(s) >= CEDIS.requiredNetWorth
  return { ok: okStores || okWorth, stores: s.stores.length, worth: netWorth(s) }
}
export function buildCedis (s: GameState): Result {
  if (s.cedis) return fail('Ya tienes CEDIS')
  const req = cedisRequirement(s)
  if (!req.ok) return fail(`Necesitas ${CEDIS.requiredStores} tiendas o $${(CEDIS.requiredNetWorth / 1e6).toFixed(0)} M de patrimonio`)
  if (s.cash < CEDIS.cost) return fail('No alcanza el efectivo')
  s.cash -= CEDIS.cost
  s.cedis = { level: 1, trucks: CEDIS.startingTrucks, builtDay: dayOf(s.minute) }
  for (const st of s.stores) st.orders = st.orders.filter(o => o.via === 'cedis' || o.arrivesAt > s.minute)
  log(s, `🚚 Inauguraste el ${CEDIS.name}: inventario ${Math.round(CEDIS.savings[0] * 100)} % más barato y ${CEDIS.startingTrucks} camiones`, 'good')
  return ok('CEDIS construido')
}
export function upgradeCedis (s: GameState): Result {
  if (!s.cedis) return fail('Primero construye el CEDIS')
  if (s.cedis.level >= CEDIS.savings.length) return fail('El CEDIS ya está al máximo')
  const cost = CEDIS.upgradeCost[s.cedis.level]
  if (s.cash < cost) return fail('No alcanza el efectivo')
  s.cash -= cost; s.cedis.level++
  return ok(`CEDIS nivel ${s.cedis.level}: ahorro de ${Math.round(CEDIS.savings[s.cedis.level - 1] * 100)} %`)
}
export function buyTruck (s: GameState): Result {
  if (!s.cedis) return fail('Primero construye el CEDIS')
  if (s.cash < CEDIS.truckCost) return fail('No alcanza el efectivo')
  s.cash -= CEDIS.truckCost; s.cedis.trucks++
  return ok(`Camión nuevo: ${tripCapacity(s)} viajes al día`)
}
export function sellTruck (s: GameState): Result {
  if (!s.cedis || s.cedis.trucks <= 1) return fail('Necesitas al menos un camión')
  s.cedis.trucks--; s.cash += Math.round(CEDIS.truckCost * 0.5)
  return ok('Camión vendido a la mitad de su precio')
}
export function launchLabel (s: GameState, id: LabelId): Result {
  const l = PRIVATE_LABELS.find(x => x.id === id)
  if (!l || s.labels.includes(id)) return fail('Esa línea ya existe')
  if (!s.cedis) return fail('La Marca Propia necesita un CEDIS para distribuirse')
  if (s.cash < l.cost) return fail('No alcanza el efectivo')
  s.cash -= l.cost; s.labels.push(id)
  log(s, `🏷️ Lanzaste ${l.name}: tu costo en ${categoryOf(l.cat).name} baja 15 %`, 'good')
  return ok(`${l.name} ya está en tus anaqueles`)
}
export const logisticsDaily = (s: GameState) => s.cedis ? (CEDIS.monthly + s.cedis.trucks * CEDIS.truckMonthly) / 30 : 0

// ---------- crédito ----------
export const loanLimit = (s: GameState) => Math.round((ECONOMY.loanLimitBase + s.stores.length * 150000) * OFFICE_CREDIT[s.office ?? 0])
export const lineRate = (s: GameState) => Math.max(0.04, loanRateAt(dateOfDay(dayOf(s.minute))) - OFFICE_RATE_CUT[s.office ?? 0])
export const termDebt = (s: GameState) => (s.terms ?? []).reduce((a, t) => a + t.balance, 0)
export function buyOffice (s: GameState): Result {
  const lvl = (s.office ?? 0) + 1; const o = OFFICES[lvl]
  if (!o) return fail('Ya tienes la torre corporativa')
  if (s.cash < o.cost) return fail('No alcanza el efectivo')
  s.cash -= o.cost; s.office = lvl
  log(s, `🏢 Nueva sede: ${o.name} en ${o.place}`, 'good')
  return ok(`${o.name} lista`)
}
export function takeTerm (s: GameState, id: string): Result {
  const d = TERM_LOANS.find(t => t.id === id)!
  if ((s.terms ?? []).some(t => t.id === id)) return fail('Ya tienes ese crédito')
  if (d.minStores && s.stores.length < d.minStores) return fail(`Necesitas ${d.minStores} tiendas`)
  if ((s.office ?? 0) < 1) return fail('El banco pide una oficina regional')
  const rate = Math.max(0.04, lineRate(s) - d.rateCut); const days = d.months * 30
  const i = rate / 365; const daily = d.amount * i / (1 - Math.pow(1 + i, -days))
  ;(s.terms ??= []).push({ id, balance: d.amount, daily, rate })
  s.cash += d.amount
  return ok(`Recibiste ${d.label.toLowerCase()}`)
}
export function takeLoan (s: GameState, amount: number): Result {
  if (amount <= 0 || s.loan + amount > loanLimit(s)) return fail('Excede tu línea de crédito PyME')
  s.loan += amount; s.cash += amount
  return ok('Crédito depositado')
}
export function repayLoan (s: GameState, amount: number): Result {
  const n = Math.min(amount, s.loan, Math.max(0, s.cash))
  if (n <= 0) return fail('No hay nada que pagar o no alcanza')
  s.loan -= n; s.cash -= n
  return ok('Pago aplicado al crédito')
}

// ---------- simulación ----------
function makeBasket (s: GameState, st: Store): BasketLine[] {
  const f = formatOf(st.formatId); const basket: BasketLine[] = []
  const spend = Math.sqrt(effectiveWealth(s, st.cityId, st.colonyId)) // en colonias de más ingreso se lleva más
  const recargas = hasFeature(dateOfDay(dayOf(s.minute)), 'recargas')
  for (const c of CATEGORIES) {
    if (c.service && f.noServices) continue
    const era = c.service && !recargas ? 0.4 : 1 // sin celulares solo se pagan recibos
    if (nextRandom(s) < c.basketProb * era * spend * priceFactor(st, c.id, s) * lineBoost(s, st, c.id)) {
      const qty = Math.max(1, Math.round(randInt(s, c.qty[0], c.qty[1]) * (c.service ? 1 : f.basketMult)))
      basket.push({ cat: c.id, qty })
    }
  }
  return basket
}
function checkout (s: GameState, st: Store, basket: BasketLine[], events: GameEvent[]) {
  let amount = 0; let items = 0; let lost = 0
  for (const line of basket) {
    const c = categoryOf(line.cat)
    if (c.service) { st.today.commissions += c.price * line.qty; amount += c.price * line.qty; items += line.qty; continue }
    const sold = Math.min(line.qty, Math.floor(st.inventory[line.cat]))
    if (sold < line.qty) { lost += line.qty - sold; if (st.inventory[line.cat] < 1) events.push({ type: 'stockout', storeId: st.id, cat: line.cat }) }
    if (sold > 0) {
      st.inventory[line.cat] -= sold
      const price = unitPrice(st, line.cat)
      amount += sold * price
      st.today.sales += sold * price
      st.today.cogs += sold * purchaseCost(s, line.cat, st)
      st.today.catUnits[line.cat] = (st.today.catUnits[line.cat] || 0) + sold
      items += sold
    }
  }
  st.today.lostItems += lost
  return { amount, items, lost }
}
function satisfactionTarget (st: Store, waited: number, lostShare: number) {
  let overPrice = 0
  for (const c of CATEGORIES) if (!c.service) overPrice += Math.max(0, priceIndex(st, c.id) - 1) * c.basketProb
  return clamp(78 + ECONOMY.cleaningSatisfaction[st.cleaning] - Math.max(0, waited - 3) * 4 - lostShare * 40 - overPrice * 45, 0, 100)
}

function stepMinute (s: GameState, events: GameEvent[]) {
  const minute = s.minute
  const hour = hourOf(minute)
  const { mult } = dayMultiplier(dayOf(minute))
  const date = dateOfDay(dayOf(minute))
  for (const st of s.stores) {
    // llegan pedidos del mayorista
    const due = st.orders.filter(o => o.arrivesAt <= minute)
    if (due.length) {
      for (const o of due) for (const [cat, n] of Object.entries(o.items)) st.inventory[cat as CategoryId] = Math.min(shelfCapacity(st), st.inventory[cat as CategoryId] + (n || 0))
      st.orders = st.orders.filter(o => o.arrivesAt > minute)
      events.push({ type: 'delivery', storeId: st.id, via: due[0].via })
    }
    // pedido automático cada hora en punto
    if (st.autoReorder && minute % 60 === 0 && !st.orders.length &&
      PRODUCT_CATEGORIES.some(c => st.inventory[c.id] < shelfCapacity(st) * ECONOMY.reorderThreshold)) {
      const r = placeOrder(s, st.id, events)
      if (!r.ok && hour === 9) log(s, `No alcanzó para resurtir ${colonyOf(st.cityId, st.colonyId).name}`, 'bad', events)
    }
    const canServe = st.cashiers.length + st.selfCheckouts > 0 || !!formatOf(st.formatId).ownerSells
    // llegadas
    if (canServe) {
      const n = poisson(s, arrivalsPerHour(st, hour, mult * historicMultiplier(date, st.cityId) * seasonMultiplier(date, st.cityId) * socialTraffic(s) * (s.profile?.perk === 'ventas' ? 1.1 : 1), s) / 60)
      for (let i = 0; i < n; i++) {
        const basket = makeBasket(s, st)
        if (!basket.length) continue
        st.today.arrivals++
        const q = st.queue.length
        if (q >= ECONOMY.queueTolerance && nextRandom(s) < 0.15 * (q - ECONOMY.queueTolerance + 1)) {
          st.today.abandoned++
          st.satisfaction = clamp(st.satisfaction - 0.6, 0, 100)
          events.push({ type: 'balk', storeId: st.id })
          continue
        }
        const id = s.nextId++
        st.queue.push({ id, arrivedAt: minute, patience: randInt(s, ECONOMY.patienceMin[0], ECONOMY.patienceMin[1]), basket })
        events.push({ type: 'arrive', storeId: st.id, customerId: id })
      }
    }
    // cobro en caja
    st.serviceCarry = Math.min(st.serviceCarry + serviceRate(st) / 60, 4)
    while (st.serviceCarry >= 1 && st.queue.length) {
      st.serviceCarry -= 1
      const c = st.queue.shift()!
      const waited = minute - c.arrivedAt
      const r = checkout(s, st, c.basket, events)
      const lostShare = r.lost / Math.max(1, r.items + r.lost)
      st.satisfaction += (satisfactionTarget(st, waited, lostShare) - st.satisfaction) * 0.03
      if (r.amount > 0) {
        st.today.tickets++
        st.today.waitSum += waited
        s.cash += r.amount
        events.push({ type: 'sale', storeId: st.id, customerId: c.id, amount: r.amount, items: r.items, happy: waited <= 3 && lostShare === 0 })
      } else events.push({ type: 'abandon', storeId: st.id, customerId: c.id })
    }
    if (!st.queue.length) st.serviceCarry = Math.min(st.serviceCarry, 1)
    // se cansan de esperar
    const gone = st.queue.filter(c => minute - c.arrivedAt > c.patience)
    if (gone.length) {
      st.queue = st.queue.filter(c => minute - c.arrivedAt <= c.patience)
      st.today.abandoned += gone.length
      st.satisfaction = clamp(st.satisfaction - 1.2 * gone.length, 0, 100)
      for (const c of gone) events.push({ type: 'abandon', storeId: st.id, customerId: c.id })
    }
    st.today.maxQueue = Math.max(st.today.maxQueue, st.queue.length)
  }
  s.minute++
  if (s.minute % MIN_PER_DAY === 0) endOfDay(s, events)
}

// corte de caja diario
function endOfDay (s: GameState, events: GameEvent[]) {
  const day = dayOf(s.minute) - 1
  const company: DayReport = { day, sales: 0, commissions: 0, cogs: 0, payroll: 0, rent: 0, power: 0, shrink: 0, upkeep: 0, fees: 0, interest: 0, logistics: 0, profit: 0, tickets: 0, abandoned: 0, satisfaction: 0 }
  for (const st of s.stores) {
    const t = st.today; const f = formatOf(st.formatId)
    const payroll = st.cashiers.reduce((a, c) => a + c.salary, 0) * (st.bonus ? 1 + ECONOMY.bonusRate : 1) / 30
    const rent = monthlyRent(st) / 30
    const power = f.kwhDay * (hasInvention(s, 'solar') ? 0.4 : 1) * ECONOMY.kwhPrice
    const shrinkRate = ECONOMY.shrinkBySecurity[st.security]
    // la merma se lleva mercancía del anaquel
    let shrink = 0
    for (const c of PRODUCT_CATEGORIES) {
      const units = (t.catUnits[c.id] || 0) * shrinkRate / (1 - shrinkRate)
      const take = Math.min(st.inventory[c.id], units)
      st.inventory[c.id] -= take
      shrink += take * purchaseCost(s, c.id, st)
    }
    const upkeep = (f.overhead + ECONOMY.securityMonthly[st.security] + ECONOMY.cleaningMonthly[st.cleaning]) / 30
    const profit = t.sales + t.commissions - t.cogs - payroll - rent - power - shrink - upkeep - t.fees
    s.cash -= payroll + rent + power + upkeep
    st.reputation = clamp(st.reputation + (st.satisfaction / 20 - st.reputation) * 0.15, 0, 5)
    const rep: DayReport = { day, sales: t.sales, commissions: t.commissions, cogs: t.cogs, payroll, rent, power, shrink, upkeep, fees: t.fees, interest: 0, logistics: 0, profit, tickets: t.tickets, abandoned: t.abandoned, satisfaction: st.satisfaction }
    st.history.push(rep); if (st.history.length > 60) st.history.shift()
    for (const k of ['sales', 'commissions', 'cogs', 'payroll', 'rent', 'power', 'shrink', 'upkeep', 'fees', 'profit', 'tickets', 'abandoned'] as const) company[k] += rep[k]
    st.today = emptyDay()
  }
  company.interest = s.loan * lineRate(s) / 365 + OFFICES[s.office ?? 0].monthly / 30 + (directorsMonthly(s) + socialMonthly(s)) / 30
  // créditos a plazo: pago diario fijo (interés + capital)
  for (const t of s.terms ?? []) {
    const int = t.balance * t.rate / 365; const pay = Math.min(t.daily, t.balance + int)
    t.balance = Math.max(0, t.balance + int - pay); s.cash -= pay - int; company.interest += int
  }
  s.terms = (s.terms ?? []).filter(t => t.balance > 1)
  company.logistics = logisticsDaily(s)
  s.cash -= company.interest + company.logistics
  company.profit -= company.interest + company.logistics
  s.tripsToday = 0
  dailyMarket(s, (t, k) => log(s, t, k, events))
  empireDaily(s, netWorth(s))
  worldDaily(s, company.profit)
  const delivery = labDaily(s); company.profit += delivery; company.sales += Math.max(0, delivery) * 5
  for (const st of s.stores) if (st.works && day + 1 >= st.works.end) {
    st.remodel = st.works.to; st.works = null; st.satisfaction = Math.min(100, st.satisfaction + 8)
    log(s, `✨ ¡Reinauguración! ${storeShort(st)} quedó como nueva`, 'good', events)
  }
  runDirectors(s, events)
  checkMilestones(s, netWorth(s))
  company.satisfaction = s.stores.length ? s.stores.reduce((a, x) => a + x.satisfaction, 0) / s.stores.length : 0
  s.reports.push(company); if (s.reports.length > 90) s.reports.shift()
  if ((day + 1) % 7 === 0 && s.stores.length) s.weekly = weeklyReport(s, Math.floor((day + 1) / 7))
  events.push({ type: 'dayEnd', report: company })
  if (s.stores.length) log(s, `Corte del ${dateLabel(day).date}: utilidad ${nominal(s, company.profit).toLocaleString('es-MX')} MXN`, company.profit >= 0 ? 'good' : 'bad', events)
  // sucesos históricos que empiezan mañana
  const tomorrow = dateOfDay(day + 1).toISOString().slice(0, 10)
  for (const e of HISTORIC_EVENTS) if (e.from === tomorrow) log(s, `📰 ${e.text}`, e.traffic >= 0 ? 'good' : 'bad', events)
  void historicEvents
  // cada lunes: nuevos candidatos y algo de rotación de personal
  if ((day + 1) % 7 === 0) {
    refreshCandidates(s)
    weeklyMarketAI(s, events, (t, k) => log(s, t, k, events))
    for (const st of s.stores) {
      const chance = st.bonus ? ECONOMY.quitChanceWeeklyBonus : ECONOMY.quitChanceWeekly
      for (const c of [...st.cashiers]) {
        const underpaid = c.salary < salaryFor(c.stars)
        if (nextRandom(s) < chance * (underpaid ? 2 : 1)) {
          st.cashiers = st.cashiers.filter(x => x.id !== c.id)
          log(s, `${c.name} renunció en ${colonyOf(st.cityId, st.colonyId).name}. Contrata a alguien más.`, 'bad', events)
        }
      }
    }
  }
}

// avanza la simulación `minutes` minutos de juego (puede ser fraccionario)
export function advance (s: GameState, minutes: number, events: GameEvent[] = []) {
  setEpoch(s.startYear); setLabInventions(s.lab?.done ?? [])
  s.carry += minutes
  let n = Math.floor(s.carry)
  s.carry -= n
  n = Math.min(n, 3 * MIN_PER_DAY) // tope de seguridad
  for (let i = 0; i < n; i++) stepMinute(s, events)
  updateTrip(s)
  return events
}

// ---------- valuación y fase ----------
export function netWorth (s: GameState) {
  const stores = s.stores.reduce((a, st) => a + formatOf(st.formatId).capex * 0.6 +
    PRODUCT_CATEGORIES.reduce((b, c) => b + st.inventory[c.id] * unitCost(c.id), 0), 0)
  const cedis = s.cedis ? (CEDIS.cost + CEDIS.upgradeCost.slice(0, s.cedis.level).reduce((a, b) => a + b, 0) + s.cedis.trucks * CEDIS.truckCost) * 0.6 : 0
  return Math.round(s.cash + stores + cedis + fundValue(s) + lifestyleValue(s) + portfolioValue(s) + subsidiaryValue(s) + OFFICES.slice(1, (s.office ?? 0) + 1).reduce((a, o) => a + o.cost * 0.5, 0) - s.loan - termDebt(s))
}
export function phaseInfo (s: GameState) {
  const n = s.stores.length
  if (s.labels.length) return { phase: 4, name: 'Marca Propia', next: 'Ecosistema fintech, conglomerados y BMV llegan en el Hito 3', progress: Math.min(1, s.labels.length / PRIVATE_LABELS.length) }
  if (s.cedis) return { phase: 3, name: 'CEDIS Propio', next: 'Lanza tu primera línea de Marca Propia en Logística', progress: 0.5 }
  if (n >= VOLUME_DISCOUNT.minStores) return { phase: 2, name: 'Clúster Urbano', next: `Llega a ${CEDIS.requiredStores} tiendas o $${CEDIS.requiredNetWorth / 1e6} M para construir tu CEDIS · ya compras 8 % más barato`, progress: Math.max(n / CEDIS.requiredStores, netWorth(s) / CEDIS.requiredNetWorth) }
  return { phase: 1, name: 'Tienda Piloto', next: `Abre ${VOLUME_DISCOUNT.minStores} sucursales para llegar a Clúster Urbano (−8 % en mercancía)`, progress: n / VOLUME_DISCOUNT.minStores }
}

export function serialize (s: GameState) { return JSON.stringify(s) }
// partidas del Hito 1 (versión 3) se actualizan sin perder nada
export function migrateGame (s: GameState & { version: number }): GameState {
  if (s.version === 3) {
    s.cedis = null; s.labels = []; s.tripsToday = 0
    for (const r of s.reports) r.logistics = r.logistics ?? 0
    for (const st of s.stores) { for (const r of st.history) r.logistics = r.logistics ?? 0; for (const o of st.orders) o.via = o.via ?? 'mayorista' }
    s.version = 4
  }
  if (s.version === 4) { s.market = generateMarket(s); s.version = 5 }
  if (s.version === 5) {
    s.startYear = 2027; s.cities = ['cdmx']
    for (const st of s.stores) st.label = st.label ?? `Local ${st.id}`
    s.version = SAVE_VERSION
  }
  setEpoch(s.startYear)
  return s
}
export function deserialize (text: string): GameState {
  const s = JSON.parse(text)
  if (!s || !Array.isArray(s.stores) || (s.version < 3 || s.version > SAVE_VERSION)) throw new Error('Partida incompatible con esta versión')
  return migrateGame(s)
}
