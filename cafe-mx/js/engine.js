// Café MX Inc. — motor de simulación. Funciones puras sobre un objeto de estado (sin DOM),
// para poder probarlo en Node y reutilizarlo si el juego se porta a otra plataforma.
import {
  START, TIERS, PRODUCTS, CITIES, ORIGINS, CAMPAIGNS, PROPERTIES, STOCKS, STARTUP_POOL,
  FIRST_NAMES, LAST_NAMES, PHASES
} from './data.js'

export const SAVE_VERSION = 1

// ---------- utilidades ----------
export function mulberry32 (seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
function gauss (rng) {
  let u = 0; let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
export const tierOf = id => TIERS.find(t => t.id === id)
export const cityOf = id => CITIES.find(c => c.id === id)
export const locOf = (cityId, locId) => cityOf(cityId).locs.find(l => l.id === locId)
export const productOf = id => PRODUCTS.find(p => p.id === id)
export const originOf = id => ORIGINS.find(o => o.id === id)

export function dateOf (day) {
  return new Date(Date.UTC(START.year, START.month, START.day + day))
}
export function monthKey (day) {
  const d = dateOf(day)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const round5 = v => Math.max(5, Math.round(v / 5) * 5)
export const defaultPrice = (p, loc) => round5(p.ref * loc.wealth)

// ---------- partida nueva ----------
export function newGame (seed = Date.now(), company = 'Café MX Inc.') {
  const rng = mulberry32(seed)
  const state = {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    rngState: 0,
    company,
    day: 0,
    cash: START.cash,
    loan: 0,
    brand: 10,
    costMult: 1,
    beanMult: 1,
    badge: false,
    unlocked: ['cdmx'],
    aware: Object.fromEntries(CITIES.map(c => [c.id, 6])),
    stores: [],
    nextId: 1,
    beans: { kg: 25, quality: 0.97, avgCost: 185, usage: 0 },
    autoBuy: 'veracruz',
    fincas: {},
    candidates: [],
    campaigns: [],
    props: [],
    market: Object.fromEntries(STOCKS.map(s => [s.id, { price: s.price, hist: [s.price] }])),
    holdings: {},
    pitches: [],
    ventures: [],
    effects: [],
    ledger: {},
    hist: [],
    log: [],
    phase: 0,
    debtDays: 0,
    over: false,
    stats: { cups: 0, bestDay: 0 }
  }
  refreshCandidates(state, rng)
  refreshPitches(state, rng)
  addLog(state, `¡Bienvenido a ${company}! Abre tu primer kiosco en CDMX.`, 'info')
  return state
}

export function addLog (state, text, kind = 'info') {
  state.log.unshift({ day: state.day, text, kind })
  if (state.log.length > 60) state.log.length = 60
}

function ledger (state) {
  const k = monthKey(state.day)
  if (!state.ledger[k]) {
    state.ledger[k] = { ventas: 0, insumos: 0, grano: 0, sueldos: 0, renta: 0, mantenimiento: 0, marketing: 0, intereses: 0, rentas: 0, otros: 0, inversiones: 0 }
    const keys = Object.keys(state.ledger).sort()
    while (keys.length > 24) delete state.ledger[keys.shift()]
  }
  return state.ledger[k]
}
function spend (state, amount, cat) {
  state.cash -= amount
  ledger(state)[cat] += amount
}

// ---------- personal ----------
function makeCandidate (rng) {
  const r = rng()
  const skill = r < 0.35 ? 1 : r < 0.65 ? 2 : r < 0.87 ? 3 : r < 0.97 ? 4 : 5
  return {
    name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
    skill,
    salary: Math.round((8000 + skill * 2600 + rng() * 1500) / 100) * 100
  }
}
export function refreshCandidates (state, rng) {
  state.candidates = Array.from({ length: 4 }, () => makeCandidate(rng))
}

function refreshPitches (state, rng) {
  state.pitches = Array.from({ length: 2 }, () => {
    const base = pick(rng, STARTUP_POOL)
    const risk = rng()
    const odds = 0.18 + (1 - risk) * 0.4 // 18 %–58 % de éxito
    return {
      id: `p${state.day}-${Math.floor(rng() * 1e6)}`,
      name: base.name,
      sector: base.sector,
      ask: Math.round((300000 + rng() * 2700000) / 50000) * 50000,
      odds,
      multiple: +(2.2 + risk * 7).toFixed(1),
      months: 6 + Math.floor(rng() * 13)
    }
  })
}

// ---------- calendario y temporadas ----------
export function seasonInfo (day, city) {
  const d = dateOf(day)
  const m = d.getUTCMonth(); const dd = d.getUTCDate(); const dow = d.getUTCDay()
  let mult = 1
  const tags = []
  if (dow === 0 || dow === 6) mult *= 1.12
  const last = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate()
  if (dd === 15 || dd === 16 || dd === last || dd === 1) { mult *= 1.15; tags.push('Quincena') }
  const muertos = (m === 9 && dd >= 18) || (m === 10 && dd <= 3)
  if (muertos) { mult *= 1.1; tags.push('Día de Muertos') }
  if (m === 10 && dd >= 13 && dd <= 17) { mult *= 1.2; tags.push('Buen Fin') }
  if (m === 11 && dd >= 12) { mult *= 1.15; tags.push('Posadas') }
  if (m === 0 && dd <= 6) { mult *= 1.08; tags.push('Rosca de Reyes') }
  if (city?.tourism) {
    if (m === 11 || m === 6 || (m === 3 && dd <= 12)) { mult *= 1.35; tags.push('Temporada alta') }
    if (m === 8) { mult *= 0.8; tags.push('Temporada baja') }
  }
  if (city?.festival === 'guelaguetza' && m === 6) { mult *= 1.4; tags.push('Guelaguetza') }
  const heat = city?.hot && m >= 3 && m <= 8
  return { mult, tags, muertos, heat }
}

// ---------- grano ----------
export const hasRoaster = state => state.stores.some(s => s.tier === 4)
export function beanPrice (state, originId) {
  const o = originOf(originId)
  return Math.round(o.price * state.beanMult * (hasRoaster(state) ? 0.75 : 1))
}
export function effectiveQuality (state) {
  return state.beans.quality + (hasRoaster(state) ? 0.06 : 0)
}
function addBeans (state, kg, quality, unitCost) {
  const b = state.beans
  const total = b.kg + kg
  if (total <= 0) return
  b.quality = (b.quality * b.kg + quality * kg) / total
  b.avgCost = (b.avgCost * b.kg + unitCost * kg) / total
  b.kg = total
}
export function buyBeans (state, originId, kg) {
  const o = originOf(originId)
  if (!o || kg <= 0) return fail('Origen no válido')
  const cost = beanPrice(state, originId) * kg
  if (state.cash < cost) return fail('No alcanza el efectivo')
  spend(state, cost, 'grano')
  addBeans(state, kg, o.quality, cost / kg)
  if (o.mx === false) state.lastImport = state.day
  return ok(`Compraste ${kg} kg de ${o.name}`)
}
export function buyFinca (state, originId) {
  const o = originOf(originId)
  if (!o?.finca) return fail('Esta región no tiene fincas en venta')
  const lvl = state.fincas[originId] || 0
  if (lvl >= 3) return fail('Finca al máximo')
  const cost = Math.round(o.finca.cost * (1 + lvl * 0.6))
  if (state.cash < cost) return fail('No alcanza el efectivo')
  state.cash -= cost
  ledger(state).inversiones += cost
  state.fincas[originId] = lvl + 1
  addLog(state, lvl ? `Ampliaste tu finca en ${o.region} (nivel ${lvl + 1})` : `¡Compraste una finca en ${o.region}!`, 'good')
  return ok('Finca lista')
}
export const fincaCost = (state, originId) => {
  const o = originOf(originId); const lvl = state.fincas[originId] || 0
  return Math.round(o.finca.cost * (1 + lvl * 0.6))
}

// ---------- ciudades y tiendas ----------
export function unlockCity (state, cityId) {
  const c = cityOf(cityId)
  if (!c || state.unlocked.includes(cityId)) return fail('Ya disponible')
  if (state.cash < c.unlock) return fail('No alcanza el efectivo')
  state.cash -= c.unlock
  ledger(state).inversiones += c.unlock
  state.unlocked.push(cityId)
  state.aware[cityId] = Math.max(state.aware[cityId], 5)
  addLog(state, `Expansión: ${c.name} (${c.tag}) desbloqueada`, 'good')
  return ok(`${c.name} desbloqueada`)
}

export function openStore (state, cityId, locId, tierId = 1) {
  if (!state.unlocked.includes(cityId)) return fail('Ciudad bloqueada')
  const loc = locOf(cityId, locId)
  if (!loc) return fail('Ubicación no válida')
  if (state.stores.some(s => s.city === cityId && s.loc === locId)) return fail('Ya tienes tienda aquí')
  const tier = tierOf(tierId)
  const cost = tier.cost + loc.rent // equipo + depósito de un mes
  if (state.cash < cost) return fail('No alcanza el efectivo')
  state.cash -= cost
  ledger(state).inversiones += cost
  const menu = PRODUCTS.filter(p => p.tier <= tierId).map(p => p.id)
  const store = {
    id: state.nextId++,
    city: cityId,
    loc: locId,
    tier: tierId,
    staff: [],
    menu,
    prices: Object.fromEntries(PRODUCTS.map(p => [p.id, defaultPrice(p, loc)])),
    sat: 55,
    owned: false,
    opened: state.day,
    hist: [],
    today: null
  }
  state.stores.push(store)
  addLog(state, `Abriste ${tier.name} en ${loc.name}, ${cityOf(cityId).name}`, 'good')
  return ok('Tienda abierta — ¡contrata baristas!', store)
}

export const upgradeCost = store => store.tier >= 4 ? Infinity : Math.round(tierOf(store.tier + 1).cost * 0.85)
export function upgradeStore (state, storeId) {
  const s = storeById(state, storeId)
  if (!s || s.tier >= 4) return fail('Nivel máximo')
  const cost = upgradeCost(s)
  if (state.cash < cost) return fail('No alcanza el efectivo')
  state.cash -= cost
  ledger(state).inversiones += cost
  s.tier += 1
  for (const p of PRODUCTS) if (p.tier === s.tier && !s.menu.includes(p.id)) s.menu.push(p.id)
  addLog(state, `Remodelación: ${locOf(s.city, s.loc).name} ahora es ${tierOf(s.tier).name}`, 'good')
  return ok('Remodelación completa')
}
export const buildingPrice = store => locOf(store.city, store.loc).rent * 110
export function buyBuilding (state, storeId) {
  const s = storeById(state, storeId)
  if (!s || s.owned) return fail('Ya es tuyo')
  const cost = buildingPrice(s)
  if (state.cash < cost) return fail('No alcanza el efectivo')
  state.cash -= cost
  ledger(state).inversiones += cost
  s.owned = true
  s.ownedValue = cost
  addLog(state, `Compraste el inmueble de ${locOf(s.city, s.loc).name}: adiós renta`, 'good')
  return ok('Inmueble comprado')
}
export function closeStore (state, storeId) {
  const i = state.stores.findIndex(s => s.id === storeId)
  if (i < 0) return fail('No existe')
  const s = state.stores[i]
  const refund = Math.round(tierOf(s.tier).cost * 0.3 + (s.owned ? s.ownedValue * 0.95 : 0))
  const severance = s.staff.reduce((a, b) => a + b.salary, 0)
  state.cash += refund - severance
  state.stores.splice(i, 1)
  addLog(state, `Cerraste la tienda de ${locOf(s.city, s.loc).name}`, 'bad')
  return ok('Tienda cerrada')
}
export const storeById = (state, id) => state.stores.find(s => s.id === id)

export function hire (state, storeId, idx) {
  const s = storeById(state, storeId)
  const c = state.candidates[idx]
  if (!s || !c) return fail('No disponible')
  if (s.staff.length >= tierOf(s.tier).maxStaff) return fail('Plantilla llena para este nivel')
  s.staff.push({ ...c })
  state.candidates.splice(idx, 1)
  return ok(`${c.name} se une al equipo`)
}
export function fire (state, storeId, idx) {
  const s = storeById(state, storeId)
  const b = s?.staff[idx]
  if (!b) return fail('No existe')
  spend(state, Math.round(b.salary * 0.5), 'otros') // finiquito
  s.staff.splice(idx, 1)
  return ok(`${b.name} dejó la tienda (finiquito pagado)`)
}
export const trainCost = b => 12000 * b.skill
export function train (state, storeId, idx) {
  const s = storeById(state, storeId)
  const b = s?.staff[idx]
  if (!b || b.skill >= 5) return fail('Ya es experto')
  const cost = trainCost(b)
  if (state.cash < cost) return fail('No alcanza el efectivo')
  spend(state, cost, 'otros')
  b.skill += 1
  b.salary += 2200
  return ok(`${b.name} subió a ${b.skill}★`)
}
export function setPrice (state, storeId, productId, price) {
  const s = storeById(state, storeId)
  if (!s) return fail('No existe')
  s.prices[productId] = clamp(Math.round(price), 5, 400)
  return ok()
}
export function toggleMenu (state, storeId, productId) {
  const s = storeById(state, storeId)
  const p = productOf(productId)
  if (!s || !p || p.tier > s.tier) return fail('Requiere mejor nivel de tienda')
  const i = s.menu.indexOf(productId)
  if (i >= 0) s.menu.splice(i, 1); else s.menu.push(productId)
  return ok()
}

// ---------- marketing y marca ----------
export function runCampaign (state, cityId, campId) {
  const c = CAMPAIGNS.find(x => x.id === campId)
  if (!c || !state.unlocked.includes(cityId)) return fail('No disponible')
  if (state.cash < c.cost) return fail('No alcanza el efectivo')
  spend(state, c.cost, 'marketing')
  state.campaigns.push({ city: cityId, id: c.id, daysLeft: c.days, perDay: c.boost / c.days })
  if (c.brand) state.brand = clamp(state.brand + c.brand, 0, 100)
  addLog(state, `Campaña “${c.name}” en ${cityOf(cityId).name}`, 'info')
  return ok('Campaña lanzada')
}
export const BADGE_COST = 400000
export function buyBadge (state) {
  if (state.badge) return fail('Ya certificado')
  if (effectiveQuality(state) < 1.0 && !Object.keys(state.fincas).length) return fail('Necesitas grano de calidad ≥ 1.00 o una finca propia')
  if (state.cash < BADGE_COST) return fail('No alcanza el efectivo')
  spend(state, BADGE_COST, 'marketing')
  state.badge = true
  addLog(state, 'Obtuviste el distintivo de Café Sostenible y Comercio Justo', 'good')
  return ok('¡Certificado!')
}

// ---------- bienes raíces ----------
export function buyProperty (state, propId) {
  const p = PROPERTIES.find(x => x.id === propId)
  if (!p || state.props.some(x => x.id === propId)) return fail('No disponible')
  if (state.cash < p.price) return fail('No alcanza el efectivo')
  state.cash -= p.price
  ledger(state).inversiones += p.price
  state.props.push({ id: p.id, value: p.price, paid: p.price })
  addLog(state, `Compraste ${p.name}`, 'good')
  return ok('Propiedad adquirida')
}
export function sellProperty (state, propId) {
  const i = state.props.findIndex(x => x.id === propId)
  if (i < 0) return fail('No es tuya')
  const v = Math.round(state.props[i].value * 0.97)
  state.cash += v
  state.props.splice(i, 1)
  return ok(`Vendida en ${v}`)
}

// ---------- bolsa ----------
export function buyStock (state, id, shares) {
  const m = state.market[id]
  if (!m || shares <= 0) return fail('No válido')
  const cost = m.price * shares * 1.0025
  if (state.cash < cost) return fail('No alcanza el efectivo')
  state.cash -= cost
  const h = state.holdings[id] || { shares: 0, cost: 0 }
  h.shares += shares; h.cost += cost
  state.holdings[id] = h
  return ok(`Compraste ${shares} acciones de ${id}`)
}
export function sellStock (state, id, shares) {
  const h = state.holdings[id]
  if (!h || shares <= 0) return fail('No tienes acciones')
  shares = Math.min(shares, h.shares)
  const value = state.market[id].price * shares * 0.9975
  h.cost -= h.cost * (shares / h.shares)
  h.shares -= shares
  if (h.shares <= 0) delete state.holdings[id]
  state.cash += value
  return ok(`Vendiste ${shares} acciones de ${id}`)
}
export function ipc (state) {
  return Math.round(STOCKS.reduce((a, s) => a + state.market[s.id].price / s.price, 0) / STOCKS.length * 52000)
}

// ---------- startups ----------
export function investStartup (state, pitchId) {
  const i = state.pitches.findIndex(p => p.id === pitchId)
  if (i < 0) return fail('La oferta ya no está')
  const p = state.pitches[i]
  if (state.cash < p.ask) return fail('No alcanza el efectivo')
  state.cash -= p.ask
  ledger(state).inversiones += p.ask
  state.ventures.push({ ...p, resolveDay: state.day + p.months * 30 })
  state.pitches.splice(i, 1)
  addLog(state, `Invertiste en ${p.name} (${p.sector})`, 'info')
  return ok('Inversión hecha')
}
export const riskLabel = odds => odds > 0.45 ? 'Bajo' : odds > 0.32 ? 'Medio' : 'Alto'

// ---------- crédito ----------
export const LOAN_RATE = 0.16
export const loanLimit = state => Math.max(0, Math.round((500000 + netWorth(state) * 0.35) / 10000) * 10000)
export function takeLoan (state, amount) {
  if (amount <= 0) return fail('Monto inválido')
  if (state.loan + amount > loanLimit(state)) return fail('Excede tu línea de crédito')
  state.loan += amount
  state.cash += amount
  return ok('Crédito depositado')
}
export function repayLoan (state, amount) {
  amount = Math.min(amount, state.loan, Math.max(0, state.cash))
  if (amount <= 0) return fail('Nada que pagar')
  state.loan -= amount
  state.cash -= amount
  return ok('Pago aplicado')
}

// ---------- valuación ----------
export function storeValue (s) {
  return tierOf(s.tier).cost * 0.5 + (s.owned ? s.ownedValue : 0)
}
export function netWorth (state) {
  const stores = state.stores.reduce((a, s) => a + storeValue(s), 0)
  const props = state.props.reduce((a, p) => a + p.value, 0)
  const stocks = Object.entries(state.holdings).reduce((a, [id, h]) => a + h.shares * state.market[id].price, 0)
  const fincas = Object.entries(state.fincas).reduce((a, [id, l]) => a + originOf(id).finca.cost * l * 0.8, 0)
  const ventures = state.ventures.reduce((a, v) => a + v.ask * 0.5, 0)
  return Math.round(state.cash + stores + props + stocks + fincas + ventures + state.beans.kg * state.beans.avgCost - state.loan)
}
export function computePhase (state) {
  const nStores = state.stores.length
  const cities = new Set(state.stores.map(s => s.city)).size
  const nw = netWorth(state)
  if (nw >= 250e6 && cities >= 6) return 4
  if (nw >= 50e6) return 3
  if (nStores >= 8 && cities >= 4) return 2
  if (nStores >= 3 || cities >= 2) return 1
  return 0
}

// ---------- demanda ----------
export function priceFactor (price, ref) {
  const r = price / ref
  return r <= 1 ? 1 + (1 - r) * 0.9 : Math.exp(-(r - 1) * 2.8)
}

// Simula un día de una tienda. Devuelve los números sin modificar el estado.
export function simulateStore (state, s, mods = {}) {
  const city = cityOf(s.city); const loc = locOf(s.city, s.loc); const tier = tierOf(s.tier)
  const season = mods.season || seasonInfo(state.day, city)
  const evMult = mods.evMult ?? 1
  const avail = s.menu.map(productOf).filter(p => p && p.tier <= s.tier && (!p.season || season.muertos))
  if (!s.staff.length || !avail.length) {
    return { closed: true, customers: 0, served: 0, lost: 0, rev: 0, ingr: 0, kg: 0, sales: {}, value: 0, quality: 0 }
  }
  const skill = s.staff.reduce((a, b) => a + b.skill, 0) / s.staff.length
  const q = effectiveQuality(state)
  const quality = (0.55 + 0.45 * q) * (0.7 + skill * 0.1) * tier.ambience
  const aware = state.aware[s.city]
  const potential = 170 * loc.traffic * city.pop * (0.35 + aware / 100 * 0.9) * season.mult * evMult *
    (0.85 + state.brand / 100 * 0.3) * (state.badge ? 1.05 : 1)
  const attrs = avail.map(p => {
    const ref = p.ref * loc.wealth
    let a = p.appeal * priceFactor(s.prices[p.id], ref)
    if (p.heat && (season.heat || mods.heatwave)) a *= 1.8
    return { p, a, ratio: s.prices[p.id] / ref }
  })
  const score = attrs.reduce((a, x) => a + x.a, 0)
  const conv = 1 - Math.exp(-score * 0.9)
  const customers = potential * conv * quality * (0.75 + s.sat / 200)
  const capacity = s.staff.reduce((a, b) => a + 35 + 14 * b.skill, 0) * (s.tier >= 3 ? 1.15 : 1)
  let served = Math.min(customers, capacity)
  const value = attrs.reduce((a, x) => a + clamp(1 - x.ratio, -1, 1) * x.a, 0) / score
  // reparto por producto
  const sales = {}
  let kg = 0; let rev = 0; let ingr = 0
  for (const x of attrs) {
    const n = served * x.a / score
    sales[x.p.id] = n
    kg += n * x.p.g / 1000
  }
  // sin grano no hay café
  const stock = mods.beanStock ?? state.beans.kg
  let short = false
  if (kg > stock) {
    const f = kg > 0 ? stock / kg : 1
    short = true
    let lostCoffee = 0
    for (const x of attrs) if (x.p.g > 0) { lostCoffee += sales[x.p.id] * (1 - f); sales[x.p.id] *= f }
    served -= lostCoffee
    kg = stock
  }
  for (const x of attrs) {
    rev += sales[x.p.id] * s.prices[x.p.id]
    ingr += sales[x.p.id] * x.p.cost * state.costMult
  }
  return { closed: false, customers, capacity, served, lost: Math.max(0, customers - served), rev, ingr, kg, sales, value, quality, short }
}

export function storeDailyCosts (s) {
  const rent = s.owned ? 0 : locOf(s.city, s.loc).rent
  const wages = s.staff.reduce((a, b) => a + b.salary, 0)
  return { rent: rent / 30, wages: wages / 30, upkeep: tierOf(s.tier).upkeep }
}

// ---------- eventos aleatorios ----------
function randomEvent (state, rng) {
  const unlocked = state.unlocked
  const r = rng()
  if (r < 0.12) {
    state.beanMult *= 1.35
    addLog(state, 'Helada en Chiapas: el precio del grano sube 35 %', 'bad')
  } else if (r < 0.22) {
    state.beanMult *= 0.85
    addLog(state, 'Cosecha récord en Veracruz: el grano baja 15 %', 'good')
  } else if (r < 0.34) {
    state.effects.push({ type: 'heat', daysLeft: 10 })
    addLog(state, 'Ola de calor: todos piden Cold Brew', 'info')
  } else if (r < 0.46) {
    const c = pick(rng, unlocked)
    state.effects.push({ type: 'demand', city: c, mult: 0.85, daysLeft: 7 })
    addLog(state, `Lluvias fuertes en ${cityOf(c).name}: menos gente en la calle`, 'bad')
  } else if (r < 0.58 && state.stores.length) {
    const s = pick(rng, state.stores)
    state.aware[s.city] = clamp(state.aware[s.city] + 12, 0, 100)
    addLog(state, `¡Reseña viral de tu tienda en ${locOf(s.city, s.loc).name}!`, 'good')
  } else if (r < 0.68) {
    const c = pick(rng, unlocked)
    state.aware[c] = clamp(state.aware[c] - 8, 0, 100)
    addLog(state, `Una cadena rival abrió en ${cityOf(c).name}`, 'bad')
  } else if (r < 0.75) {
    state.costMult *= 1.04
    addLog(state, 'Inflación: leche, azúcar y vasos suben 4 %', 'bad')
  } else if (r < 0.82) {
    for (const s of STOCKS) state.market[s.id].price *= 1.06
    addLog(state, 'Rally en la bolsa: el IPC sube 6 %', 'good')
  } else if (r < 0.88) {
    for (const s of STOCKS) state.market[s.id].price *= 0.92
    addLog(state, 'Caída en la bolsa: el IPC pierde 8 %', 'bad')
  } else if (r < 0.94 && state.stores.length) {
    spend(state, 15000, 'otros')
    addLog(state, 'Inspección sanitaria: multa de $15,000', 'bad')
  } else {
    const c = pick(rng, unlocked)
    state.effects.push({ type: 'demand', city: c, mult: 1.25, daysLeft: 5 })
    addLog(state, `Festival gastronómico en ${cityOf(c).name}: +25 % de clientes`, 'good')
  }
}

function announceCalendar (state) {
  const d = dateOf(state.day); const m = d.getUTCMonth(); const dd = d.getUTCDate()
  if (m === 9 && dd === 18) addLog(state, 'Temporada de Día de Muertos: ya puedes vender Pan de Muerto', 'info')
  if (m === 10 && dd === 13) addLog(state, '¡Empieza el Buen Fin! +20 % de clientes', 'info')
  if (m === 6 && dd === 1 && state.unlocked.includes('oax')) addLog(state, 'Julio de Guelaguetza en Oaxaca: +40 %', 'info')
  if (m === 11 && dd === 12) addLog(state, 'Temporada de posadas: +15 % hasta fin de año', 'info')
}

// ---------- paso de un día ----------
export function step (state, rng) {
  if (state.over) return
  state.day += 1
  const L = ledger(state)
  announceCalendar(state)
  if (rng() < 1 / 11) randomEvent(state, rng)

  const heatwave = state.effects.some(e => e.type === 'heat')
  let dayRev = 0; let dayCost = 0; let cups = 0; let kgUsed = 0

  // fincas producen grano propio
  for (const [id, lvl] of Object.entries(state.fincas)) {
    const o = originOf(id)
    addBeans(state, o.finca.kgDay * lvl, o.quality + 0.04, 60)
  }

  for (const s of state.stores) {
    const city = cityOf(s.city)
    const evMult = state.effects.filter(e => e.type === 'demand' && e.city === s.city).reduce((a, e) => a * e.mult, 1)
    const r = simulateStore(state, s, { evMult, heatwave })
    const c = storeDailyCosts(s)
    const beanCost = r.kg * state.beans.avgCost
    state.beans.kg = Math.max(0, state.beans.kg - r.kg)
    kgUsed += r.kg
    spend(state, r.ingr, 'insumos')
    spend(state, c.rent, 'renta')
    spend(state, c.wages, 'sueldos')
    spend(state, c.upkeep, 'mantenimiento')
    state.cash += r.rev
    L.ventas += r.rev
    const cost = r.ingr + c.rent + c.wages + c.upkeep + beanCost
    dayRev += r.rev; dayCost += cost; cups += r.served
    s.today = { rev: r.rev, profit: r.rev - cost, served: r.served, lost: r.lost, customers: r.customers, capacity: r.capacity || 0, short: r.short, closed: r.closed, sales: r.sales }
    s.hist.push(Math.round(r.rev))
    if (s.hist.length > 60) s.hist.shift()
    // satisfacción y reconocimiento
    let target = r.closed ? 20 : 55 + (r.quality - 0.85) * 70 + r.value * 30 - (r.customers ? r.lost / r.customers : 0) * 50
    if (r.short) target -= 30
    s.sat = clamp(s.sat + (clamp(target, 0, 100) - s.sat) * 0.08, 0, 100)
    state.aware[s.city] = clamp(state.aware[s.city] + r.served / 120 * (s.sat - 35) / 50 / Math.max(1, city.pop), 0, 100)
  }

  // campañas
  for (const c of state.campaigns) { state.aware[c.city] = clamp(state.aware[c.city] + c.perDay, 0, 100); c.daysLeft-- }
  state.campaigns = state.campaigns.filter(c => c.daysLeft > 0)
  for (const e of state.effects) e.daysLeft--
  state.effects = state.effects.filter(e => e.daysLeft > 0)
  // el reconocimiento se desvanece sin tiendas
  for (const c of CITIES) state.aware[c.id] = Math.max(0, state.aware[c.id] - (state.aware[c.id] - 4) * 0.004)

  // marca nacional
  const avgSat = state.stores.length ? state.stores.reduce((a, s) => a + s.sat, 0) / state.stores.length : state.brand
  const brandTarget = clamp(avgSat * 0.7 + state.stores.length * 1.5 + (state.badge ? 8 : 0), 0, 100)
  state.brand = clamp(state.brand + (brandTarget - state.brand) * 0.01, 0, 100)

  // grano: consumo, autocompra y precio
  state.beans.usage = state.beans.usage * 0.8 + kgUsed * 0.2
  if (state.autoBuy && state.beans.kg < state.beans.usage * 5 + 1) {
    const kg = Math.max(25, Math.ceil(state.beans.usage * 14 / 5) * 5)
    const res = buyBeans(state, state.autoBuy, kg)
    if (!res.ok && state.day % 7 === 0) addLog(state, 'Don Chuy: no hay dinero para reabastecer grano', 'bad')
  }
  state.beanMult += (1 - state.beanMult) * 0.01

  // bienes raíces
  for (const p of state.props) {
    const def = PROPERTIES.find(x => x.id === p.id)
    let income = def.rent / 30
    if (def.tourism) income *= seasonInfo(state.day, cityOf('cun')).mult
    state.cash += income
    L.rentas += income
    p.value *= 1 + 0.00013 + gauss(rng) * 0.0015
  }
  for (const s of state.stores) if (s.owned) s.ownedValue *= 1.00013

  // bolsa
  const marketShock = gauss(rng) * 0.004
  for (const def of STOCKS) {
    const m = state.market[def.id]
    m.price = Math.max(1, m.price * Math.exp(def.drift + def.vol * gauss(rng) + marketShock))
    m.hist.push(+m.price.toFixed(2))
    if (m.hist.length > 90) m.hist.shift()
  }

  // startups
  for (const v of state.ventures.filter(v => v.resolveDay <= state.day)) {
    const roll = rng()
    if (roll < v.odds) {
      const pay = v.ask * v.multiple
      state.cash += pay; L.otros -= pay
      addLog(state, `¡${v.name} fue adquirida! Recibes ${Math.round(pay).toLocaleString('es-MX')} MXN (×${v.multiple})`, 'good')
    } else if (roll < v.odds + 0.25) {
      const pay = v.ask * 0.5
      state.cash += pay; L.otros -= pay
      addLog(state, `${v.name} se vendió barato: recuperas la mitad`, 'info')
    } else {
      addLog(state, `${v.name} cerró operaciones. Perdiste la inversión`, 'bad')
    }
  }
  state.ventures = state.ventures.filter(v => v.resolveDay > state.day)

  // crédito
  if (state.loan > 0) spend(state, state.loan * LOAN_RATE / 365, 'intereses')

  // ciclos
  if (state.day % 7 === 0) refreshCandidates(state, rng)
  if (dateOf(state.day).getUTCDate() === 1) refreshPitches(state, rng)

  state.hist.push({ rev: Math.round(dayRev), profit: Math.round(dayRev - dayCost) })
  if (state.hist.length > 120) state.hist.shift()
  state.stats.cups += cups
  state.stats.bestDay = Math.max(state.stats.bestDay, dayRev)

  const ph = computePhase(state)
  if (ph > state.phase) {
    state.phase = ph
    addLog(state, `🏆 Fase de expansión ${PHASES[ph].n}: ${PHASES[ph].name}`, 'good')
  }

  // quiebra
  if (state.cash < 0) {
    state.debtDays++
    if (state.debtDays === 1) addLog(state, 'Lic. Mariana: ¡estamos en números rojos! Tienes 45 días para corregir', 'bad')
    if (state.debtDays >= 45) {
      state.over = true
      addLog(state, 'Quiebra: el banco tomó el control de la empresa', 'bad')
    }
  } else state.debtDays = 0
}

// ---------- guardado ----------
export function serialize (state) { return JSON.stringify(state) }
export function deserialize (text) {
  const s = JSON.parse(text)
  if (!s || s.v !== SAVE_VERSION || !Array.isArray(s.stores)) throw new Error('Partida incompatible')
  return s
}

function ok (msg = '', data) { return { ok: true, msg, data } }
function fail (msg) { return { ok: false, msg } }
