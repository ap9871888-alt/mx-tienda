import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as E from '../js/engine.js'

const g = () => ({ s: E.newGame(1), rng: E.mulberry32(2) })
const cliente = (s, extras = { chile: true, limon: true, cebolla: true }, quiere = 1) =>
  s.fila.push({ id: 99, name: 'Joven', receta: 'pastor', quiere, lleva: 0, extras, paciencia: 30, max: 30 })

test('arranque como en el diseño', () => {
  const { s } = g()
  assert.equal(s.cash, 450); assert.equal(s.carne, 45); assert.equal(s.tortillas, 80); assert.equal(E.hora(s), '20:15')
  assert.equal(E.pasivoTotal(s), 0)
})
test('rebanar gasta carne y despachar cobra $28 + propina si va como lo pidió', () => {
  const { s } = g()
  s.porciones = 0
  assert.ok(E.rebanar(s).ok); assert.equal(s.carne, 44.9)
  cliente(s)
  const r = E.despachar(s)
  assert.ok(r.ok && r.data.match)
  assert.equal(r.data.monto, Math.round(28 * 1.15))
  assert.equal(s.tortillas, 78); assert.equal(s.fila.length, 0)
})
test('salsero equivocado: sin propina y baja reputación', () => {
  const { s } = g()
  cliente(s, { chile: false, limon: true, cebolla: true })
  const rep = s.rep
  const r = E.despachar(s)
  assert.equal(r.data.monto, 28); assert.ok(s.rep < rep)
})
test('piña suma $4 al pastor y rush paga doble', () => {
  const { s } = g()
  cliente(s, { chile: false, limon: false, cebolla: false }, 2)
  s.extras = { chile: false, limon: false, cebolla: false }
  E.cacharPina(s)
  assert.equal(E.despachar(s).data.monto, Math.round(32 * 1.15))
  s.rush = 10
  assert.equal(E.despachar(s).data.monto, Math.round(28 * 1.15) * 2)
})
test('sin tortillas o sin carne rebanada no se despacha', () => {
  const { s } = g()
  cliente(s); s.porciones = 0
  assert.equal(E.despachar(s).ok, false)
  s.porciones = 1; s.tortillas = 1
  assert.equal(E.despachar(s).ok, false)
})
test('compras usan efectivo y luego cuenta', () => {
  const { s } = g()
  s.cash = 30; s.bank = 100
  assert.ok(E.comprar(s, 'tortillas').ok)
  assert.equal(s.cash, 0); assert.equal(s.bank, 70); assert.equal(s.tortillas, 180)
  assert.equal(E.comprar(s, 'carne').ok, false)
})
test('sede nueva da receta y genera pasivo solo si no operas ahí', () => {
  const { s } = g()
  s.cash = 3000
  assert.ok(E.desbloquearSede(s, 'gdl').ok)
  assert.equal(s.recetas.birria, 1)
  assert.ok(E.pasivoTotal(s) > 35)
  E.cambiarSede(s, 'gdl')
  assert.ok(Math.abs(E.pasivoTotal(s) - E.pasivoSede(s, 'cdmx')) < 1e-9, 'ahora la matriz trabaja sola')
})
test('recetas de otra sede requieren la sede', () => {
  const { s } = g()
  s.cash = 5000
  assert.equal(E.mejorarReceta(s, 'arrachera').ok, false)
  assert.ok(E.mejorarReceta(s, 'pastor').ok)
  assert.equal(E.precio(s, 'pastor'), 34)
})
test('clientes llegan, pierden paciencia y se van', () => {
  const { s, rng } = g()
  for (let i = 0; i < 600; i++) E.tick(s, 0.1, rng)
  assert.ok(s.fila.length > 0 || s.stats.perdidos > 0)
  for (let i = 0; i < 1200; i++) E.tick(s, 0.1, rng)
  if (!s.evento) assert.ok(s.stats.perdidos > 0)
})
test('evento pausa el juego y se resuelve', () => {
  const { s, rng } = g()
  E.lanzarEvento(s, rng, 'asalto')
  const m = s.minute
  E.tick(s, 1, rng)
  assert.equal(s.minute, m)
  s.cash = 1000
  E.resolverEvento(s, 0, rng)
  assert.equal(s.cash, 850); assert.equal(s.evento, null)
})
test('entrega: consume insumos y paga al llegar', () => {
  const { s, rng } = g()
  s.pedidos = [{ id: 7, app: 'Rapidín', receta: 'pastor', tacos: 5, km: 1, paga: 170 }]
  assert.ok(E.aceptarPedido(s, 7).ok)
  assert.equal(s.tortillas, 70)
  const c = s.cash
  for (let i = 0; i < 40; i++) E.tick(s, 1, rng)
  assert.ok(s.cash >= c + 170)
})
test('ganancia offline limitada a 2 h y a la mitad', () => {
  const { s } = g()
  s.sedes.mty = true
  s.savedAt = Date.now() - 10 * 3600e3
  const p = E.pasivoTotal(s)
  const { g: gan } = E.offline(s)
  assert.equal(gan, Math.round(p * 7200 * 0.5))
})
test('guardar y cargar', () => {
  const { s } = g()
  const t = E.serialize(s)
  assert.equal(E.deserialize(t).cash, 450)
  assert.throws(() => E.deserialize('{}'))
})
