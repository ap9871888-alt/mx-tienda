// Taquería Tycoon — motor del juego en tiempo real. Puro (sin DOM): tick(state, segundos, rng).

export const SAVE_VERSION = 1
export const TORTILLAS_POR_TACO = 2 // "con copia"
export const CARNE_POR_PORCION = 0.1 // kg
export const MAX_FILA = 5
export const MAX_PORCIONES = 12
export const MIN_POR_SEG = 2 // minutos de juego por segundo real

export const SEDES = [
  { id: 'cdmx', name: 'CDMX', lugar: 'Metro Tacubaya', icon: '🌮', unlock: 0, pasivo: 12, renta: 40,
    desc: 'Puesto tradicional de banqueta · Pastor al vuelo y Suadero.', maestro: 'Don Beto (Pastorero)',
    grito: '¡PÁSELE JOVEN, HAY DE PASTOR, SUADERO, TRIPA Y CAMPECHANO!' },
  { id: 'mty', name: 'Monterrey', lugar: 'San Pedro / Fundidora', icon: '🤠', unlock: 2500, pasivo: 45, renta: 90,
    desc: 'Asador al carbón de mezquite · Arrachera en harina, costras y cheve fría.', maestro: 'El Compadre Chuy (Parrillero)',
    grito: '¡ÁNDALE PLEBE, ARRACHERA AL CARBÓN Y VAMPIROS BIEN DORADOS!' },
  { id: 'gdl', name: 'Guadalajara', lugar: 'Chapultepec / San Juan', icon: '🍲', unlock: 1800, pasivo: 35, renta: 70,
    desc: 'Olla hirviendo de Birria caldosa · Tacos dorados para chopear en consomé.', maestro: 'Don Chente (Birriero)',
    grito: '¡PÁSELE, BIRRIA CALDOSITA Y BARBACOA DORADA, CON SU CONSOMÉ!' }
]

export const RECETAS = [
  { id: 'pastor', sede: 'cdmx', icon: '🍍', name: 'Taco de Pastor con Piña', desc: 'Cilantro, cebolla y la piña cachada en el aire.', base: 28, unlock: 0, up: 120 },
  { id: 'suadero', sede: 'cdmx', icon: '🥩', name: 'Suadero Confitado', desc: 'Bien jugoso, en su grasita, con papas de cama.', base: 24, unlock: 180, up: 150 },
  { id: 'arrachera', sede: 'mty', icon: '🔥', name: 'Arrachera en Harina', desc: 'Carbón de mezquite, tortilla norteña y limón real.', base: 48, unlock: 380, up: 300 },
  { id: 'vampiro', sede: 'mty', icon: '🧀', name: 'Vampiro Norteño & Costra', desc: 'Tostada cóncava crujiente con quesillo dorado.', base: 40, unlock: 520, up: 340 },
  { id: 'birria', sede: 'gdl', icon: '🍲', name: 'Birria Tapatía con Consomé', desc: 'Olla caldosa hirviendo para chopear y cebollitas.', base: 42, unlock: 340, up: 280 },
  { id: 'barbacoa', sede: 'gdl', icon: '🌮', name: 'Barbacoa Dorada San Juan', desc: 'Dorada en comal con salsa de chile de árbol bien picante.', base: 38, unlock: 460, up: 300 }
]

export const ABASTO = [
  { id: 'tortillas', icon: '🫓', name: 'Paquete de 100 Tortillas', desc: 'Maíz nixtamalizado y harina norteña.', efecto: '+100 tortillas', costo: 60 },
  { id: 'carne', icon: '🥩', name: 'Lote de Carnes Selectas (50 kg)', desc: 'Pastor, suadero, arrachera y carne pa’ birria.', efecto: '+50 kg de carne', costo: 140 },
  { id: 'salsa', icon: '🧅', name: 'Huacal de Verdura y Chiles', desc: 'Cilantro, cebolla cambray, limones y chiles secos.', efecto: 'Salsas al 100 %', costo: 45 }
]

const NOMBRES = ['Joven', 'Seño', 'Don Pepe', 'La Güera', 'El Ingeniero', 'Doña Lupe', 'El Licenciado', 'Compa', 'Mija', 'El Profe',
  'El Chavo', 'Doña Mary', 'El Oficial', 'Plebe', 'Carnal', 'La Tía', 'El Tapatío', 'La Regia', 'Taxista', 'Albañil']
const APPS = ['TacoExprés', 'Rapidín', 'PídeloYa']

export const recetaOf = id => RECETAS.find(r => r.id === id)
export const sedeOf = id => SEDES.find(s => s.id === id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const pick = (rng, a) => a[Math.floor(rng() * a.length)]

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

export function newGame (seed = Date.now()) {
  return {
    v: SAVE_VERSION,
    seed: seed >>> 0,
    cash: 450,
    bank: 0,
    rep: 4.3,
    carne: 45,
    tortillas: 80,
    salsa: 100,
    day: 1,
    minute: 20 * 60 + 15,
    sede: 'cdmx',
    sedes: { cdmx: true, mty: false, gdl: false },
    recetas: { pastor: 1, suadero: 0, arrachera: 0, vampiro: 0, birria: 0, barbacoa: 0 },
    porciones: 2,
    pina: false,
    extras: { chile: true, limon: true, cebolla: true },
    fila: [],
    spawnAcc: 1.6, // dos clientes esperando al abrir
    betoLvl: 1,
    betoAcc: 0,
    motoLvl: 1,
    entrega: null,
    pedidos: [],
    pedidoAcc: 10,
    rush: 0,
    rushCd: 0,
    comalOff: 0,
    lluvia: 0,
    precioCarne: 1,
    terminal: false,
    evento: null,
    eventoAcc: 0,
    nextId: 1,
    log: [],
    stats: { tacos: 0, ganado: 0, perfectos: 0, perdidos: 0 },
    savedAt: Date.now()
  }
}

function log (s, text, kind = 'info') {
  s.log.unshift({ text, kind, day: s.day, minute: Math.floor(s.minute) })
  if (s.log.length > 30) s.log.length = 30
}
const ok = (msg = '', data) => ({ ok: true, msg, data })
const fail = msg => ({ ok: false, msg })

// paga primero con efectivo y luego con la cuenta
function pay (s, amount) {
  if (s.cash + s.bank < amount) return false
  const fromCash = Math.min(s.cash, amount)
  s.cash -= fromCash
  s.bank -= amount - fromCash
  return true
}
export const canPay = (s, amount) => s.cash + s.bank >= amount

// ---------- precios y pasivo ----------
export function precio (s, id) {
  const r = recetaOf(id); const lvl = s.recetas[id]
  return lvl > 0 ? r.base + (lvl - 1) * 6 : 0
}
export function costoMejora (s, id) {
  const r = recetaOf(id); const lvl = s.recetas[id]
  return lvl === 0 ? r.unlock : Math.round(r.up * Math.pow(1.6, lvl - 1))
}
export const recetasActivas = s => RECETAS.filter(r => r.sede === s.sede && s.recetas[r.id] > 0)
export function pasivoSede (s, id) {
  const sd = sedeOf(id)
  const niveles = RECETAS.filter(r => r.sede === id).reduce((a, r) => a + s.recetas[r.id], 0)
  return sd.pasivo * (1 + 0.25 * niveles) * (s.rep / 4.3)
}
// las sedes desbloqueadas donde NO estás despachando trabajan solas
export function pasivoTotal (s) {
  return SEDES.filter(sd => s.sedes[sd.id] && sd.id !== s.sede).reduce((a, sd) => a + pasivoSede(s, sd.id), 0)
}
export const costoBeto = s => Math.round(200 * Math.pow(1.8, s.betoLvl - 1))
export const costoMoto = s => Math.round(300 * Math.pow(2, s.motoLvl - 1))
export const betoIntervalo = s => 6 / s.betoLvl
export const precioAbasto = (s, id) => {
  const a = ABASTO.find(x => x.id === id)
  return Math.round(a.costo * (id === 'carne' ? s.precioCarne : 1))
}

// ---------- reloj ----------
export function hora (s) {
  const m = Math.floor(s.minute) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function afluenciaHora (minute) {
  const h = (minute % 1440) / 60
  if (h >= 2 && h < 7) return 0.25 // madrugada
  if (h >= 13 && h < 16) return 1.3 // comida
  if (h >= 20 || h < 2) return 1.45 // la hora del taco
  return 0.85
}

// ---------- clientes ----------
function nuevoCliente (s, rng) {
  const recs = recetasActivas(s)
  if (!recs.length) return null
  const max = 22 + rng() * 18
  return {
    id: s.nextId++,
    name: pick(rng, NOMBRES),
    receta: pick(rng, recs).id,
    quiere: 1 + Math.floor(rng() * 3),
    lleva: 0,
    extras: { chile: rng() < 0.75, limon: rng() < 0.8, cebolla: rng() < 0.7 },
    paciencia: max,
    max
  }
}

// ---------- acciones del comal ----------
export function rebanar (s) {
  if (s.comalOff > 0) return fail('El comal está apagado')
  if (s.porciones >= MAX_PORCIONES) return fail('Ya hay suficiente carne rebanada')
  if (s.carne < CARNE_POR_PORCION) return fail('¡Se acabó la carne! Surte en Abasto')
  s.carne = +(s.carne - CARNE_POR_PORCION).toFixed(2)
  s.porciones++
  return ok()
}
export function cacharPina (s) {
  if (s.pina) return fail('Ya hay piña en la tortilla')
  s.pina = true
  return ok('¡Piña al vuelo!')
}
export function toggleExtra (s, k) {
  if (!(k in s.extras)) return fail('')
  s.extras[k] = !s.extras[k]
  return ok()
}

// despacha UN taco al primer cliente de la fila
export function despachar (s) {
  const c = s.fila[0]
  if (!c) return fail('No hay nadie en la fila')
  if (s.comalOff > 0) return fail('El comal está apagado')
  if (s.porciones < 1) return fail('Rebana carne primero 🔪')
  if (s.tortillas < TORTILLAS_POR_TACO) return fail('¡Sin tortillas! Surte en Abasto')
  const conChile = s.extras.chile && s.salsa >= 1
  s.porciones--
  s.tortillas -= TORTILLAS_POR_TACO
  if (conChile) s.salsa = Math.max(0, s.salsa - 1)
  const match = (conChile === c.extras.chile) && (s.extras.limon === c.extras.limon) && (s.extras.cebolla === c.extras.cebolla)
  let monto = precio(s, c.receta)
  if (c.receta === 'pastor' && s.pina) monto += 4
  let propina = 0
  if (match) {
    propina = monto * 0.15 * (s.terminal ? 1.25 : 1) + (s.terminal ? monto * 0.25 * 0.4 : 0)
    s.rep = clamp(s.rep + 0.004, 1, 5)
    s.stats.perfectos++
  } else {
    s.rep = clamp(s.rep - 0.02, 1, 5)
  }
  monto += propina
  if (s.rush > 0) monto *= 2
  monto = Math.round(monto)
  s.pina = false
  s.cash += monto
  s.stats.tacos++
  s.stats.ganado += monto
  c.lleva++
  c.paciencia = Math.min(c.max, c.paciencia + 8)
  if (c.lleva >= c.quiere) s.fila.shift()
  return ok(match ? '' : `¡${c.name} lo quería ${describeExtras(c.extras)}!`, { monto, match, done: c.lleva >= c.quiere })
}
export function describeExtras (e) {
  if (e.chile && e.limon && e.cebolla) return 'con todo'
  const con = []; const sin = []
  ;(e.chile ? con : sin).push('salsa')
  ;(e.limon ? con : sin).push('limón')
  ;(e.cebolla ? con : sin).push('cebolla')
  if (!con.length) return 'solito, sin nada'
  return `con ${con.join(' y ')}${sin.length ? `, sin ${sin.join(' ni ')}` : ''}`
}
export function activarRush (s) {
  if (s.rushCd > 0) return fail(`El rush se recarga en ${Math.ceil(s.rushCd)} s`)
  s.rush = 20
  s.rushCd = 90
  log(s, '⚡ ¡RUSH! Pagos dobles por 20 segundos', 'good')
  return ok('¡RUSH X2!')
}

// ---------- abasto ----------
export function comprar (s, id) {
  const c = precioAbasto(s, id)
  if (id === 'salsa' && s.salsa >= 100) return fail('Las salsas ya están llenas')
  if (!pay(s, c)) return fail('No te alcanza, patrón')
  if (id === 'tortillas') s.tortillas += 100
  if (id === 'carne') s.carne = +(s.carne + 50).toFixed(2)
  if (id === 'salsa') s.salsa = 100
  return ok(`Surtido: ${ABASTO.find(a => a.id === id).efecto}`)
}

// ---------- recetas, equipo y sedes ----------
export function mejorarReceta (s, id) {
  const r = recetaOf(id)
  if (!r) return fail('No existe')
  if (!s.sedes[r.sede]) return fail(`Primero abre la sede de ${sedeOf(r.sede).name}`)
  if (s.recetas[id] >= 10) return fail('Receta al máximo')
  const c = costoMejora(s, id)
  if (!pay(s, c)) return fail('No te alcanza, patrón')
  s.recetas[id]++
  log(s, s.recetas[id] === 1 ? `Nueva receta: ${r.name}` : `${r.name} ahora es Nv.${s.recetas[id]}`, 'good')
  return ok(s.recetas[id] === 1 ? '¡Receta desbloqueada!' : '¡Receta mejorada!')
}
export function mejorarBeto (s) {
  if (s.betoLvl >= 8) return fail('Don Beto ya es leyenda')
  if (!pay(s, costoBeto(s))) return fail('No te alcanza, patrón')
  s.betoLvl++
  return ok('Don Beto rebana más rápido')
}
export function mejorarMoto (s) {
  if (s.motoLvl >= 5) return fail('Ya tiene la mejor moto')
  if (!pay(s, costoMoto(s))) return fail('No te alcanza, patrón')
  s.motoLvl++
  return ok('El Brayan estrena moto')
}
export function desbloquearSede (s, id) {
  const sd = sedeOf(id)
  if (!sd || s.sedes[id]) return fail('Ya está abierta')
  if (!pay(s, sd.unlock)) return fail('No te alcanza, patrón')
  s.sedes[id] = true
  const first = RECETAS.find(r => r.sede === id)
  if (!s.recetas[first.id]) s.recetas[first.id] = 1
  log(s, `🏆 ¡Abriste sede en ${sd.name}! (${first.name} incluida)`, 'good')
  return ok(`¡Sede ${sd.name} abierta!`)
}
export function cambiarSede (s, id) {
  if (!s.sedes[id]) return fail('Sede bloqueada')
  if (s.sede === id) return ok()
  s.sede = id
  s.fila = []
  s.pedidos = []
  s.pina = false
  log(s, `Ahora despachas en ${sedeOf(id).name}`, 'info')
  return ok(`Despachando en ${sedeOf(id).name}`)
}

// ---------- cuenta y cobro ----------
export function depositar (s, n) {
  n = Math.min(n, Math.floor(s.cash))
  if (n <= 0) return fail('No hay efectivo para depositar')
  s.cash -= n; s.bank += n
  return ok(`Depositaste $${n}`)
}
export function retirar (s, n) {
  n = Math.min(n, Math.floor(s.bank))
  if (n <= 0) return fail('La cuenta está vacía')
  s.bank -= n; s.cash += n
  return ok(`Retiraste $${n}`)
}
export const COSTO_TERMINAL = 350
export function contratarTerminal (s) {
  if (s.terminal) return fail('Ya tienes terminal')
  if (!pay(s, COSTO_TERMINAL)) return fail('No te alcanza, patrón')
  s.terminal = true
  return ok('Terminal de cobro lista: +25 % de propina')
}

// ---------- entregas ----------
function nuevoPedido (s, rng) {
  const recs = recetasActivas(s)
  const r = pick(rng, recs)
  const tacos = 4 + Math.floor(rng() * 9)
  const km = +(1 + rng() * 5).toFixed(1)
  return { id: s.nextId++, app: pick(rng, APPS), receta: r.id, tacos, km, paga: Math.round(tacos * precio(s, r.id) * 1.1 + km * 8) }
}
export const tiempoEntrega = (s, p) => Math.round(p.km * 9 / (0.6 + s.motoLvl * 0.4))
export function aceptarPedido (s, id) {
  if (s.entrega) return fail('El Brayan anda en ruta')
  const p = s.pedidos.find(x => x.id === id)
  if (!p) return fail('El pedido ya no está')
  if (s.carne < p.tacos * CARNE_POR_PORCION) return fail('No hay carne suficiente')
  if (s.tortillas < p.tacos * TORTILLAS_POR_TACO) return fail('No hay tortillas suficientes')
  s.carne = +(s.carne - p.tacos * CARNE_POR_PORCION).toFixed(2)
  s.tortillas -= p.tacos * TORTILLAS_POR_TACO
  s.pedidos = s.pedidos.filter(x => x.id !== id)
  const t = tiempoEntrega(s, p)
  s.entrega = { ...p, left: t, total: t }
  return ok(`🛵 El Brayan salió con ${p.tacos} tacos`)
}

// ---------- eventos ----------
const EVENTOS = [
  { id: 'inspeccion', icon: '📋', title: 'Llegó la inspección sanitaria',
    desc: 'Un inspector revisa tu puesto y "encontró detallitos".',
    ops: [{ label: 'Pagar la multa ($150)', fx: s => pay(s, 150) ? ['Pagaste la multa. Todo en regla.', 'info'] : (s.comalOff = 40, ['Sin dinero: te cerraron el comal 40 s', 'bad']) },
      { label: 'Cerrar y limpiar (comal apagado 30 s, +reputación)', fx: s => { s.comalOff = 30; s.rep = clamp(s.rep + 0.15, 1, 5); return ['Quedó rechinando de limpio. +0.15 ★', 'good'] } }] },
  { id: 'gas', icon: '🔥', title: 'Se acabó el gas',
    desc: 'El tanque hizo "pfff" en plena hora pico.',
    ops: [{ label: 'Tanque nuevo de emergencia ($80)', fx: s => pay(s, 80) ? ['Comal prendido otra vez', 'info'] : (s.comalOff = 45, ['Sin dinero: comal apagado 45 s', 'bad']) },
      { label: 'Esperar al gasero (comal apagado 35 s)', fx: s => { s.comalOff = 35; return ['Ahí viene el gaaas…', 'info'] } }] },
  { id: 'partido', icon: '⚽', title: '¡Ganó la selección!',
    desc: 'La banda sale a festejar y todos quieren tacos.',
    ops: [{ label: '¡Rush gratis por 25 s!', fx: s => { s.rush = Math.max(s.rush, 25); s.spawnAcc += 3; return ['¡Pagos dobles por 25 s!', 'good'] } },
      { label: 'Llenar la fila de una vez', fx: s => { s.spawnAcc += 5; return ['Se llenó la banqueta', 'good'] } }] },
  { id: 'asalto', icon: '🚨', title: 'Asaltan la cuadra',
    desc: 'Dos tipos en moto van puesto por puesto. El efectivo en la caja está en riesgo.',
    ops: [{ label: 'Esconder la caja (pierdes 15 % del efectivo)', fx: s => { const l = Math.round(s.cash * 0.15); s.cash -= l; return [`Perdiste $${l}. El dinero en cuenta está a salvo.`, 'bad'] } },
      { label: 'Hacerse el valiente (50 %: no pasa nada / pierdes 45 %)', fx: (s, rng) => { if (rng() < 0.5) return ['¡Se fueron de largo!', 'good']; const l = Math.round(s.cash * 0.45); s.cash -= l; return [`Te bajaron $${l}. Deposita en la cuenta, patrón.`, 'bad'] } }] },
  { id: 'influencer', icon: '📱', title: 'Una influencer quiere reseñarte',
    desc: 'Tiene 2 millones de seguidores y "mucha hambre".',
    ops: [{ label: 'Invitarle 5 tacos (gasta carne y tortillas)', fx: s => { s.carne = Math.max(0, +(s.carne - 0.5).toFixed(2)); s.tortillas = Math.max(0, s.tortillas - 10); s.rep = clamp(s.rep + 0.3, 1, 5); return ['¡Video viral! +0.3 ★', 'good'] } },
      { label: 'Cobrarle como a todos', fx: (s, rng) => { if (rng() < 0.4) { s.rep = clamp(s.rep - 0.2, 1, 5); return ['Te tundió en redes. −0.2 ★', 'bad'] } s.cash += 60; return ['Pagó y hasta dejó propina. +$60', 'good'] } }] },
  { id: 'carne', icon: '🥩', title: 'Sube el precio de la carne',
    desc: 'En la central dicen que mañana el lote sube 40 %.',
    ops: [{ label: 'Surtir ya 50 kg al precio de hoy', fx: s => { const c = precioAbasto(s, 'carne'); s.precioCarne *= 1.4; if (pay(s, c)) { s.carne = +(s.carne + 50).toFixed(2); return [`Compraste a $${c} antes del aumento`, 'good'] } return ['No alcanzó para surtir. La carne subió 40 %', 'bad'] } },
      { label: 'Aguantar (sube 40 % un rato)', fx: s => { s.precioCarne *= 1.4; return ['La carne subió 40 %', 'bad'] } }] },
  { id: 'lluvia', icon: '🌧️', title: 'Tormenta en la ciudad',
    desc: 'Se viene un aguacero de los buenos.',
    ops: [{ label: 'Poner la lona ($40)', fx: s => pay(s, 40) ? ['Lona puesta: la clientela se queda', 'good'] : (s.lluvia = 60, ['Sin lona: llegan menos clientes 60 s', 'bad']) },
      { label: 'Aguantar (menos clientes por 60 s)', fx: s => { s.lluvia = 60; return ['Llueve y la banqueta está vacía', 'bad'] } }] },
  { id: 'sonidero', icon: '📻', title: 'Baile sonidero en la esquina',
    desc: 'El sonidero pide tacos para el equipo a cambio de saludos.',
    ops: [{ label: 'Mandar 10 tacos (gasta insumos, +clientes)', fx: s => { s.carne = Math.max(0, +(s.carne - 1).toFixed(2)); s.tortillas = Math.max(0, s.tortillas - 20); s.rep = clamp(s.rep + 0.1, 1, 5); s.spawnAcc += 4; return ['"¡Saludos a la taquería del patrón!" +0.1 ★', 'good'] } },
      { label: 'Mejor no', fx: () => ['Siguió la cumbia sin ti', 'info'] }] }
]
export function lanzarEvento (s, rng, id) {
  if (s.evento) return fail('Ya hay una emergencia abierta')
  const e = id ? EVENTOS.find(x => x.id === id) : pick(rng, EVENTOS)
  s.evento = e.id
  return ok('', e)
}
export const eventoActual = s => EVENTOS.find(e => e.id === s.evento) || null
export function resolverEvento (s, idx, rng) {
  const e = eventoActual(s)
  if (!e || !e.ops[idx]) return fail('Nada que decidir')
  const [msg, kind] = e.ops[idx].fx(s, rng)
  s.evento = null
  s.eventoAcc = 0
  log(s, `${e.icon} ${msg}`, kind)
  return { ok: kind !== 'bad', msg, kind }
}

// ---------- tick ----------
export function tick (s, dt, rng) {
  const out = { pagos: [], llegaron: 0, seFueron: 0, entregado: null, cortado: 0 }
  if (s.evento) dt *= 0 // la decisión pausa el juego
  if (dt <= 0) return out
  const antes = s.minute
  s.minute += dt * MIN_POR_SEG
  if (Math.floor(s.minute / 1440) > Math.floor(antes / 1440)) {
    s.day++
    const renta = SEDES.filter(sd => s.sedes[sd.id]).reduce((a, sd) => a + sd.renta, 0)
    if (!pay(s, renta)) { s.cash -= renta; log(s, `No alcanzó para la renta ($${renta}). Estás en números rojos`, 'bad') } else log(s, `🌅 Día ${s.day}. Pagaste $${renta} de renta y permisos`, 'info')
  }
  s.rush = Math.max(0, s.rush - dt)
  s.rushCd = Math.max(0, s.rushCd - dt)
  s.comalOff = Math.max(0, s.comalOff - dt)
  s.lluvia = Math.max(0, s.lluvia - dt)
  s.precioCarne += (1 - s.precioCarne) * Math.min(1, dt * 0.004)

  // pasivo nacional
  const pas = pasivoTotal(s) * dt
  s.cash += pas
  s.stats.ganado += pas

  // Don Beto rebana solo
  if (s.comalOff <= 0) {
    s.betoAcc += dt
    while (s.betoAcc >= betoIntervalo(s)) {
      s.betoAcc -= betoIntervalo(s)
      if (rebanar(s).ok) out.cortado++
    }
  }

  // clientes
  const rate = 0.28 * Math.pow(s.rep / 4.3, 2) * afluenciaHora(s.minute) * (s.lluvia > 0 ? 0.45 : 1) * (s.rush > 0 ? 1.6 : 1) * (s.comalOff > 0 ? 0.3 : 1)
  s.spawnAcc += rate * dt
  while (s.spawnAcc >= 1) {
    s.spawnAcc -= 1
    if (s.fila.length < MAX_FILA) {
      const c = nuevoCliente(s, rng)
      if (c) { s.fila.push(c); out.llegaron++ }
    }
  }
  for (const c of s.fila) c.paciencia -= dt
  const idos = s.fila.filter(c => c.paciencia <= 0)
  if (idos.length) {
    s.fila = s.fila.filter(c => c.paciencia > 0)
    s.rep = clamp(s.rep - 0.05 * idos.length, 1, 5)
    s.stats.perdidos += idos.length
    out.seFueron = idos.length
    log(s, `😤 ${idos[0].name} se fue sin sus tacos (−reputación)`, 'bad')
  }

  // pedidos por app
  s.pedidoAcc += dt
  if (s.pedidoAcc >= 18 && s.pedidos.length < 3) { s.pedidoAcc = 0; s.pedidos.push(nuevoPedido(s, rng)) }
  if (s.entrega) {
    s.entrega.left -= dt
    if (s.entrega.left <= 0) {
      const e = s.entrega
      const paga = s.rush > 0 ? e.paga * 2 : e.paga
      s.cash += paga
      s.stats.ganado += paga
      s.stats.tacos += e.tacos
      s.rep = clamp(s.rep + 0.03, 1, 5)
      s.entrega = null
      out.entregado = paga
      log(s, `🛵 Entrega de ${e.app} completada: +$${paga}`, 'good')
    }
  }

  // emergencia aleatoria (~cada 2–4 minutos reales)
  s.eventoAcc += dt
  if (!s.evento && s.eventoAcc > 120 && rng() < dt / 90) out.evento = lanzarEvento(s, rng).data
  return out
}

// ganancias mientras no estabas: la mitad del pasivo, máximo 2 horas
export function offline (s, now = Date.now()) {
  const secs = clamp((now - (s.savedAt || now)) / 1000, 0, 7200)
  const g = Math.round(pasivoTotal(s) * secs * 0.5)
  s.cash += g
  s.stats.ganado += g
  return { secs, g }
}

export function serialize (s) { s.savedAt = Date.now(); return JSON.stringify(s) }
export function deserialize (t) {
  const s = JSON.parse(t)
  if (!s || s.v !== SAVE_VERSION || !s.recetas) throw new Error('Partida incompatible')
  return s
}
