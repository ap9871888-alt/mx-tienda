import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as E from '../js/engine.js'

const fresh = () => { const s = E.newGame(123); return { s, rng: E.mulberry32(9) } }

test('partida nueva: efectivo inicial, CDMX abierta y candidatos', () => {
  const { s } = fresh()
  assert.equal(s.cash, 300000)
  assert.deepEqual(s.unlocked, ['cdmx'])
  assert.equal(s.candidates.length, 4)
})

test('abrir tienda cobra equipo más depósito y no permite duplicados', () => {
  const { s } = fresh()
  const r = E.openStore(s, 'cdmx', 'centro', 1)
  assert.ok(r.ok)
  assert.equal(s.cash, 300000 - 60000 - 28000)
  assert.equal(E.openStore(s, 'cdmx', 'centro', 1).ok, false)
  assert.equal(E.openStore(s, 'gdl', 'chapu', 1).ok, false, 'ciudad bloqueada')
})

test('sin baristas la tienda no vende', () => {
  const { s, rng } = fresh()
  E.openStore(s, 'cdmx', 'centro', 1)
  E.step(s, rng)
  assert.equal(s.stores[0].today.rev, 0)
  assert.ok(s.stores[0].today.closed)
})

test('con baristas y grano hay ventas, y el grano se consume', () => {
  const { s, rng } = fresh()
  const { data } = E.openStore(s, 'cdmx', 'roma', 1)
  E.hire(s, data.id, 0); E.hire(s, data.id, 0)
  s.autoBuy = null
  const kg0 = s.beans.kg
  E.step(s, rng)
  assert.ok(s.stores[0].today.rev > 0)
  assert.ok(s.beans.kg < kg0)
})

test('sin grano no se venden bebidas de café', () => {
  const { s } = fresh()
  const { data } = E.openStore(s, 'cdmx', 'roma', 1)
  E.hire(s, data.id, 0)
  s.beans.kg = 0
  const r = E.simulateStore(s, s.stores[0])
  assert.ok(r.short)
  assert.equal(Math.round(r.sales.americano), 0)
  assert.ok(r.sales.concha > 0, 'el pan sí se vende')
})

test('precios altos reducen la demanda', () => {
  const { s } = fresh()
  const { data } = E.openStore(s, 'cdmx', 'centro', 1)
  for (let i = 0; i < 2; i++) E.hire(s, data.id, 0)
  const st = s.stores[0]
  st.staff.forEach(b => { b.skill = 5 }) // capacidad de sobra
  const base = E.simulateStore(s, st).customers
  for (const p of st.menu) st.prices[p] *= 2
  assert.ok(E.simulateStore(s, st).customers < base * 0.6)
})

test('el factor de precio es continuo y decreciente', () => {
  assert.ok(E.priceFactor(30, 40) > E.priceFactor(40, 40))
  assert.equal(E.priceFactor(40, 40), 1)
  assert.ok(E.priceFactor(60, 40) < 0.3)
})

test('remodelar sube nivel y agrega productos al menú', () => {
  const { s } = fresh()
  s.cash = 5e6
  const { data } = E.openStore(s, 'cdmx', 'centro', 1)
  assert.ok(E.upgradeStore(s, data.id).ok)
  assert.equal(data.tier, 2)
  assert.ok(data.menu.includes('capuchino'))
})

test('tostador propio abarata el grano 25 %', () => {
  const { s } = fresh()
  const p0 = E.beanPrice(s, 'veracruz')
  s.cash = 1e7
  E.openStore(s, 'cdmx', 'polanco', 4)
  assert.equal(E.beanPrice(s, 'veracruz'), Math.round(p0 * 0.75))
})

test('crédito respeta el límite e intereses se cobran', () => {
  const { s, rng } = fresh()
  assert.equal(E.takeLoan(s, 1e9).ok, false)
  assert.ok(E.takeLoan(s, 100000).ok)
  const c = s.cash
  E.step(s, rng)
  assert.ok(s.cash < c)
  assert.ok(E.repayLoan(s, 100000).ok)
  assert.equal(s.loan, 0)
})

test('bolsa: comprar y vender ajusta efectivo y posición', () => {
  const { s } = fresh()
  const c0 = s.cash
  assert.ok(E.buyStock(s, 'AZTC', 100).ok)
  assert.equal(s.holdings.AZTC.shares, 100)
  assert.ok(E.sellStock(s, 'AZTC', 100).ok)
  assert.equal(s.holdings.AZTC, undefined)
  assert.ok(s.cash < c0 && s.cash > c0 - 1000, 'solo se pierde la comisión')
})

test('quiebra tras 45 días en números rojos', () => {
  const { s, rng } = fresh()
  s.cash = -1e7
  for (let i = 0; i < 45; i++) E.step(s, rng)
  assert.ok(s.over)
})

test('guardar y cargar conserva la partida', () => {
  const { s, rng } = fresh()
  E.openStore(s, 'cdmx', 'centro', 1)
  for (let i = 0; i < 40; i++) E.step(s, rng)
  const back = E.deserialize(E.serialize(s))
  assert.equal(back.day, 40)
  assert.equal(back.stores.length, 1)
  assert.throws(() => E.deserialize('{"v":99}'))
})

test('un año de juego pasivo es estable (sin NaN) y la fase avanza al expandir', () => {
  const { s, rng } = fresh()
  const { data } = E.openStore(s, 'cdmx', 'roma', 1)
  E.hire(s, data.id, 0); E.hire(s, data.id, 0)
  for (let i = 0; i < 365; i++) E.step(s, rng)
  assert.ok(Number.isFinite(s.cash) && Number.isFinite(E.netWorth(s)))
  s.cash += 1e6
  E.unlockCity(s, 'oax'); E.openStore(s, 'oax', 'andador', 1)
  E.step(s, rng)
  assert.ok(s.phase >= 1)
})
