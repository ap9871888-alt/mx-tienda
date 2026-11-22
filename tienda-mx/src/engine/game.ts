// Partida, acciones del jugador y simulación minuto a minuto. Sin React: se puede probar en Node.
import { CATEGORIES, PRODUCT_CATEGORIES, categoryOf, type CategoryId } from '../data/categories'
import { formatOf, type FormatId } from '../data/formats'
import { colonyOf, cityOf } from '../data/cities'
import { ECONOMY } from '../data/economy'
import { FIRST_NAMES, LAST_NAMES } from '../data/names'
import { nextRandom, pick, poisson, randInt } from './rng'
import { dayOf, hourOf, MIN_PER_DAY, dayMultiplier, dateLabel } from './time'
import {
  defaultMargins, unitCost, unitPrice, priceFactor, arrivalsPerHour, serviceRate, shelfCapacity, salaryFor, monthlyRent, priceIndex
} from './pricing'
import type { GameState, Store, Result, GameEvent, DayStats, DayReport, Candidate, BasketLine, CatMap, LogEntry } from './types'

export const SAVE_VERSION = 3
const ok = <T>(msg = '', data?: T): Result<T> => ({ ok: true, msg, data })
const fail = (msg: string): Result<never> => ({ ok: false, msg })
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ---------- partida ----------
export function newGame (seed: number, company = 'Tienda MX Inc.'): GameState {
  const s: GameState = {
    version: SAVE_VERSION, seed: seed >>> 0, rng: seed >>> 0, company,
    minute: 6 * 60 + 30, carry: 0, cash: ECONOMY.startCash, loan: 0,
    stores: [], candidates: [], nextId: 1, log: [], reports: [], todayFees: 0
  }
  refreshCandidates(s)
  log(s, `¡Bienvenido a ${company}! Abre tu tienda piloto en la Ciudad de México.`, 'info')
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
  const f = formatOf(formatId)
  if (!f.available) return fail(`${f.name} se desbloquea en el ${f.unlockNote}`)
  if (s.stores.some(x => x.cityId === cityId && x.colonyId === colonyId && x.formatId === formatId)) return fail('Ya tienes este formato en la colonia')
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
    margins: defaultMargins(), cashiers: [], selfCheckouts: 0, security: 0, cleaning: 0, bonus: false, autoReorder: true,
    inventory: Object.fromEntries(CATEGORIES.map(c => [c.id, c.service ? 0 : f.shelfUnits])) as CatMap<number>,
    orders: [], queue: [], serviceCarry: 0, satisfaction: 70, reputation: 3, today: emptyDay(), history: []
  }
  s.stores.push(st)
  log(s, `Abriste ${f.name} en ${colonyOf(cityId, colonyId).name}, ${cityOf(cityId).name}`, 'good')
  return ok('Tienda abierta: contrata cajeros para empezar a vender', st)
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
export function orderQuote (st: Store) {
  const cap = shelfCapacity(st)
  const items: Partial<CatMap<number>> = {}
  let cost = 0
  for (const c of PRODUCT_CATEGORIES) {
    const need = Math.max(0, Math.round(cap - st.inventory[c.id] - pendingUnits(st, c.id)))
    if (need > 0) { items[c.id] = need; cost += need * unitCost(c.id) }
  }
  return { items, cost: Math.round(cost), fee: ECONOMY.restockFee }
}
export function placeOrder (s: GameState, storeId: number, events?: GameEvent[]): Result {
  const st = storeById(s, storeId)
  if (!st) return fail('No existe')
  const q = orderQuote(st)
  if (!Object.keys(q.items).length) return fail('El anaquel ya está lleno o el pedido viene en camino')
  if (s.cash < q.cost + q.fee) return fail('No alcanza para el pedido al mayorista')
  s.cash -= q.cost + q.fee
  st.today.fees += q.fee
  st.orders.push({ id: s.nextId++, arrivesAt: s.minute + ECONOMY.restockLeadMinutes, items: q.items, cost: q.cost })
  if (events) log(s, `Pedido al mayorista para ${colonyOf(st.cityId, st.colonyId).name}: llega en 6 h`, 'info', events)
  return ok('Pedido enviado: el mayorista llega en 6 horas')
}

// ---------- crédito ----------
export const loanLimit = (s: GameState) => ECONOMY.loanLimitBase + s.stores.length * 150000
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
  const spend = Math.sqrt(colonyOf(st.cityId, st.colonyId).wealth) // en colonias de más ingreso se lleva más
  for (const c of CATEGORIES) {
    if (nextRandom(s) < c.basketProb * spend * priceFactor(st, c.id)) {
      const qty = Math.max(1, Math.round(randInt(s, c.qty[0], c.qty[1]) * (c.service ? 1 : f.basketMult)))
      basket.push({ cat: c.id, qty })
    }
  }
  return basket
}
function checkout (st: Store, basket: BasketLine[], events: GameEvent[]) {
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
      st.today.cogs += sold * unitCost(line.cat)
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
  for (const st of s.stores) {
    // llegan pedidos del mayorista
    const due = st.orders.filter(o => o.arrivesAt <= minute)
    if (due.length) {
      for (const o of due) for (const [cat, n] of Object.entries(o.items)) st.inventory[cat as CategoryId] = Math.min(shelfCapacity(st), st.inventory[cat as CategoryId] + (n || 0))
      st.orders = st.orders.filter(o => o.arrivesAt > minute)
      events.push({ type: 'delivery', storeId: st.id })
    }
    // pedido automático cada hora en punto
    if (st.autoReorder && minute % 60 === 0 && !st.orders.length &&
      PRODUCT_CATEGORIES.some(c => st.inventory[c.id] < shelfCapacity(st) * ECONOMY.reorderThreshold)) {
      const r = placeOrder(s, st.id, events)
      if (!r.ok && hour === 9) log(s, `No alcanzó para resurtir ${colonyOf(st.cityId, st.colonyId).name}`, 'bad', events)
    }
    const canServe = st.cashiers.length + st.selfCheckouts > 0
    // llegadas
    if (canServe) {
      const n = poisson(s, arrivalsPerHour(st, hour, mult) / 60)
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
      const r = checkout(st, c.basket, events)
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
  const company: DayReport = { day, sales: 0, commissions: 0, cogs: 0, payroll: 0, rent: 0, power: 0, shrink: 0, upkeep: 0, fees: 0, interest: 0, profit: 0, tickets: 0, abandoned: 0, satisfaction: 0 }
  for (const st of s.stores) {
    const t = st.today; const f = formatOf(st.formatId)
    const payroll = st.cashiers.reduce((a, c) => a + c.salary, 0) * (st.bonus ? 1 + ECONOMY.bonusRate : 1) / 30
    const rent = monthlyRent(st) / 30
    const power = f.kwhDay * ECONOMY.kwhPrice
    const shrinkRate = ECONOMY.shrinkBySecurity[st.security]
    // la merma se lleva mercancía del anaquel
    let shrink = 0
    for (const c of PRODUCT_CATEGORIES) {
      const units = (t.catUnits[c.id] || 0) * shrinkRate / (1 - shrinkRate)
      const take = Math.min(st.inventory[c.id], units)
      st.inventory[c.id] -= take
      shrink += take * unitCost(c.id)
    }
    const upkeep = (f.overhead + ECONOMY.securityMonthly[st.security] + ECONOMY.cleaningMonthly[st.cleaning]) / 30
    const profit = t.sales + t.commissions - t.cogs - payroll - rent - power - shrink - upkeep - t.fees
    s.cash -= payroll + rent + power + upkeep
    st.reputation = clamp(st.reputation + (st.satisfaction / 20 - st.reputation) * 0.15, 0, 5)
    const rep: DayReport = { day, sales: t.sales, commissions: t.commissions, cogs: t.cogs, payroll, rent, power, shrink, upkeep, fees: t.fees, interest: 0, profit, tickets: t.tickets, abandoned: t.abandoned, satisfaction: st.satisfaction }
    st.history.push(rep); if (st.history.length > 60) st.history.shift()
    for (const k of ['sales', 'commissions', 'cogs', 'payroll', 'rent', 'power', 'shrink', 'upkeep', 'fees', 'profit', 'tickets', 'abandoned'] as const) company[k] += rep[k]
    st.today = emptyDay()
  }
  company.interest = s.loan * ECONOMY.loanRate / 365
  s.cash -= company.interest
  company.profit -= company.interest
  company.satisfaction = s.stores.length ? s.stores.reduce((a, x) => a + x.satisfaction, 0) / s.stores.length : 0
  s.reports.push(company); if (s.reports.length > 90) s.reports.shift()
  events.push({ type: 'dayEnd', report: company })
  if (s.stores.length) log(s, `Corte del ${dateLabel(day).date}: utilidad ${Math.round(company.profit).toLocaleString('es-MX')} MXN`, company.profit >= 0 ? 'good' : 'bad', events)
  // cada lunes: nuevos candidatos y algo de rotación de personal
  if ((day + 1) % 7 === 0) {
    refreshCandidates(s)
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
  s.carry += minutes
  let n = Math.floor(s.carry)
  s.carry -= n
  n = Math.min(n, 3 * MIN_PER_DAY) // tope de seguridad
  for (let i = 0; i < n; i++) stepMinute(s, events)
  return events
}

// ---------- valuación y fase ----------
export function netWorth (s: GameState) {
  const stores = s.stores.reduce((a, st) => a + formatOf(st.formatId).capex * 0.6 +
    PRODUCT_CATEGORIES.reduce((b, c) => b + st.inventory[c.id] * unitCost(c.id), 0), 0)
  return Math.round(s.cash + stores - s.loan)
}
export function phaseInfo (s: GameState) {
  const n = s.stores.length
  if (n >= 4) return { phase: 2, name: 'Clúster Urbano', next: 'Llega a 10 tiendas o $12 M para construir CEDIS (Hito 2)', progress: Math.min(1, n / 10) }
  return { phase: 1, name: 'Tienda Piloto', next: 'Abre 4 sucursales para llegar a Clúster Urbano', progress: n / 4 }
}

export function serialize (s: GameState) { return JSON.stringify(s) }
export function deserialize (text: string): GameState {
  const s = JSON.parse(text)
  if (!s || s.version !== SAVE_VERSION || !Array.isArray(s.stores)) throw new Error('Partida incompatible con esta versión')
  return s as GameState
}
