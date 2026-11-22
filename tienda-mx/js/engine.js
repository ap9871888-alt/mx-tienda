// Tienda MX Inc. — motor de simulación (puro, sin DOM). Un día por paso.
import {
  START, GIROS, REGIONS, CEDIS, CORP, CAMPAIGNS, PROPERTIES, STOCKS, PHASES, FIRST_NAMES, LAST_NAMES
} from './data.js'

export const SAVE_VERSION = 1
export const LOAN_RATE = 0.16
export const FRANQ_FEE = 150000
export const ROYALTY = 0.06
export const RIVAL_COST = 4000000
export const IPO_MIN = 30000000

// ---------- utilidades ----------
export function mulberry32 (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const pick = (rng, a) => a[Math.floor(rng() * a.length)]
function gauss (rng) {
  let u = 0; let v = 0
  while (!u) u = rng()
  while (!v) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
export const regionOf = id => REGIONS.find(r => r.id === id)
export const locOf = (r, l) => regionOf(r).locs.find(x => x.id === l)
export const giroOf = id => GIROS[id]
export const formatOf = s => GIROS[s.giro].formats[s.tier - 1]
export const productOf = (giro, id) => GIROS[giro].products.find(p => p.id === id)
export const storeById = (st, id) => st.stores.find(s => s.id === id)
export const dateOf = day => new Date(Date.UTC(START.year, START.month, START.day + day))
export function monthKey (day) {
  const d = dateOf(day)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const round5 = v => Math.max(5, Math.round(v / 5) * 5)
export const defaultPrice = (p, loc) => round5(p.ref * loc.wealth)
const ok = (msg = '', data) => ({ ok: true, msg, data })
const fail = msg => ({ ok: false, msg })

// ---------- partida ----------
export function newGame (seed = Date.now(), company = 'Tienda MX Inc.') {
  const rng = mulberry32(seed)
  const st = {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    company,
    day: 0,
    cash: START.cash,
    loan: 0,
    brand: 10,
    costMult: 1,
    unlocked: ['vdm'],
    aware: Object.fromEntries(REGIONS.map(r => [r.id, 6])),
    compMult: Object.fromEntries(REGIONS.map(r => [r.id, 1])),
    rivals: {},
    cedis: {},
    corp: { marcaPropia: false, fintech: false, lealtad: false },
    ipo: null,
    stores: [],
    nextId: 1,
    candidates: [],
    campaigns: [],
    props: [],
    market: Object.fromEntries(STOCKS.map(s => [s.id, { price: s.price, hist: [s.price] }])),
    holdings: {},
    effects: [],
    ledger: {},
    hist: [],
    log: [],
    phase: 0,
    debtDays: 0,
    over: false,
    stats: { customers: 0, bestDay: 0 }
  }
  refreshCandidates(st, rng)
  log(st, `¡Bienvenido a ${company}! Abre tu tienda piloto en el Valle de México.`, 'info')
  return st
}
export function log (st, text, kind = 'info') {
  st.log.unshift({ day: st.day, text, kind })
  if (st.log.length > 60) st.log.length = 60
}
function ledger (st) {
  const k = monthKey(st.day)
  if (!st.ledger[k]) {
    st.ledger[k] = { ventas: 0, mercancia: 0, sueldos: 0, renta: 0, mantenimiento: 0, logistica: 0, marketing: 0, intereses: 0, regalias: 0, fintech: 0, rentas: 0, otros: 0, inversiones: 0 }
    const keys = Object.keys(st.ledger).sort()
    while (keys.length > 24) delete st.ledger[keys.shift()]
  }
  return st.ledger[k]
}
function spend (st, amount, cat) { st.cash -= amount; ledger(st)[cat] += amount }
function invest (st, amount) { st.cash -= amount; ledger(st).inversiones += amount }
function earn (st, amount, cat) { st.cash += amount; ledger(st)[cat] += amount }

// ---------- personal ----------
function makeCandidate (rng) {
  const r = rng()
  const skill = r < 0.35 ? 1 : r < 0.65 ? 2 : r < 0.87 ? 3 : r < 0.97 ? 4 : 5
  return { name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`, skill, salary: Math.round((8000 + skill * 2600 + rng() * 1500) / 100) * 100 }
}
export function refreshCandidates (st, rng) { st.candidates = Array.from({ length: 4 }, () => makeCandidate(rng)) }
export function hire (st, storeId, idx) {
  const s = storeById(st, storeId); const c = st.candidates[idx]
  if (!s || !c || s.franq) return fail('No disponible')
  if (s.staff.length >= formatOf(s).maxStaff) return fail('Plantilla llena para este formato')
  s.staff.push({ ...c }); st.candidates.splice(idx, 1)
  return ok(`${c.name} se une al equipo`)
}
export function fire (st, storeId, idx) {
  const s = storeById(st, storeId); const b = s?.staff[idx]
  if (!b) return fail('No existe')
  spend(st, Math.round(b.salary * 0.5), 'otros')
  s.staff.splice(idx, 1)
  return ok(`${b.name} dejó la sucursal (finiquito pagado)`)
}
export const trainCost = b => 12000 * b.skill
export function train (st, storeId, idx) {
  const s = storeById(st, storeId); const b = s?.staff[idx]
  if (!b || b.skill >= 5) return fail('Ya es experto')
  if (st.cash < trainCost(b)) return fail('No alcanza el efectivo')
  spend(st, trainCost(b), 'otros')
  b.skill++; b.salary += 2200
  return ok(`${b.name} subió a ${b.skill}★`)
}

// ---------- regiones y sucursales ----------
export function unlockRegion (st, id) {
  const r = regionOf(id)
  if (!r || st.unlocked.includes(id)) return fail('Ya disponible')
  if (st.cash < r.unlock) return fail('No alcanza el efectivo')
  invest(st, r.unlock)
  st.unlocked.push(id)
  log(st, `Expansión: ${r.name} desbloqueada`, 'good')
  return ok(`${r.name} desbloqueada`)
}
export const canFranchise = st => st.phase >= 3
export function openCost (regionId, locId, giro, tier, franq) {
  if (franq) return 0
  return GIROS[giro].formats[tier - 1].cost + locOf(regionId, locId).rent
}
export function openStore (st, regionId, locId, giro, tier = 1, franq = false) {
  if (!st.unlocked.includes(regionId)) return fail('Región bloqueada')
  const loc = locOf(regionId, locId); const g = GIROS[giro]
  if (!loc || !g) return fail('No válido')
  if (st.stores.some(s => s.region === regionId && s.loc === locId && s.giro === giro)) return fail(`Ya tienes una ${g.name.toLowerCase()} aquí`)
  if (franq && !canFranchise(st)) return fail('Las franquicias se desbloquean en la fase 4')
  const cost = openCost(regionId, locId, giro, tier, franq)
  if (st.cash < cost) return fail('No alcanza el efectivo')
  invest(st, cost)
  const fmt = g.formats[tier - 1]
  const s = {
    id: st.nextId++, region: regionId, loc: locId, giro, tier, franq,
    staff: franq ? Array.from({ length: fmt.maxStaff }, () => ({ name: 'Franquiciatario', skill: 3, salary: 0 })) : [],
    menu: g.products.filter(p => p.tier <= tier).map(p => p.id),
    prices: Object.fromEntries(g.products.map(p => [p.id, defaultPrice(p, loc)])),
    sat: 55, owned: false, opened: st.day, hist: [], today: null
  }
  st.stores.push(s)
  if (franq) earn(st, FRANQ_FEE, 'regalias')
  log(st, `${franq ? 'Franquicia' : 'Abriste'} ${fmt.name} en ${loc.name}${franq ? ` (+$${FRANQ_FEE.toLocaleString('es-MX')} de cuota)` : ''}`, 'good')
  return ok(franq ? 'Franquicia abierta: cobras regalías' : `Sucursal abierta — contrata ${g.staffPl.toLowerCase()}`, s)
}
export const upgradeCost = s => s.tier >= 4 ? Infinity : Math.round(GIROS[s.giro].formats[s.tier].cost * 0.85)
export function upgradeStore (st, id) {
  const s = storeById(st, id)
  if (!s || s.tier >= 4 || s.franq) return fail('No se puede remodelar')
  if (st.cash < upgradeCost(s)) return fail('No alcanza el efectivo')
  invest(st, upgradeCost(s))
  s.tier++
  for (const p of GIROS[s.giro].products) if (p.tier === s.tier && !s.menu.includes(p.id)) s.menu.push(p.id)
  log(st, `Remodelación: ${locOf(s.region, s.loc).name} ahora es ${formatOf(s).name}`, 'good')
  return ok('Remodelación completa')
}
export const buildingPrice = s => locOf(s.region, s.loc).rent * 110
export function buyBuilding (st, id) {
  const s = storeById(st, id)
  if (!s || s.owned || s.franq) return fail('No disponible')
  if (st.cash < buildingPrice(s)) return fail('No alcanza el efectivo')
  invest(st, buildingPrice(s))
  s.owned = true; s.ownedValue = buildingPrice(s)
  return ok('Inmueble comprado: adiós renta')
}
export function closeStore (st, id) {
  const i = st.stores.findIndex(s => s.id === id)
  if (i < 0) return fail('No existe')
  const s = st.stores[i]
  if (!s.franq) st.cash += Math.round(formatOf(s).cost * 0.3 + (s.owned ? s.ownedValue * 0.95 : 0)) - s.staff.reduce((a, b) => a + b.salary, 0)
  st.stores.splice(i, 1)
  log(st, `Cerraste la sucursal de ${locOf(s.region, s.loc).name}`, 'bad')
  return ok('Sucursal cerrada')
}
export function setPrice (st, id, pid, price) {
  const s = storeById(st, id)
  if (!s || s.franq) return fail('No existe')
  s.prices[pid] = clamp(Math.round(price), 1, 600)
  return ok()
}
export function toggleMenu (st, id, pid) {
  const s = storeById(st, id); const p = s && productOf(s.giro, pid)
  if (!p || p.tier > s.tier || s.franq) return fail('Requiere mejor formato')
  if (p.needs && !st.corp[p.needs]) return fail('Primero lanza tu Marca Propia en Corporativo')
  const i = s.menu.indexOf(pid)
  if (i >= 0) s.menu.splice(i, 1); else s.menu.push(pid)
  return ok()
}

// ---------- CEDIS y logística ----------
export const canBuildCedis = st => st.phase >= 1
export const cedisCapacity = (st, r) => st.cedis[r] ? CEDIS.capacity + (st.cedis[r].level - 1) * CEDIS.expandCap : 0
export function ownStoresIn (st, r) { return st.stores.filter(s => s.region === r && !s.franq).sort((a, b) => a.id - b.id) }
export function isCovered (st, s) {
  if (s.franq) return false
  const cap = cedisCapacity(st, s.region)
  if (!cap) return false
  return ownStoresIn(st, s.region).findIndex(x => x.id === s.id) < cap
}
export function cedisUse (st, r) {
  const cap = cedisCapacity(st, r)
  return cap ? Math.min(1, ownStoresIn(st, r).length / cap) : 0
}
export function buildCedis (st, r) {
  if (!canBuildCedis(st)) return fail('Primero llega a la fase 2: Clúster Urbano')
  if (!st.unlocked.includes(r)) return fail('Región bloqueada')
  if (st.cedis[r]) return fail('Ya tienes CEDIS aquí')
  if (st.cash < CEDIS.cost) return fail('No alcanza el efectivo')
  invest(st, CEDIS.cost)
  st.cedis[r] = { level: 1 }
  log(st, `🚚 CEDIS ${regionOf(r).name} operando: −25 % en inventario para ${CEDIS.capacity} sucursales`, 'good')
  return ok('CEDIS construido')
}
export const expandCost = (st, r) => Math.round(CEDIS.expand * Math.pow(1.3, (st.cedis[r]?.level || 1) - 1))
export function expandCedis (st, r) {
  if (!st.cedis[r]) return fail('Primero construye el CEDIS')
  if (st.cash < expandCost(st, r)) return fail('No alcanza el efectivo')
  invest(st, expandCost(st, r))
  st.cedis[r].level++
  return ok(`Capacidad ampliada a ${cedisCapacity(st, r)} sucursales`)
}

// ---------- corporativo ----------
export function buyCorp (st, key) {
  const c = CORP[key]
  if (!c || st.corp[key]) return fail('Ya está activo')
  if (st.phase < 2) return fail('Se desbloquea en la fase 3: CEDIS Propio')
  if (c.needs && !st.corp[c.needs]) return fail(`Requiere ${CORP[c.needs].name}`)
  if (st.cash < c.cost) return fail('No alcanza el efectivo')
  invest(st, c.cost)
  st.corp[key] = true
  if (key === 'marcaPropia') for (const s of st.stores) if (s.giro === 'tienda' && !s.menu.includes('marcapropia')) s.menu.push('marcapropia')
  log(st, `🚀 Lanzaste ${c.name}`, 'good')
  return ok(`${c.name} activo`)
}
export function buyRival (st, r) {
  if (st.phase < 3) return fail('Las adquisiciones se desbloquean en la fase 4')
  if (st.rivals[r]) return fail('Ya compraste la cadena rival de esta región')
  if (st.cash < RIVAL_COST) return fail('No alcanza el efectivo')
  invest(st, RIVAL_COST)
  st.rivals[r] = true
  st.compMult[r] *= 0.5
  st.aware[r] = clamp(st.aware[r] + 20, 0, 100)
  log(st, `🤝 Adquiriste la cadena rival de ${regionOf(r).name}: la competencia baja a la mitad`, 'good')
  return ok('Adquisición cerrada')
}
export function ipo (st) {
  if (st.ipo) return fail('Ya cotizas en la BMV')
  if (st.phase < 3) return fail('La salida a bolsa se desbloquea en la fase 4')
  const nw = netWorth(st)
  if (nw < IPO_MIN) return fail(`Necesitas un patrimonio de $${(IPO_MIN / 1e6).toFixed(0)} M`)
  const valuation = nw * 2
  const raised = Math.round(valuation * 0.25)
  st.cash += raised
  st.ipo = { day: st.day, baseNw: nw + raised, price: 100, hist: [100], raised }
  log(st, `🔔 ¡Tocaste la campana! Salida a bolsa: TMX recauda $${Math.round(raised / 1e6)} M por el 25 %`, 'good')
  return ok('¡Ya cotizas en la BMV como TMX!')
}

// ---------- marketing ----------
export function runCampaign (st, r, campId) {
  const c = CAMPAIGNS.find(x => x.id === campId)
  if (!c || !st.unlocked.includes(r)) return fail('No disponible')
  if (st.cash < c.cost) return fail('No alcanza el efectivo')
  spend(st, c.cost, 'marketing')
  st.campaigns.push({ region: r, id: c.id, daysLeft: c.days, perDay: c.boost / c.days })
  if (c.brand) st.brand = clamp(st.brand + c.brand, 0, 100)
  return ok('Campaña lanzada')
}

// ---------- bienes raíces, bolsa, crédito ----------
export function buyProperty (st, id) {
  const p = PROPERTIES.find(x => x.id === id)
  if (!p || st.props.some(x => x.id === id)) return fail('No disponible')
  if (st.cash < p.price) return fail('No alcanza el efectivo')
  invest(st, p.price)
  st.props.push({ id, value: p.price })
  return ok(`Compraste ${p.name}`)
}
export function sellProperty (st, id) {
  const i = st.props.findIndex(x => x.id === id)
  if (i < 0) return fail('No es tuya')
  const v = Math.round(st.props[i].value * 0.97)
  st.cash += v; st.props.splice(i, 1)
  return ok(`Vendida en $${v.toLocaleString('es-MX')}`)
}
export function buyStock (st, id, n) {
  const m = st.market[id]
  if (!m || n <= 0) return fail('No válido')
  const cost = m.price * n * 1.0025
  if (st.cash < cost) return fail('No alcanza el efectivo')
  st.cash -= cost
  const h = st.holdings[id] || { shares: 0, cost: 0 }
  h.shares += n; h.cost += cost; st.holdings[id] = h
  return ok(`Compraste ${n} acciones de ${id}`)
}
export function sellStock (st, id, n) {
  const h = st.holdings[id]
  if (!h || n <= 0) return fail('No tienes acciones')
  n = Math.min(n, h.shares)
  st.cash += st.market[id].price * n * 0.9975
  h.cost -= h.cost * (n / h.shares); h.shares -= n
  if (h.shares <= 0) delete st.holdings[id]
  return ok(`Vendiste ${n} acciones de ${id}`)
}
export const ipc = st => Math.round(STOCKS.reduce((a, s) => a + st.market[s.id].price / s.price, 0) / STOCKS.length * 52000)
export const loanLimit = st => Math.max(0, Math.round((500000 + netWorth(st) * 0.35) / 10000) * 10000)
export function takeLoan (st, n) {
  if (n <= 0 || st.loan + n > loanLimit(st)) return fail('Excede tu línea de crédito')
  st.loan += n; st.cash += n
  return ok('Crédito depositado')
}
export function repayLoan (st, n) {
  n = Math.min(n, st.loan, Math.max(0, st.cash))
  if (n <= 0) return fail('Nada que pagar')
  st.loan -= n; st.cash -= n
  return ok('Pago aplicado')
}

// ---------- valuación y fases ----------
export function netWorth (st) {
  const stores = st.stores.reduce((a, s) => a + (s.franq ? s.hist.slice(-30).reduce((x, y) => x + y, 0) * ROYALTY * 12 : formatOf(s).cost * 0.5 + (s.owned ? s.ownedValue : 0)), 0)
  const props = st.props.reduce((a, p) => a + p.value, 0)
  const stocks = Object.entries(st.holdings).reduce((a, [id, h]) => a + h.shares * st.market[id].price, 0)
  const cedis = Object.values(st.cedis).reduce((a, c) => a + CEDIS.cost * 0.7 + (c.level - 1) * CEDIS.expand * 0.7, 0)
  const corp = Object.entries(st.corp).reduce((a, [k, v]) => a + (v ? CORP[k].cost * 0.8 : 0), 0)
  return Math.round(st.cash + stores + props + stocks + cedis + corp - st.loan)
}
export function phaseReady (st, i) {
  const own = st.stores.filter(s => !s.franq)
  if (i === 0) return st.stores.length > 0
  if (i === 1) return REGIONS.some(r => own.filter(s => s.region === r.id).length >= 8)
  if (i === 2) return Object.keys(st.cedis).length > 0
  if (i === 3) return st.corp.marcaPropia && st.corp.fintech
  if (i === 4) return !!st.ipo && REGIONS.every(r => st.stores.some(s => s.region === r.id))
  return false
}
export function phaseProgress (st) {
  const i = st.phase + 1
  if (i >= PHASES.length) return 1
  const own = st.stores.filter(s => !s.franq)
  if (i === 1) return Math.min(1, Math.max(...REGIONS.map(r => own.filter(s => s.region === r.id).length)) / 8)
  if (i === 2) return st.cash / CEDIS.cost > 1 ? 0.9 : clamp(st.cash / CEDIS.cost, 0, 0.9)
  if (i === 3) return (st.corp.marcaPropia ? 0.5 : 0) + (st.corp.fintech ? 0.5 : 0)
  if (i === 4) return (st.ipo ? 0.5 : 0) + 0.5 * REGIONS.filter(r => st.stores.some(s => s.region === r.id)).length / REGIONS.length
  return 0
}

// ---------- temporadas ----------
export function seasonInfo (day, region) {
  const d = dateOf(day); const m = d.getUTCMonth(); const dd = d.getUTCDate(); const dow = d.getUTCDay()
  let mult = 1; const tags = []
  if (dow === 0 || dow === 6) mult *= 1.1
  const last = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate()
  if ([1, 15, 16, last].includes(dd)) { mult *= 1.15; tags.push('Quincena') }
  const muertos = (m === 9 && dd >= 18) || (m === 10 && dd <= 3)
  if (muertos) { mult *= 1.08; tags.push('Día de Muertos') }
  if (m === 10 && dd >= 13 && dd <= 17) { mult *= 1.25; tags.push('Buen Fin') }
  if (m === 11 && dd >= 12) { mult *= 1.15; tags.push('Posadas') }
  if (m === 8 && dd >= 14 && dd <= 16) { mult *= 1.2; tags.push('Fiestas Patrias') }
  const heat = region?.hot && m >= 3 && m <= 8
  return { mult, tags, muertos, heat }
}

// ---------- simulación de una sucursal ----------
export function priceFactor (price, ref, elastic = 1) {
  const r = price / ref
  return r <= 1 ? 1 + (1 - r) * 0.9 * (elastic < 1 ? 1.5 : 1) : Math.exp(-(r - 1) * 2.8 * elastic)
}
export function unitCost (st, s, p) {
  let c = p.cost * st.costMult
  if (isCovered(st, s)) c *= 1 - CEDIS.saving
  if (st.corp.marcaPropia && s.giro !== 'tienda') c *= 0.95
  return c
}
export function simulateStore (st, s, mods = {}) {
  const g = GIROS[s.giro]; const fmt = formatOf(s); const region = regionOf(s.region); const loc = locOf(s.region, s.loc)
  const season = mods.season || seasonInfo(st.day, region)
  const avail = s.menu.map(id => productOf(s.giro, id)).filter(p => p && p.tier <= s.tier && (!p.season || season.muertos) && (!p.needs || st.corp[p.needs]))
  if (!s.staff.length || !avail.length) return { closed: true, customers: 0, served: 0, lost: 0, rev: 0, cogs: 0, sales: {}, value: 0, quality: 0 }
  const skill = s.staff.reduce((a, b) => a + b.skill, 0) / s.staff.length
  const quality = (0.7 + skill * 0.1) * fmt.ambience
  const comp = 1 - loc.comp * 0.35 * st.compMult[s.region]
  const potential = g.base * loc.traffic * (fmt.traffic || 1) * region.pop * comp * (0.35 + st.aware[s.region] / 100 * 0.9) *
    season.mult * (mods.evMult ?? 1) * (0.85 + st.brand / 100 * 0.3) * (st.corp.lealtad ? 1.06 : 1) * (mods.stockout ? 0.65 : 1)
  const elastic = fmt.elastic || 1
  const attrs = avail.map(p => {
    const ref = p.ref * loc.wealth
    let a = p.appeal * priceFactor(s.prices[p.id], ref, elastic)
    if (p.heat && (season.heat || mods.heatwave)) a *= 1.7
    if (mods.boost?.[p.id]) a *= mods.boost[p.id]
    return { p, a, ratio: s.prices[p.id] / ref }
  })
  const score = attrs.reduce((a, x) => a + x.a, 0)
  const customers = potential * (1 - Math.exp(-score * 0.9)) * quality * (0.75 + s.sat / 200)
  const capacity = s.staff.reduce((a, b) => a + g.serve[0] + g.serve[1] * b.skill, 0) * (s.tier >= 3 ? 1.15 : 1)
  const served = Math.min(customers, capacity)
  const value = attrs.reduce((a, x) => a + clamp(1 - x.ratio, -1, 1) * x.a, 0) / score
  const sales = {}; let rev = 0; let cogs = 0
  for (const x of attrs) {
    const n = served * x.a / score * g.basket
    sales[x.p.id] = n
    rev += n * s.prices[x.p.id]
    cogs += n * unitCost(st, s, x.p)
  }
  return { closed: false, customers, capacity, served, lost: Math.max(0, customers - served), rev, cogs, sales, value, quality }
}
export function storeDailyCosts (st, s) {
  if (s.franq) return { rent: 0, wages: 0, upkeep: 0 }
  return { rent: s.owned ? 0 : locOf(s.region, s.loc).rent / 30, wages: s.staff.reduce((a, b) => a + b.salary, 0) / 30, upkeep: formatOf(s).upkeep }
}

// ---------- eventos ----------
function randomEvent (st, rng) {
  const r = rng(); const reg = pick(rng, st.unlocked)
  if (r < 0.12) { st.effects.push({ type: 'heat', daysLeft: 10 }); log(st, '🌡️ Ola de calor: vuelan las bebidas frías, aguas y cold brew', 'info') } else if (r < 0.24) { st.effects.push({ type: 'demand', region: reg, mult: 0.85, daysLeft: 7 }); log(st, `🌧️ Lluvias fuertes en ${regionOf(reg).name}: menos gente en la calle`, 'bad') } else if (r < 0.36 && st.stores.length) { const s = pick(rng, st.stores); st.aware[s.region] = clamp(st.aware[s.region] + 12, 0, 100); log(st, `📱 Reseña viral de tu sucursal en ${locOf(s.region, s.loc).name}`, 'good') } else if (r < 0.46) { st.aware[reg] = clamp(st.aware[reg] - 8, 0, 100); log(st, `🏪 Una cadena rival abrió 5 tiendas en ${regionOf(reg).name}`, 'bad') } else if (r < 0.54) { st.costMult *= 1.03; log(st, '📈 Inflación: los proveedores suben 3 %', 'bad') } else if (r < 0.62) { for (const s of STOCKS) st.market[s.id].price *= 1.06; log(st, 'BMV: rally, el IPC sube 6 %', 'good') } else if (r < 0.68) { for (const s of STOCKS) st.market[s.id].price *= 0.92; log(st, 'BMV: caída, el IPC pierde 8 %', 'bad') } else if (r < 0.76 && st.stores.length) { spend(st, 18000, 'otros'); log(st, '📋 Inspección de Protección Civil: multa de $18,000', 'bad') } else if (r < 0.84 && st.stores.some(s => s.giro === 'tienda' && s.tier === 2 && !s.franq)) { spend(st, 25000, 'otros'); log(st, '🚨 Robo nocturno en una tienda 24/7: perdiste $25,000', 'bad') } else if (r < 0.92) { st.effects.push({ type: 'futbol', daysLeft: 3 }); log(st, '⚽ Juega la selección: taquerías y tiendas llenas 3 días', 'good') } else { st.effects.push({ type: 'demand', region: reg, mult: 1.25, daysLeft: 5 }); log(st, `🎉 Feria regional en ${regionOf(reg).name}: +25 % de clientes`, 'good') }
}
function announce (st) {
  const d = dateOf(st.day); const m = d.getUTCMonth(); const dd = d.getUTCDate()
  if (m === 9 && dd === 18) log(st, 'Temporada de Día de Muertos: las cafeterías ya venden Pan de Muerto', 'info')
  if (m === 10 && dd === 13) log(st, '¡Empieza el Buen Fin! +25 % de clientes', 'info')
  if (m === 8 && dd === 14) log(st, '¡Viva México! Fiestas Patrias: +20 %', 'info')
}

// ---------- paso diario ----------
export function step (st, rng) {
  if (st.over) return
  st.day++
  const L = ledger(st)
  announce(st)
  if (rng() < 1 / 10) randomEvent(st, rng)
  const heatwave = st.effects.some(e => e.type === 'heat')
  const futbol = st.effects.some(e => e.type === 'futbol')
  let dayRev = 0; let dayProfit = 0; let customers = 0
  for (const s of st.stores) {
    const region = regionOf(s.region)
    let evMult = st.effects.filter(e => e.type === 'demand' && e.region === s.region).reduce((a, e) => a * e.mult, 1)
    if (futbol && s.giro !== 'cafe') evMult *= 1.2
    const stockout = !s.franq && !isCovered(st, s) && s.giro === 'tienda' ? rng() < 0.06 : false
    const r = simulateStore(st, s, { evMult, heatwave, stockout })
    const c = storeDailyCosts(st, s)
    let profit
    if (s.franq) {
      const roy = r.rev * ROYALTY
      earn(st, roy, 'regalias')
      profit = roy
    } else {
      earn(st, r.rev, 'ventas')
      spend(st, r.cogs, 'mercancia'); spend(st, c.rent, 'renta'); spend(st, c.wages, 'sueldos'); spend(st, c.upkeep, 'mantenimiento')
      profit = r.rev - r.cogs - c.rent - c.wages - c.upkeep
      dayRev += r.rev
    }
    if (st.corp.fintech) { const f = r.served * 0.05 * 12; earn(st, f, 'fintech'); profit += f }
    dayProfit += profit
    customers += r.served
    s.today = { ...r, profit, stockout, covered: isCovered(st, s) }
    s.hist.push(Math.round(r.rev)); if (s.hist.length > 60) s.hist.shift()
    if (!s.franq) {
      let target = r.closed ? 20 : 55 + (r.quality - 0.85) * 70 + r.value * 30 - (r.customers ? r.lost / r.customers : 0) * 50 + (st.phase >= 1 ? 4 : 0)
      if (stockout) target -= 20
      s.sat = clamp(s.sat + (clamp(target, 0, 100) - s.sat) * 0.08, 0, 100)
    } else s.sat = 60
    st.aware[s.region] = clamp(st.aware[s.region] + r.served / 200 * (s.sat - 35) / 50 / region.pop, 0, 100)
  }
  // CEDIS: costo de operación
  for (const r of Object.keys(st.cedis)) spend(st, CEDIS.upkeep * st.cedis[r].level / 30, 'logistica')
  dayProfit -= Object.values(st.cedis).reduce((a, c) => a + CEDIS.upkeep * c.level / 30, 0)

  for (const c of st.campaigns) { st.aware[c.region] = clamp(st.aware[c.region] + c.perDay, 0, 100); c.daysLeft-- }
  st.campaigns = st.campaigns.filter(c => c.daysLeft > 0)
  for (const e of st.effects) e.daysLeft--
  st.effects = st.effects.filter(e => e.daysLeft > 0)
  for (const r of REGIONS) st.aware[r.id] = Math.max(0, st.aware[r.id] - (st.aware[r.id] - 4) * 0.004)
  const own = st.stores.filter(s => !s.franq)
  const avgSat = own.length ? own.reduce((a, s) => a + s.sat, 0) / own.length : st.brand
  st.brand = clamp(st.brand + (clamp(avgSat * 0.7 + st.stores.length * 0.8, 0, 100) - st.brand) * 0.01, 0, 100)

  for (const p of st.props) {
    const def = PROPERTIES.find(x => x.id === p.id)
    earn(st, def.rent / 30, 'rentas'); dayProfit += def.rent / 30
    p.value *= 1 + 0.00013 + gauss(rng) * 0.0015
  }
  for (const s of st.stores) if (s.owned) s.ownedValue *= 1.00013
  const shock = gauss(rng) * 0.004
  for (const def of STOCKS) {
    const m = st.market[def.id]
    m.price = Math.max(1, m.price * Math.exp(def.drift + def.vol * gauss(rng) + shock))
    m.hist.push(+m.price.toFixed(2)); if (m.hist.length > 90) m.hist.shift()
  }
  if (st.loan > 0) { const i = st.loan * LOAN_RATE / 365; spend(st, i, 'intereses'); dayProfit -= i }
  if (st.day % 7 === 0) refreshCandidates(st, rng)

  st.hist.push({ rev: Math.round(dayRev), profit: Math.round(dayProfit) })
  if (st.hist.length > 120) st.hist.shift()
  st.stats.customers += customers
  st.stats.bestDay = Math.max(st.stats.bestDay, dayRev)
  if (st.ipo) {
    const nw = netWorth(st)
    st.ipo.price = Math.max(1, 100 * nw / st.ipo.baseNw * Math.exp(gauss(rng) * 0.01))
    st.ipo.hist.push(+st.ipo.price.toFixed(2)); if (st.ipo.hist.length > 90) st.ipo.hist.shift()
  }
  while (st.phase < PHASES.length - 1 && phaseReady(st, st.phase + 1)) {
    st.phase++
    log(st, `🏆 Fase ${PHASES[st.phase].n}: ${PHASES[st.phase].name} desbloqueada`, 'good')
  }
  if (st.cash < 0) {
    st.debtDays++
    if (st.debtDays === 1) log(st, 'Lic. Daniela: ¡números rojos! Tienes 45 días para corregir', 'bad')
    if (st.debtDays >= 45) { st.over = true; log(st, 'Quiebra: el banco tomó el control de la empresa', 'bad') }
  } else st.debtDays = 0
}

// el jugador atiende en persona el comal de una taquería: cobra el taco al momento
export function comalSale (st, storeId, amount) {
  const s = storeById(st, storeId)
  if (!s || s.giro !== 'taqueria') return fail('Solo en taquerías')
  earn(st, amount, 'ventas')
  return ok()
}

export function serialize (st) { return JSON.stringify(st) }
export function deserialize (t) {
  const s = JSON.parse(t)
  if (!s || s.v !== SAVE_VERSION || !Array.isArray(s.stores) || !s.cedis) throw new Error('Partida incompatible')
  return s
}
