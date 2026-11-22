import { describe, it, expect } from 'vitest'
import * as E from '../src/engine'

const fresh = () => E.newGame(42)
function withStore (colony = 'roma', cashiers = 2) {
  const s = fresh()
  const r = E.openStore(s, 'cdmx', colony, 'tiendita')
  expect(r.ok).toBe(true)
  for (let i = 0; i < cashiers; i++) E.hireCashier(s, r.data!.id, 0)
  return { s, st: r.data! }
}

describe('motor Tienda MX', () => {
  it('arranca con $500,000 a las 06:30', () => {
    const s = fresh()
    expect(s.cash).toBe(500000)
    expect(E.clockLabel(s.minute)).toBe('06:30')
  })
  it('abrir cobra CAPEX + depósito + inventario y no permite formatos bloqueados', () => {
    const s = fresh()
    const cost = E.openingCost('cdmx', 'coyoacan', 'tiendita')
    expect(E.openStore(s, 'cdmx', 'coyoacan', 'tiendita').ok).toBe(true)
    expect(s.cash).toBe(500000 - cost)
    expect(E.openStore(s, 'cdmx', 'coyoacan', 'tiendita').ok).toBe(false)
    expect(E.openStore(s, 'cdmx', 'roma', 'conveniencia').ok).toBe(false)
  })
  it('sin cajeros no llega nadie; con cajeros hay ventas, eventos y corte diario', () => {
    const s = fresh()
    E.openStore(s, 'cdmx', 'roma', 'tiendita')
    E.advance(s, 600)
    expect(s.stores[0].today.tickets).toBe(0)
    const { s: s2 } = withStore()
    const ev = E.advance(s2, 1440)
    expect(ev.some(e => e.type === 'sale')).toBe(true)
    const day = ev.find(e => e.type === 'dayEnd')
    expect(day).toBeTruthy()
    expect(s2.reports.length).toBe(1)
    expect(s2.reports[0].tickets).toBeGreaterThan(80)
  })
  it('la tienda cierra en la noche (tiendita 7–22 h)', () => {
    const { s, st } = withStore()
    E.advance(s, 16 * 60) // de 06:30 a 22:30
    const before = st.today.arrivals
    E.advance(s, 75) // hasta 23:45, mismo día
    expect(st.today.arrivals - before).toBe(0)
  })
  it('un precio más alto baja la probabilidad de compra', () => {
    const { st } = withStore()
    const base = E.priceFactor(st, 'abarrotes')
    st.margins.abarrotes = 0.45
    expect(E.priceFactor(st, 'abarrotes')).toBeLessThan(base * 0.5)
    expect(E.priceIndex(st, 'abarrotes')).toBeGreaterThan(1.4)
  })
  it('un solo cajero de 1 ★ genera fila y abandonos; más cajeros los reducen', () => {
    const run = (n: number, stars: number) => {
      const { s, st } = withStore('iztapalapa', 0)
      for (let i = 0; i < n; i++) st.cashiers.push({ id: 100 + i, name: 'x', stars, salary: 10000 })
      E.advance(s, 1440 * 2)
      return s.reports.reduce((a, r) => a + r.abandoned, 0)
    }
    expect(run(1, 1)).toBeGreaterThan(run(3, 4))
  })
  it('el inventario se vacía con las ventas y el mayorista resurte', () => {
    const { s, st } = withStore()
    st.autoReorder = false
    E.advance(s, 1440)
    expect(st.inventory.abarrotes).toBeLessThan(E.shelfCapacity(st))
    expect(E.placeOrder(s, st.id).ok).toBe(true)
    const ev = E.advance(s, 400)
    expect(ev.some(e => e.type === 'delivery')).toBe(true)
  })
  it('sin inventario se pierden ventas', () => {
    const { s, st } = withStore()
    st.autoReorder = false
    for (const k of Object.keys(st.inventory)) (st.inventory as Record<string, number>)[k] = 0
    const ev = E.advance(s, 600)
    expect(ev.some(e => e.type === 'stockout')).toBe(true)
  })
  it('las cámaras reducen la merma', () => {
    const run = (sec: number) => { const { s, st } = withStore(); st.security = sec; E.advance(s, 1440 * 3); return s.reports.reduce((a, r) => a + r.shrink, 0) / s.reports.reduce((a, r) => a + r.sales, 1) }
    expect(run(2)).toBeLessThan(run(0) * 0.4)
  })
  it('el pronóstico de apertura es positivo en Roma y muestra retorno', () => {
    const e = E.estimateStore('cdmx', 'roma', 'tiendita')
    expect(e.customersDay).toBeGreaterThan(150)
    expect(e.profitMonth).toBeGreaterThan(0)
    expect(e.paybackMonths).not.toBeNull()
  })
  it('es determinista con la misma semilla y se guarda/carga', () => {
    const a = withStore(); const b = withStore()
    E.advance(a.s, 3000); E.advance(b.s, 3000)
    expect(a.s.cash).toBe(b.s.cash)
    const back = E.deserialize(E.serialize(a.s))
    expect(back.minute).toBe(a.s.minute)
    expect(() => E.deserialize('{"version":1}')).toThrow()
  })
  it('un mes completo no produce NaN y la tienda piloto gana dinero con buenos cajeros', () => {
    const { s, st } = withStore('roma', 0)
    st.cashiers.push({ id: 90, name: 'a', stars: 3, salary: 13000 }, { id: 91, name: 'b', stars: 3, salary: 13000 })
    E.advance(s, 1440 * 30)
    const profit = s.reports.reduce((a, r) => a + r.profit, 0)
    expect(Number.isFinite(s.cash)).toBe(true)
    expect(profit).toBeGreaterThan(0)
  })
})

describe('Hito 2: formatos, CEDIS y Marca Propia', () => {
  it('se pueden abrir los cuatro formatos y conviven en la misma colonia con canibalización', () => {
    const s = E.newGame(5); s.cash = 1e8
    for (const f of ['tiendita', 'conveniencia', 'hardDiscount', 'bodega'] as const) expect(E.openStore(s, 'cdmx', 'roma', f).ok).toBe(true)
    expect(E.openStore(s, 'cdmx', 'roma', 'darkStore').ok).toBe(false)
    expect(E.cannibalization(s, s.stores[0])).toBeCloseTo(1 / 1.54)
  })
  it('la 24/7 nunca cierra y el hard discount tiene precios más bajos', () => {
    const s = E.newGame(5); s.cash = 1e8
    const c = E.openStore(s, 'cdmx', 'roma', 'conveniencia').data!
    const h = E.openStore(s, 'cdmx', 'polanco', 'hardDiscount').data!
    expect(E.isOpen(c, 3)).toBe(true)
    expect(E.priceIndex(h, 'abarrotes')).toBeLessThan(1)
    expect(E.priceIndex(c, 'abarrotes')).toBeGreaterThan(1)
  })
  it('con 4 tiendas se compra 8 % más barato', () => {
    const s = E.newGame(5); s.cash = 1e8
    const base = E.purchaseCost(s, 'abarrotes')
    for (const col of ['roma', 'polanco', 'coyoacan', 'iztapalapa']) E.openStore(s, 'cdmx', col, 'tiendita')
    expect(E.purchaseCost(s, 'abarrotes')).toBeCloseTo(base * 0.92)
    expect(E.phaseInfo(s).phase).toBe(2)
  })
  it('el CEDIS exige 10 tiendas o $12 M, abarata 22 % y cobra su operación', () => {
    const s = E.newGame(5); s.cash = 7e6
    E.openStore(s, 'cdmx', 'roma', 'tiendita')
    expect(E.buildCedis(s).ok).toBe(false)
    s.cash = 2e7
    expect(E.buildCedis(s).ok).toBe(true)
    expect(E.purchaseFactor(s, 'abarrotes')).toBeCloseTo(0.78)
    E.hireCashier(s, s.stores[0].id, 0)
    E.advance(s, 1440)
    expect(s.reports[0].logistics).toBeGreaterThan(0)
  })
  it('sin camiones libres el pedido del CEDIS se retrasa al día siguiente', () => {
    const s = E.newGame(5); s.cash = 1e8
    const st = E.openStore(s, 'cdmx', 'roma', 'tiendita').data!
    E.buildCedis(s)
    s.tripsToday = E.tripCapacity(s)
    for (const k of Object.keys(st.inventory)) (st.inventory as Record<string, number>)[k] = 10
    const r = E.placeOrder(s, st.id)
    expect(r.ok).toBe(true)
    expect(st.orders[0].delayed).toBe(true)
    expect(E.buyTruck(s).ok).toBe(true)
  })
  it('la Marca Propia necesita CEDIS y abarata su categoría 15 %', () => {
    const s = E.newGame(5); s.cash = 1e8
    E.openStore(s, 'cdmx', 'roma', 'tiendita')
    expect(E.launchLabel(s, 'agua').ok).toBe(false)
    E.buildCedis(s)
    const before = E.purchaseCost(s, 'bebidas')
    expect(E.launchLabel(s, 'agua').ok).toBe(true)
    expect(E.purchaseCost(s, 'bebidas')).toBeCloseTo(before * 0.85)
    expect(E.phaseInfo(s).phase).toBe(4)
  })
  it('las partidas del Hito 1 se actualizan', () => {
    const s = E.newGame(5) as unknown as Record<string, unknown>
    s.version = 3; delete s.cedis; delete s.labels
    const g = E.deserialize(JSON.stringify(s))
    expect(g.cedis).toBeNull(); expect(g.labels).toEqual([])
  })
})

describe('IA de mercado, analista y fondo', () => {
  it('cada semilla genera un mercado distinto y la misma semilla el mismo', () => {
    const a = E.newGame(1); const b = E.newGame(2); const c = E.newGame(1)
    expect(a.market.colonies.roma.traffic).not.toBe(b.market.colonies.roma.traffic)
    expect(a.market.rivals.map(r => r.name)).toEqual(c.market.rivals.map(r => r.name))
    expect(a.market.rivals.map(r => r.style).sort()).toEqual(['barrio', 'expansion', 'precio', 'premium'])
  })
  it('los rivales actúan cada semana y la competencia cambia', () => {
    const s = E.newGame(9); s.cash = 1e8
    const st = E.openStore(s, 'cdmx', 'roma', 'tiendita').data!
    st.cashiers.push({ id: 900, name: 'x', stars: 3, salary: 13000 })
    const before = s.market.rivals.reduce((a, r) => a + Object.values(r.stores).reduce((x, y) => x + y, 0), 0)
    for (let d = 0; d < 60; d++) E.advance(s, 1440)
    const after = s.market.rivals.reduce((a, r) => a + Object.values(r.stores).reduce((x, y) => x + y, 0), 0)
    const wars = s.log.some(l => l.text.includes('guerra de precios'))
    expect(after !== before || wars).toBe(true)
  })
  it('el analista recomienda dónde abrir y sugiere precios', () => {
    const s = E.newGame(3)
    const ins = E.analyzeMarket(s)
    expect(ins.some(i => i.kind === 'oportunidad')).toBe(true)
    s.cash = 1e7
    const st = E.openStore(s, 'cdmx', 'polanco', 'tiendita').data!
    st.margins.bebidas = 0.06
    const r = E.bestMargin(s, st, 'bebidas')
    expect(r.margin).toBeGreaterThan(0.06)
    expect(E.analyzeMarket(s).some(i => i.kind === 'precio' && i.storeId === st.id)).toBe(true)
  })
  it('el fondo cobra comisión, cambia de valor y suma al patrimonio', () => {
    const s = E.newGame(4)
    const nw = E.netWorth(s)
    expect(E.investFund(s, 'bonos', 100000).ok).toBe(true)
    expect(E.fundValue(s)).toBeCloseTo(99500, 0)
    expect(E.netWorth(s)).toBeCloseTo(nw - 500, -1)
    for (let d = 0; d < 30; d++) E.advance(s, 1440)
    expect(E.fundValue(s)).toBeGreaterThan(99500)
    expect(E.withdrawFund(s, 'bonos', Infinity).ok).toBe(true)
    expect(E.fundValue(s)).toBe(0)
  })
  it('partidas del Hito 2 reciben su mercado', () => {
    const s = E.newGame(5) as unknown as Record<string, unknown>
    s.version = 4; delete s.market
    const g = E.deserialize(JSON.stringify(s))
    expect(g.market.rivals.length).toBe(4)
  })
})

describe('Épocas, ciudades y muchas tiendas', () => {
  it('el año de fundación cambia la fecha, los precios y la tecnología', () => {
    const g = E.newGame(1, 'Changarro 95', 1995)
    expect(E.dateLabel(0).date).toBe('1 ene 1995')
    expect(E.priceLevel(g)).toBeCloseTo(0.12, 2)
    g.cash = 1e8
    expect(E.openStore(g, 'cdmx', 'roma', 'hardDiscount').ok).toBe(false)
    const st = E.openStore(g, 'cdmx', 'roma', 'tiendita').data!
    expect(E.buySelfCheckout(g, st.id).ok).toBe(false)
    expect(E.historicEvents(new Date(Date.UTC(1995, 5, 1))).length).toBe(1)
    const h = E.newGame(1, 'Hoy', 2027)
    expect(E.priceLevel(h)).toBeCloseTo(1, 2)
  })
  it('la pandemia de 2020 baja la clientela', () => {
    expect(E.historicMultiplier(new Date(Date.UTC(2020, 4, 1)), 'cdmx')).toBeCloseTo(0.55)
    expect(E.historicMultiplier(new Date(Date.UTC(2017, 8, 25)), 'gdl')).toBe(1)
  })
  it('se pueden tener muchas tiendas en una colonia hasta llenar sus locales', () => {
    const g = E.newGame(2); g.cash = 1e9
    let n = 0
    while (E.openStore(g, 'cdmx', 'centro', 'tiendita').ok) n++
    expect(n).toBe(8)
    expect(new Set(g.stores.map(s => s.label)).size).toBeGreaterThan(1)
  })
  it('otras ciudades se desbloquean desde Clúster Urbano y fuera del radio no aplica el CEDIS', () => {
    const g = E.newGame(3); g.cash = 1e9
    expect(E.unlockCity(g, 'mty').ok).toBe(false)
    for (const c of ['roma', 'polanco', 'coyoacan', 'iztapalapa']) E.openStore(g, 'cdmx', c, 'tiendita')
    expect(E.unlockCity(g, 'mty').ok).toBe(true)
    const m = E.openStore(g, 'mty', 'sanpedro', 'tiendita').data!
    E.buildCedis(g)
    const local = g.stores[0]
    expect(E.purchaseFactor(g, 'abarrotes', local)).toBeLessThan(E.purchaseFactor(g, 'abarrotes', m))
    expect(E.orderQuote(m, g).via).toBe('mayorista')
  })
  it('con varias ciudades abiertas los rivales crecen a decenas de tiendas', () => {
    const g = E.newGame(4); g.cash = 1e9; g.cities = ['cdmx', 'pue', 'gdl', 'mty']
    const count = () => g.market.rivals.reduce((a, r) => a + Object.values(r.stores).reduce((x, y) => x + y, 0), 0)
    const before = count()
    for (let d = 0; d < 120; d++) E.advance(g, 1440)
    expect(count()).toBeGreaterThan(before + 10)
  })
})
