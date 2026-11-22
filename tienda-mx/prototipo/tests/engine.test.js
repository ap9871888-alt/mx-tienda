import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as E from '../js/engine.js'

const g = () => ({ s: E.newGame(5), rng: E.mulberry32(3) })
const staffed = (s, region, loc, giro, tier = 1) => {
  const r = E.openStore(s, region, loc, giro, tier)
  assert.ok(r.ok, r.msg)
  E.hire(s, r.data.id, 0)
  if (!s.candidates.length) E.refreshCandidates(s, E.mulberry32(1))
  E.hire(s, r.data.id, 0)
  return r.data
}

test('partida nueva', () => {
  const { s } = g()
  assert.equal(s.cash, 350000); assert.deepEqual(s.unlocked, ['vdm']); assert.equal(s.phase, 0)
})
test('se pueden abrir los tres giros en la misma colonia, pero no dos del mismo', () => {
  const { s } = g(); s.cash = 2e6
  for (const giro of ['tienda', 'cafe', 'taqueria']) assert.ok(E.openStore(s, 'vdm', 'roma', giro, 1).ok)
  assert.equal(E.openStore(s, 'vdm', 'roma', 'cafe', 1).ok, false)
  assert.equal(E.openStore(s, 'gdl', 'chapu', 'tienda', 1).ok, false, 'región bloqueada')
})
test('cada giro vende y cobra', () => {
  const { s, rng } = g(); s.cash = 2e6
  for (const giro of ['tienda', 'cafe', 'taqueria']) staffed(s, 'vdm', 'roma', giro)
  E.step(s, rng)
  for (const st of s.stores) assert.ok(st.today.rev > 0, st.giro)
})
test('marca propia: bloqueada hasta lanzarla', () => {
  const { s } = g(); s.cash = 1e7
  const st = staffed(s, 'vdm', 'centro', 'tienda')
  assert.equal(E.toggleMenu(s, st.id, 'marcapropia').ok, false)
  assert.equal(E.buyCorp(s, 'marcaPropia').ok, false, 'requiere fase 3')
})
test('clúster urbano → CEDIS → −25 % de costo', () => {
  const { s, rng } = g(); s.cash = 5e7
  const locs = ['centro', 'iztapalapa', 'coyoacan', 'roma', 'satelite', 'polanco', 'puebla']
  for (const l of locs) staffed(s, 'vdm', l, 'tienda')
  staffed(s, 'vdm', 'centro', 'cafe')
  assert.equal(E.buildCedis(s, 'vdm').ok, false, 'aún no es fase 2')
  E.step(s, rng)
  assert.equal(s.phase, 1)
  const st = s.stores[0]; const p = E.productOf('tienda', 'abarrotes')
  const before = E.unitCost(s, st, p)
  assert.ok(E.buildCedis(s, 'vdm').ok)
  assert.ok(Math.abs(E.unitCost(s, st, p) - before * 0.75) < 1e-9)
  E.step(s, rng)
  assert.equal(s.phase, 2)
})
test('la capacidad del CEDIS limita la cobertura', () => {
  const { s } = g(); s.cash = 1e8; s.phase = 1
  for (const l of E.regionOf('vdm').locs) { E.openStore(s, 'vdm', l.id, 'tienda', 1); E.openStore(s, 'vdm', l.id, 'cafe', 1) }
  E.buildCedis(s, 'vdm')
  assert.equal(s.stores.filter(x => E.isCovered(s, x)).length, 10)
  E.expandCedis(s, 'vdm')
  assert.equal(s.stores.filter(x => E.isCovered(s, x)).length, 14)
})
test('fase 4 desbloquea franquicias, adquisiciones y BMV', () => {
  const { s, rng } = g(); s.cash = 1e8; s.phase = 2
  assert.ok(E.buyCorp(s, 'marcaPropia').ok); assert.ok(E.buyCorp(s, 'fintech').ok)
  E.step(s, rng)
  assert.equal(s.phase, 3)
  const f = E.openStore(s, 'vdm', 'roma', 'taqueria', 2, true)
  assert.ok(f.ok && f.data.franq)
  assert.ok(E.buyRival(s, 'vdm').ok)
  assert.equal(s.compMult.vdm, 0.5)
  const c = s.cash
  assert.ok(E.ipo(s).ok)
  assert.ok(s.cash > c)
})
test('franquicia paga regalías sin costos', () => {
  const { s, rng } = g(); s.cash = 1e6; s.phase = 3
  E.openStore(s, 'vdm', 'roma', 'tienda', 2, true)
  const c = s.cash
  E.step(s, rng)
  const st = s.stores[0]
  assert.ok(st.today.rev > 0)
  assert.ok(Math.abs(s.cash - c - st.today.rev * E.ROYALTY) < 1)
})
test('anaquel: se vacía con las ventas, el mayorista resurte y el CEDIS resurte cada noche', () => {
  const { s, rng } = g(); s.cash = 1e6
  const st = staffed(s, 'vdm', 'roma', 'tienda')
  E.step(s, rng)
  assert.ok(st.stock < 100)
  st.stock = 10
  const a = E.simulateStore(s, st, { stockFactor: E.stockFactor(st) }).customers
  const b = E.simulateStore(s, st).customers
  assert.ok(Math.abs(a / b - 0.4) < 1e-9)
  assert.ok(E.restock(s, st.id).ok); assert.equal(st.stock, 100)
  s.phase = 1; s.cash = 1e7; E.buildCedis(s, 'vdm')
  E.step(s, rng)
  assert.equal(st.stock, 100); assert.equal(st.today.restocked, 'cedis')
})
test('holding: se desbloquea en fase 4, cobra y se puede apagar', () => {
  const { s, rng } = g(); s.cash = 5e7
  staffed(s, 'vdm', 'roma', 'tienda')
  assert.equal(E.buyHolding(s, 'solar').ok, false)
  s.phase = 3
  assert.ok(E.buyHolding(s, 'solar').ok)
  const st = s.stores[0]
  assert.equal(E.storeDailyCosts(s, st).upkeep, 200 * 0.65)
  E.toggleHolding(s, 'solar')
  assert.equal(E.storeDailyCosts(s, st).upkeep, 200)
  assert.equal(E.buyHolding(s, 'banco').ok, false, 'requiere fintech')
})
test('conglomerados: alianza da beneficio, guerra lo rompe y baja su mercado; fusión cuando son chicos', () => {
  const { s, rng } = g(); s.cash = 1e8; s.phase = 1
  const st = staffed(s, 'vdm', 'roma', 'tienda')
  const rent = E.storeDailyCosts(s, st).rent
  assert.ok(E.alianza(s, 'altiplano').ok)
  assert.ok(Math.abs(E.storeDailyCosts(s, st).rent - rent * 0.85) < 1e-9)
  assert.ok(E.guerra(s, 'altiplano').ok)
  assert.equal(s.groups.altiplano.alliance, false)
  const sh = s.groups.altiplano.share
  for (let i = 0; i < 30; i++) E.step(s, rng)
  assert.ok(s.groups.altiplano.share < sh - 7)
  s.phase = 3
  assert.equal(E.adquirir(s, 'norte24').ok, false, 'muy grande')
  s.groups.trigal.share = 10
  const p = E.rivalPressure(s)
  assert.ok(E.adquirir(s, 'trigal').ok)
  assert.ok(E.rivalPressure(s) < p)
  assert.ok(E.perk(s, 'supply'))
})
test('comal: el jugador cobra tacos solo en taquerías', () => {
  const { s } = g(); s.cash = 1e6
  const t = E.openStore(s, 'vdm', 'centro', 'taqueria', 1).data
  const c = E.openStore(s, 'vdm', 'centro', 'cafe', 1).data
  const before = s.cash
  assert.ok(E.comalSale(s, t.id, 32).ok)
  assert.equal(s.cash, before + 32)
  assert.equal(E.comalSale(s, c.id, 32).ok, false)
})
test('un año estable sin NaN y guardado compatible', () => {
  const { s, rng } = g()
  staffed(s, 'vdm', 'roma', 'taqueria')
  for (let i = 0; i < 365; i++) E.step(s, rng)
  assert.ok(Number.isFinite(s.cash) && Number.isFinite(E.netWorth(s)))
  assert.equal(E.deserialize(E.serialize(s)).day, 365)
  assert.throws(() => E.deserialize('{"v":1}'))
})
