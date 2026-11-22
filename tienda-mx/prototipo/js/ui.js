// Tienda MX Inc. — interfaz móvil. Vistas como HTML, eventos delegados con data-a.
import * as E from './engine.js'
import { GIROS, GIRO_IDS, REGIONS, CEDIS, CORP, CAMPAIGNS, PROPERTIES, STOCKS, PHASES, ADVISORS, MONTHS, HOLDING, GROUPS, PROCESOS } from './data.js'
import { createStreet } from './street.js'

const SAVE_KEY = 'tiendamx-save-v2'
const SPEEDS = { 0: 0, 1: 1400, 2: 650, 3: 260 }
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
let S = null; let rng = null; let speed = 1; let timer = null
let view = 'mapa'; let viewArg = null; let sheet = null
let interacting = false; let interactTimer = null; let confirmKey = null; let lastSave = 0
let filtro = 'todos'
let comal = null // turno del jugador en el comal de una taquería (no se guarda)
let corpTab = 'expansion'
let street = null // escena animada de la sucursal abierta
const $ = s => document.querySelector(s)

// ---------- formato ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-MX')
function fmtK (n) {
  const a = Math.abs(n); const sg = n < 0 ? '−' : ''
  if (a >= 1e6) return `${sg}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)} M`
  if (a >= 1e4) return `${sg}$${Math.round(a / 1000)} k`
  return fmt(n)
}
const pct = (v, d = 0) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)} %`
const dateLabel = day => { const d = E.dateOf(day); return { main: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, dow: DOW[d.getUTCDay()] } }
const stars = n => `<span class="stars" aria-label="${n} de 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`
const satClass = v => v >= 65 ? 'good' : v >= 45 ? 'warn' : 'bad'
const storeName = s => `${GIROS[s.giro].icon} ${E.locOf(s.region, s.loc).name}`

// ---------- arte ----------
// Las taquerías no tienen foto todavía: se dibujan en SVG con los mismos colores.
function taqueriaSVG (tier) {
  const wall = ['#E9D3B0', '#F2B705', '#2E7D5B', '#D63B2F'][tier - 1]
  const w = 220; const h = 150
  let g = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Taquería nivel ${tier}" preserveAspectRatio="xMidYMid slice"><rect width="${w}" height="${h}" fill="#1d1620"/>`
  for (let i = 0; i < 18; i++) g += `<circle cx="${(i * 37) % w}" cy="${(i * 23) % 45 + 5}" r="1" fill="#fff" opacity=".6"/>`
  g += `<rect x="0" y="122" width="${w}" height="28" fill="#3a3340"/><rect x="0" y="120" width="${w}" height="4" fill="#5a5260"/>`
  const bw = 90 + tier * 25; const bx = (w - bw) / 2; const by = 70 - tier * 8
  g += `<rect x="${bx}" y="${by}" width="${bw}" height="${122 - by}" fill="${wall}"/>`
  g += `<rect x="${bx - 4}" y="${by - 14}" width="${bw + 8}" height="16" rx="3" fill="#2B2D33"/><text x="${w / 2}" y="${by - 2}" text-anchor="middle" font-family="Archivo Black, Arial Black, sans-serif" font-size="11" fill="#F2B705">TAQUERÍA</text>`
  const stripes = Math.round(bw / 12)
  for (let i = 0; i < stripes; i++) g += `<path d="M${bx + i * bw / stripes},${by + 2} h${bw / stripes} l-3,14 h${-bw / stripes} z" fill="${i % 2 ? '#fff' : '#E6007E'}"/>`
  g += `<rect x="${bx + 10}" y="${by + 26}" width="${bw - 20}" height="${96 - by - 26 + by - 10}" fill="#FFC52E" opacity=".25"/>`
  // trompos
  for (let t = 0; t < (tier >= 4 ? 2 : 1); t++) {
    const tx = bx + 22 + t * 26
    g += `<ellipse cx="${tx}" cy="112" rx="14" ry="6" fill="#FF6A1A" opacity=".5"/><path d="M${tx - 9},${by + 36} h18 l-5,46 h-8 z" fill="#C0451F"/><path d="M${tx - 8},${by + 44} h16 M${tx - 7},${by + 56} h14 M${tx - 6},${by + 68} h12" stroke="#F08A3A" stroke-width="3"/><text x="${tx}" y="${by + 36}" text-anchor="middle" font-size="12">🍍</text>`
  }
  g += `<rect x="${bx + 8}" y="104" width="${bw - 16}" height="8" fill="#6b4a2e"/>`
  if (tier >= 2) for (let i = 0; i < tier; i++) g += `<text x="${bx + bw - 22 - i * 22}" y="${by + 64}" font-size="16">${['🌮', '🥤', '🍲', '🥩'][i]}</text>`
  if (tier >= 3) g += `<rect x="${bx + bw}" y="96" width="${tier * 10}" height="26" fill="#6b4a2e"/><text x="${bx + bw + 4}" y="114" font-size="13">🪑</text>`
  for (let i = 0; i < 6; i++) g += `<circle cx="${bx + 8 + i * (bw - 16) / 5}" cy="${by + 20}" r="2.4" fill="#FFC52E"/>`
  return g + '</svg>'
}
function art (giro, tier, cls = 'art') {
  const f = GIROS[giro].formats[tier - 1]
  return f.img ? `<img class="${cls === 'art' ? '' : cls}" src="${f.img}" alt="${f.name}" style="width:100%;height:100%;object-fit:cover;display:block">` : taqueriaSVG(tier)
}

// ---------- guardado ----------
function save () { try { localStorage.setItem(SAVE_KEY, E.serialize(S)); lastSave = S.day } catch {} }
function loadSave () { try { const t = localStorage.getItem(SAVE_KEY); return t ? E.deserialize(t) : null } catch { return null } }

// ---------- reloj ----------
function setSpeed (v) { speed = v; clearInterval(timer); if (SPEEDS[v]) timer = setInterval(tick, SPEEDS[v]); renderTop() }
function tick () {
  if (!S || S.over) return
  E.step(S, rng)
  if (S.day - lastSave >= 5) save()
  if (S.over) { setSpeed(0); save() }
  renderTop()
  if (interacting) return
  renderView(); if (sheet?.live) renderSheet()
}
function act (res, after) {
  if (!res) return
  if (res.msg) toast(res.msg, !res.ok)
  if (res.ok && after) after(res)
  save(); renderTop(); renderView(); if (sheet) renderSheet()
}
let toastT
function toast (msg, bad = false) {
  let t = $('#toast')
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
  t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; t.hidden = false
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true }, 2600)
}
function floatAt (el, text) {
  const r = el?.getBoundingClientRect(); if (!r) return
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text
  f.style.left = `${r.left + r.width / 2 - 24}px`; f.style.top = `${r.top - 4}px`
  document.body.appendChild(f); setTimeout(() => f.remove(), 950)
}
function go (v, arg = null) {
  view = v; viewArg = arg; confirmKey = null
  if (v !== 'store') comal = null
  renderView(); window.scrollTo(0, 0)
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.v === (v === 'store' ? 'tiendas' : v) ? 'page' : 'false'))
}
function openSheet (fn, arg = null, live = true) { sheet = { fn, arg, live }; confirmKey = null; renderSheet() }
function closeSheet () { sheet = null; $('#sheet-root').innerHTML = '' }

// ---------- comal (minijuego de taquería) ----------
function nuevaOrden () {
  const r = Math.random
  return { n: 1 + Math.floor(r() * 3), lleva: 0, e: { chile: r() < 0.75, limon: r() < 0.8, cebolla: r() < 0.7 } }
}
const extrasTxt = e => e.chile && e.limon && e.cebolla ? 'con todo' : (['chile', 'limon', 'cebolla'].filter(k => e[k]).map(k => ({ chile: 'salsa', limon: 'limón', cebolla: 'cebolla' }[k])).join(', ') || 'solito')

// ---------- acciones ----------
const H = {
  nav: d => go(d.v),
  speed: d => setSpeed(+d.s),
  region: d => openSheet('region', d.id),
  unlock: d => act(E.unlockRegion(S, d.id)),
  openLoc: d => openSheet('open', { region: d.region, loc: d.loc, giro: d.giro || 'tienda', franq: false }),
  giroPick: d => { sheet.arg.giro = d.g; renderSheet() },
  franqPick: () => { sheet.arg.franq = !sheet.arg.franq; renderSheet() },
  openStore: d => act(E.openStore(S, d.region, d.loc, d.giro, +d.tier, d.franq === '1'), res => { closeSheet(); go('store', res.data.id); if (!res.data.franq) openSheet('hire', res.data.id) }),
  store: d => { closeSheet(); go('store', +d.id) },
  back: () => go('tiendas'),
  filtro: d => { filtro = d.f; renderView() },
  hireSheet: d => openSheet('hire', +d.id),
  hire: d => act(E.hire(S, +d.id, +d.i)),
  fire: d => { const k = `fire-${d.id}-${d.i}`; if (confirmKey !== k) { confirmKey = k; renderView(); return } confirmKey = null; act(E.fire(S, +d.id, +d.i)) },
  train: d => act(E.train(S, +d.id, +d.i)),
  toggle: d => act(E.toggleMenu(S, +d.id, d.p)),
  upgrade: d => act(E.upgradeStore(S, +d.id)),
  building: d => act(E.buyBuilding(S, +d.id)),
  close: d => { const k = `close-${d.id}`; if (confirmKey !== k) { confirmKey = k; renderView(); return } confirmKey = null; act(E.closeStore(S, +d.id), () => go('tiendas')) },
  camp: d => act(E.runCampaign(S, d.region, d.c)),
  restock: d => act(E.restock(S, +d.id)),
  corpTab: d => { corpTab = d.t; renderView() },
  holdBuy: d => act(E.buyHolding(S, d.id)),
  holdToggle: d => act(E.toggleHolding(S, d.id)),
  alianza: d => act(E.alianza(S, d.id)),
  guerra: d => { const k = `war-${d.id}`; if (confirmKey !== k) { confirmKey = k; renderView(); return } confirmKey = null; act(E.guerra(S, d.id)) },
  adquirir: d => act(E.adquirir(S, d.id)),
  cedis: d => act(E.buildCedis(S, d.r)),
  expand: d => act(E.expandCedis(S, d.r)),
  corp: d => act(E.buyCorp(S, d.k)),
  rival: d => act(E.buyRival(S, d.r)),
  ipo: () => act(E.ipo(S)),
  loan: d => act(E.takeLoan(S, +d.n)),
  repay: d => act(E.repayLoan(S, d.n === 'all' ? S.loan : +d.n)),
  stockSheet: d => openSheet('stock', d.id),
  buyStock: d => { const p = S.market[d.id].price; act(E.buyStock(S, d.id, d.n === 'max' ? Math.floor(Math.max(0, S.cash) / (p * 1.0025)) : +d.n)) },
  sellStock: d => act(E.sellStock(S, d.id, d.n === 'all' ? (S.holdings[d.id]?.shares || 0) : +d.n)),
  buyProp: d => act(E.buyProperty(S, d.id)),
  sellProp: d => { const k = `sell-${d.id}`; if (confirmKey !== k) { confirmKey = k; renderView(); return } confirmKey = null; act(E.sellProperty(S, d.id)) },
  company: () => openSheet('company'),
  closeSheet: () => closeSheet(),
  comalStart: d => { comal = { id: +d.id, porc: 0, ex: { chile: true, limon: true, cebolla: true }, q: [nuevaOrden(), nuevaOrden(), nuevaOrden()], ganado: 0 }; renderView() },
  comalStop: () => { comal = null; renderView() },
  cRebanar: () => { if (comal.porc < 8) comal.porc++; renderComal() },
  cExtra: d => { comal.ex[d.x] = !comal.ex[d.x]; renderComal() },
  cDespachar: (d, el) => {
    const s = E.storeById(S, comal.id)
    if (!comal.porc) { toast('Rebana carne primero 🔪', true); return }
    const o = comal.q[0]
    const match = ['chile', 'limon', 'cebolla'].every(k => comal.ex[k] === o.e[k])
    const price = s.prices.pastor || 28
    const amount = Math.round(price * (match ? 1.15 : 1))
    E.comalSale(S, comal.id, amount)
    if (match) s.sat = Math.min(100, s.sat + 0.4); else { s.sat = Math.max(0, s.sat - 0.8); toast(`Lo quería ${extrasTxt(o.e)}`, true) }
    comal.porc--; comal.ganado += amount; o.lleva++
    if (o.lleva >= o.n) { comal.q.shift(); comal.q.push(nuevaOrden()) }
    floatAt(el, `+$${amount}`); renderTop(); renderComal()
  },
  saveNow: () => { save(); toast('Partida guardada en este navegador') },
  exportSave: async () => {
    const text = E.serialize(S)
    try { await navigator.clipboard.writeText(text); toast('Partida copiada al portapapeles') } catch { const ta = $('#export-box'); if (ta) { ta.hidden = false; ta.value = text; ta.select() } toast('Copia el texto seleccionado') }
  },
  importSave: () => {
    const ta = $('#import-box')
    if (ta.hidden) { ta.hidden = false; ta.focus(); return }
    try { S = E.deserialize(ta.value.trim()); rng = E.mulberry32(S.seed + S.day * 7919); save(); closeSheet(); go('mapa'); toast('Partida cargada') } catch { toast('Ese texto no es una partida válida', true) }
  },
  newGame: () => {
    if (confirmKey !== 'new') { confirmKey = 'new'; renderSheet(); return }
    try { localStorage.removeItem(SAVE_KEY) } catch {}
    clearInterval(timer); closeSheet(); S = null; renderIntro()
  },
  start: () => { const name = ($('#company-name')?.value || '').trim() || 'Tienda MX Inc.'; startGame(E.newGame((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, name.slice(0, 40))) },
  continue: () => { const s = loadSave(); if (s) startGame(s) },
  theme: d => { document.documentElement.dataset.theme = d.t; try { localStorage.setItem('tiendamx-theme', d.t) } catch {} }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]')
  if (el) { const fn = H[el.dataset.a]; if (fn && !el.disabled) { e.preventDefault(); fn(el.dataset, el) } return }
  if (e.target.classList?.contains('scrim')) closeSheet()
})
document.addEventListener('input', e => {
  const el = e.target
  if (el.dataset.price) {
    E.setPrice(S, +el.dataset.store, el.dataset.price, +el.value)
    const out = document.getElementById(`pv-${el.dataset.price}`); if (out) out.textContent = fmt(+el.value)
  }
})
document.addEventListener('change', e => { if (e.target.dataset.price) save() })
document.addEventListener('pointerdown', e => { if (e.target.closest('main, .sheet')) { interacting = true; clearTimeout(interactTimer) } })
const endI = () => { clearTimeout(interactTimer); interactTimer = setTimeout(() => { interacting = false }, 250) }
document.addEventListener('pointerup', endI); document.addEventListener('pointercancel', endI)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet) closeSheet()
  if (e.target.matches('input, textarea, select')) return
  if (e.key === ' ' && S && !comal) { e.preventDefault(); setSpeed(speed ? 0 : 1) }
})
document.addEventListener('visibilitychange', () => { if (document.hidden && S) save() })
window.addEventListener('pagehide', () => { if (S) save() })

// ---------- gráficas ----------
function chartSVG (series, { w = 320, h = 110, zero = true, labels = true } = {}) {
  const all = series.flatMap(s => s.values)
  if (all.length < 2) return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Sin datos"><text x="${w / 2}" y="${h / 2}" text-anchor="middle">Aún no hay datos</text></svg>`
  let min = Math.min(...all); let max = Math.max(...all)
  if (zero) { min = Math.min(min, 0); max = Math.max(max, 0) }
  if (max === min) max = min + 1
  const padT = labels ? 14 : 4; const n = Math.max(...series.map(s => s.values.length))
  const X = i => 4 + i * (w - 10) / (n - 1); const Y = v => padT + (max - v) * (h - padT - 4) / (max - min)
  let o = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfica">`
  if (zero && min < 0) o += `<line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)" stroke-dasharray="3 3"/>`
  o += `<line x1="0" x2="${w}" y1="${h - 4}" y2="${h - 4}" stroke="var(--line)"/>`
  for (const s of series) {
    const pts = s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    if (s.fill) o += `<path d="M${X(0)},${Y(Math.max(min, 0))} L${pts.join(' L')} L${X(s.values.length - 1)},${Y(Math.max(min, 0))} Z" fill="${s.color}" fill-opacity=".16"/>`
    o += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`
    o += `<circle cx="${X(s.values.length - 1)}" cy="${Y(s.values[s.values.length - 1])}" r="3.5" fill="${s.color}"/>`
  }
  if (labels) o += `<text x="4" y="10">${fmtK(max)}</text>${min < 0 ? `<text x="4" y="${h - 6}">${fmtK(min)}</text>` : ''}`
  return o + '</svg>'
}
function streetMap (region) {
  const r = E.mulberry32([...region.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))
  const w = 340; const h = 200
  let svg = `<svg class="streetmap" viewBox="0 0 ${w} ${h}" role="img" aria-label="Mapa de colonias de ${esc(region.name)}"><rect width="${w}" height="${h}" fill="var(--surface-2)"/>`
  svg += `<rect x="${20 + r() * 200}" y="${10 + r() * 90}" width="80" height="55" rx="10" fill="var(--agave)" fill-opacity=".25"/>`
  svg += `<g transform="rotate(${((r() - 0.5) * 30).toFixed(1)} ${w / 2} ${h / 2})" stroke="var(--surface)" stroke-linecap="round">`
  for (let x = -60; x < w + 60; x += 28 + r() * 16) svg += `<line x1="${x.toFixed(0)}" y1="-60" x2="${(x + (r() - 0.5) * 30).toFixed(0)}" y2="${h + 60}" stroke-width="${r() < 0.2 ? 7 : 3.5}"/>`
  for (let y = -40; y < h + 40; y += 24 + r() * 14) svg += `<line x1="-60" y1="${y.toFixed(0)}" x2="${w + 60}" y2="${(y + (r() - 0.5) * 20).toFixed(0)}" stroke-width="${r() < 0.2 ? 7 : 3.5}"/>`
  svg += '</g><defs><radialGradient id="heat"><stop offset="0" stop-color="#E0452B" stop-opacity=".7"/><stop offset=".5" stop-color="#F2B705" stop-opacity=".35"/><stop offset="1" stop-color="#F2B705" stop-opacity="0"/></radialGradient></defs>'
  const n = region.locs.length
  const pos = region.locs.map((l, i) => ({ l, x: 40 + (n === 1 ? 130 : i * (260 / (n - 1))), y: 62 + ((i * 53 + r() * 40) % 100) }))
  for (const p of pos) svg += `<circle cx="${p.x}" cy="${p.y}" r="${(14 + p.l.traffic * 24).toFixed(0)}" fill="url(#heat)"/>`
  for (const p of pos) {
    const mine = S.stores.filter(s => s.region === region.id && s.loc === p.l.id)
    const fill = mine.length ? 'var(--agave)' : 'var(--terracota)'
    const label = mine.length ? mine.map(s => GIROS[s.giro].icon).join('') : `${fmtK(p.l.rent)}/mes`
    svg += `<g data-a="openLoc" data-region="${region.id}" data-loc="${p.l.id}" style="cursor:pointer"><path d="M${p.x},${p.y} l-9,-14 a10.5,10.5 0 1 1 18,0 z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="${p.x}" cy="${p.y - 21}" r="3.6" fill="#fff"/>`
    const tw = mine.length ? mine.length * 16 + 10 : label.length * 5.6 + 12
    svg += `<rect x="${p.x - tw / 2}" y="${p.y + 4}" width="${tw}" height="17" rx="5" fill="#FFFFFF" stroke="#E1DDD4"/><text x="${p.x}" y="${p.y + 16}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2B2D33">${label}</text></g>`
  }
  return svg + '</svg>'
}

// ---------- asesores ----------
function advisor (key, text) {
  const a = ADVISORS[key]
  return `<div class="advisor"><img src="${a.img}" alt="" width="52" height="52"><p><span class="who">${a.name} · ${a.role}</span>${text}</p></div>`
}
function mainTip () {
  if (!S.stores.length) return advisor('finanzas', 'Empecemos con una <b>tienda piloto</b>. Toca el <b>Valle de México</b> en el mapa y elige colonia y giro: tiendita, cafetería o taquería.')
  const noStaff = S.stores.find(s => !s.staff.length)
  if (noStaff) return advisor('encargado', `La sucursal de <b>${esc(E.locOf(noStaff.region, noStaff.loc).name)}</b> no tiene personal. Así no vende nada.`)
  const busy = S.stores.find(s => !s.franq && s.today?.customers && s.today.lost / s.today.customers > 0.15)
  if (busy) return advisor('encargado', `En <b>${esc(storeName(busy))}</b> se fueron ${Math.round(busy.today.lost)} clientes por la fila. Contrata o sube un poco los precios.`)
  const out = S.stores.find(s => s.today?.stockout || s.today?.restocked === 'falla')
  if (out) return advisor('logistica', `¡Reabastecer! El anaquel de <b>${esc(storeName(out))}</b> está casi vacío${out.today?.restocked === 'falla' ? ' y el mayorista no llegó' : ''}. Con un CEDIS propio se resurte cada noche.`)
  if (S.cash < 0) return advisor('finanzas', '¡Números rojos! Pide un crédito en <b>Finanzas</b> o recorta costos antes de 45 días.')
  const next = PHASES[S.phase + 1]
  if (next) return advisor('finanzas', `Siguiente meta, fase ${next.n}: <b>${next.goal}</b>.`)
  return advisor('comprador', '¡Ya eres un imperio nacional! Sigue comprando plazas y franquiciando.')
}

// ---------- barra superior ----------
function renderTop () {
  const top = $('#top'); if (!top || !S) return
  const d = dateLabel(S.day); const n = S.log[0]
  top.innerHTML = `<button class="logo" data-a="company" aria-label="Empresa y ajustes">${LOGO}</button>
    <div class="cash money ${S.cash < 0 ? 'neg' : ''}">${fmt(S.cash)}<small>MXN</small></div>
    <div class="clock"><div class="date">${d.main}<span>${d.dow}</span></div>
      <div class="speeds" role="group" aria-label="Velocidad">${[[0, IC.pause, 'Pausa'], [1, IC.play, 'Normal'], [2, IC.ff, 'Rápido'], [3, IC.fff, 'Muy rápido']].map(([v, ic, l]) => `<button data-a="speed" data-s="${v}" aria-label="${l}" aria-pressed="${speed === v}">${ic}</button>`).join('')}</div></div>
    <div class="ticker">${n ? esc(n.text) : ''}</div>`
}
const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="#FFFFFF"/><path d="M6 13h20l-2-6H8z" fill="#F2B705"/><path d="M6 13h4v2a2 2 0 0 1-4 0zM10 13h4v2a2 2 0 0 1-4 0zM14 13h4v2a2 2 0 0 1-4 0zM18 13h4v2a2 2 0 0 1-4 0zM22 13h4v2a2 2 0 0 1-4 0z" fill="#D63B2F"/><rect x="8" y="16" width="16" height="10" fill="#1B4D8F"/><rect x="14" y="19" width="5" height="7" fill="#fff"/></svg>'
const IC = {
  pause: '<svg viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>',
  ff: '<svg viewBox="0 0 16 16"><path d="M1 3l7 5-7 5zM8 3l7 5-7 5z" fill="currentColor"/></svg>',
  fff: '<svg viewBox="0 0 16 16"><path d="M0 3l5 5-5 5zM5.5 3l5 5-5 5zM11 3l5 5-5 5z" fill="currentColor"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6c0 1.5-1.3 2.5-3 2.5S15 11.5 15 10c0 1.5-1.3 2.5-3 2.5S9 11.5 9 10c0 1.5-1.3 2.5-3 2.5S3 11.5 3 10z"/><path d="M10 20v-5h4v5"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  corp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 21V5l8-2v18M12 8l8 2v11M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4v16h16"/><path d="M7 15l4-4 3 3 5-6"/><path d="M15 8h4v4"/></svg>'
}

// ---------- vistas ----------
function renderView () {
  const m = $('#main'); if (!m || !S) return
  const fn = { mapa: vMapa, tiendas: vTiendas, store: vStore, logistica: vLogistica, corporativo: vCorp, finanzas: vFinanzas }[view]
  m.innerHTML = (S.over ? '<div class="over"><b>Quiebra.</b> Pasaste 45 días en números rojos. <button class="btn ghost sm" data-a="company">Empezar de nuevo</button></div>' : '') + fn()
  mountStreet()
}
function mountStreet () {
  const slot = document.getElementById('street-slot')
  if (!slot) return
  const s = E.storeById(S, viewArg)
  const key = `${s.id}-${s.tier}`
  if (!street || street.key !== key) {
    street = createStreet({ getStore: () => E.storeById(S, s.id), getDay: () => S.day, background: art(s.giro, s.tier), fmt })
    street.key = key
  }
  slot.replaceWith(street.el)
  street.start()
}
function phaseStrip () {
  return `<div class="phase-strip">${PHASES.map((p, i) => `<div class="ph ${i < S.phase ? 'done' : i === S.phase ? 'cur' : ''}"><img src="${p.img}" alt="">${p.name}</div>`).join('')}</div>
    <div class="timeline" aria-hidden="true"><i style="left:${((S.phase + E.phaseProgress(S)) / (PHASES.length - 1) * 100).toFixed(0)}%"></i></div>`
}
function vMapa () {
  const pins = REGIONS.map(r => {
    const open = S.unlocked.includes(r.id); const n = S.stores.filter(s => s.region === r.id).length
    return `<button class="pin ${open ? '' : 'locked'} ${!S.stores.length && r.id === 'vdm' ? 'pulse' : ''}" style="left:${r.x}%;top:${r.y}%" data-a="region" data-id="${r.id}" aria-label="${r.name}">
      <span class="dot">${open ? n : '🔒'}</span><span class="tag ${r.side}">${r.name}${open ? (S.cedis[r.id] ? ' · 🚚' : '') : ' · ' + fmtK(r.unlock)}</span></button>`
  }).join('')
  const ph = PHASES[S.phase]
  return `<h1 class="h-view">Red nacional</h1>${mainTip()}
    <div class="mapwrap" style="aspect-ratio:1400/684"><img src="assets/mapa.jpg" alt="Mapa de México con red de CEDIS y rutas" width="1400" height="684">${pins}</div>
    <div class="card"><div class="row between"><div><span class="h-sec" style="display:block">Fase ${ph.n} de 5</span><b>${ph.name}</b></div>
      <div style="text-align:right"><span class="sub">Patrimonio</span><br><b class="money">${fmtK(E.netWorth(S))}</b></div></div>
      ${phaseStrip()}${PHASES[S.phase + 1] ? `<span class="sub">Siguiente: ${PHASES[S.phase + 1].goal}</span>` : '<span class="sub">¡Imperio nacional completo!</span>'}</div>
    <div class="card citylist"><span class="h-sec">Regiones · reconocimiento de marca</span>
      ${REGIONS.filter(r => S.unlocked.includes(r.id)).map(r => {
        const n = S.stores.filter(s => s.region === r.id).length
        return `<div class="cityrow"><div><b>${r.name}</b> <span class="sub">· ${r.tag} · ${n} sucursal${n === 1 ? '' : 'es'}${S.cedis[r.id] ? ' · CEDIS' : ''}</span><div class="bar" style="margin-top:6px"><i style="width:${S.aware[r.id].toFixed(0)}%"></i></div></div>
        <button class="btn sm ghost" data-a="region" data-id="${r.id}">Ver</button></div>`
      }).join('')}</div>`
}
function sRegion (id) {
  const r = E.regionOf(id); const open = S.unlocked.includes(id); const season = E.seasonInfo(S.day, r)
  const head = `<div class="sheet-head"><h2>${r.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>`
  if (!open) return `${head}<p class="sub" style="margin:0">${r.tag} · ${r.locs.length} colonias</p>${streetMap(r)}
    <button class="btn full" data-a="unlock" data-id="${id}" ${S.cash < r.unlock ? 'disabled' : ''}>Expandirse a ${r.name} · ${fmt(r.unlock)}</button>
    <p class="sub" style="margin:0">Incluye permisos, estudio de mercado y rutas de proveedores.</p>`
  const active = S.campaigns.filter(c => c.region === id)
  return `${head}<div class="row" style="flex-wrap:wrap"><span class="pill blue">${r.tag}</span>${S.cedis[id] ? '<span class="pill good">CEDIS propio</span>' : ''}${S.rivals[id] ? '<span class="pill good">Rival adquirido</span>' : ''}${season.tags.map(t => `<span class="pill warn">${t}</span>`).join('')}</div>
    <div><div class="row between"><span class="sub">Reconocimiento de marca</span><b class="num">${S.aware[id].toFixed(0)} / 100</b></div><div class="bar"><i style="width:${S.aware[id].toFixed(0)}%"></i></div></div>
    ${streetMap(r)}
    <div class="row" style="gap:10px;font-size:11.5px"><span class="sub">Tráfico y competencia:</span><span class="pill">bajo</span><span class="pill warn">medio</span><span class="pill bad">alto</span></div>
    <div class="card"><span class="h-sec">Colonias</span>
      ${r.locs.map(l => {
        const mine = S.stores.filter(s => s.region === id && s.loc === l.id)
        const comp = l.comp * S.compMult[id]
        return `<div class="prop"><div><b>${l.name}</b> ${mine.map(s => `<button class="pill good" data-a="store" data-id="${s.id}" style="border:0">${GIROS[s.giro].icon} ${s.franq ? 'franq.' : 'tuya'}</button>`).join(' ')}<br>
          <span class="sub">Renta ${fmt(l.rent)}/mes · tráfico ${'▮'.repeat(Math.round(l.traffic * 3))} · competencia <span class="${comp > 0.55 ? 'bad' : comp > 0.35 ? 'warn' : 'good'}">${comp > 0.55 ? 'alta' : comp > 0.35 ? 'media' : 'baja'}</span> · poder adq. ×${l.wealth.toFixed(2)}</span></div>
          <button class="btn sm" data-a="openLoc" data-region="${id}" data-loc="${l.id}" ${mine.length >= 3 ? 'disabled' : ''}>Abrir</button></div>`
      }).join('')}</div>
    <div class="card"><span class="h-sec">Publicidad en ${r.name}</span>
      ${active.length ? `<span class="pill good">${active.length} campaña(s) · ${Math.max(...active.map(a => a.daysLeft))} días</span>` : ''}
      ${CAMPAIGNS.map(k => `<div class="prop"><div><b>${k.name}</b><br><span class="sub">${k.desc} +${k.boost} de reconocimiento en ${k.days} días</span></div>
        <button class="btn sm blue" data-a="camp" data-region="${id}" data-c="${k.id}" ${S.cash < k.cost ? 'disabled' : ''}>${fmtK(k.cost)}</button></div>`).join('')}</div>`
}
function sOpen (a) {
  const l = E.locOf(a.region, a.loc); const g = GIROS[a.giro]
  const taken = S.stores.some(s => s.region === a.region && s.loc === a.loc && s.giro === a.giro)
  return `<div class="sheet-head"><h2>${l.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="giro-tabs" role="group" aria-label="Giro">${GIRO_IDS.map(id => `<button data-a="giroPick" data-g="${id}" aria-pressed="${a.giro === id}">${GIROS[id].icon} ${GIROS[id].name}</button>`).join('')}</div>
    ${E.canFranchise(S) ? `<label class="row" style="gap:8px"><input type="checkbox" class="switch" data-a="franqPick" ${a.franq ? 'checked' : ''}> <span><b>Abrir como franquicia</b><br><span class="sub">No inviertes nada: cobras ${fmt(E.FRANQ_FEE)} de cuota y ${E.ROYALTY * 100} % de regalías diarias.</span></span></label>` : ''}
    <p class="sub" style="margin:0">Renta ${fmt(l.rent)}/mes${a.franq ? ' (la paga el franquiciatario)' : ' (se paga un mes de depósito)'}. ${taken ? `<b class="bad">Ya tienes una ${g.name.toLowerCase()} aquí.</b>` : 'Elige el formato:'}</p>
    ${g.formats.map((f, i) => {
      const cost = E.openCost(a.region, a.loc, a.giro, i + 1, a.franq)
      const prods = g.products.filter(p => p.tier === i + 1 && !p.season && !p.needs).map(p => p.name).join(', ')
      return `<div class="tier-pick"><div class="art">${art(a.giro, i + 1)}</div><div><b>${f.name}</b><br><span class="sub">${f.desc} Hasta ${f.maxStaff} ${g.staffPl.toLowerCase()}.${prods ? ` Nuevo: ${prods}.` : ''}</span></div>
        <button class="btn sm" data-a="openStore" data-region="${a.region}" data-loc="${a.loc}" data-giro="${a.giro}" data-tier="${i + 1}" data-franq="${a.franq ? 1 : 0}" ${S.cash < cost || taken ? 'disabled' : ''}>${a.franq ? 'Franquiciar' : fmtK(cost)}</button></div>`
    }).join('')}`
}
function vTiendas () {
  if (!S.stores.length) {
    return `<h1 class="h-view">Sucursales</h1>${mainTip()}<div class="card" style="align-items:flex-start"><b>Todavía no tienes sucursales.</b>
      <span class="sub">Una tiendita cuesta ${fmt(GIROS.tienda.formats[0].cost)}, un kiosco de café ${fmt(GIROS.cafe.formats[0].cost)} y un puesto de tacos ${fmt(GIROS.taqueria.formats[0].cost)}, más un mes de renta.</span>
      <button class="btn" data-a="region" data-id="vdm">Abrir en el Valle de México</button></div>`
  }
  const list = S.stores.filter(s => filtro === 'todos' || s.giro === filtro)
  const sum = k => S.stores.reduce((a, s) => a + (s.today?.[k] || 0), 0)
  return `<h1 class="h-view">Sucursales</h1>${mainTip()}
    <div class="grid3"><div class="kpi"><span>Ventas hoy</span><b>${fmtK(sum('rev'))}</b></div><div class="kpi"><span>Utilidad hoy</span><b class="${sum('profit') >= 0 ? 'good' : 'bad'}">${fmtK(sum('profit'))}</b></div><div class="kpi"><span>Clientes hoy</span><b>${Math.round(sum('served')).toLocaleString('es-MX')}</b></div></div>
    ${corteHTML()}
    <div class="giro-tabs" style="grid-template-columns:repeat(4,1fr)">${[['todos', 'Todas'], ...GIRO_IDS.map(g => [g, GIROS[g].icon + ' ' + GIROS[g].plural])].map(([f, l]) => `<button data-a="filtro" data-f="${f}" aria-pressed="${filtro === f}">${l}</button>`).join('')}</div>
    ${list.map(s => {
      const f = E.formatOf(s); const td = s.today; const al = []
      if (!s.staff.length) al.push('<span class="pill bad">Sin personal</span>')
      else if (!s.franq && td?.customers && td.lost / td.customers > 0.12) al.push(`<span class="pill warn">${Math.round(td.lost)} sin atender</span>`)
      if (td?.stockout) al.push('<span class="pill bad">¡Reabastecer!</span>')
      if (td?.covered) al.push('<span class="pill blue">CEDIS</span>')
      if (s.franq) al.push('<span class="pill blue">Franquicia</span>')
      return `<button class="store-card" data-a="store" data-id="${s.id}"><div class="art">${art(s.giro, s.tier)}</div>
        <div class="stack" style="gap:4px;min-width:0"><h3>${esc(storeName(s))}</h3><span class="sub">${E.regionOf(s.region).name} · ${f.name}</span>
        <div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill ${satClass(s.sat)}">☺ ${s.sat.toFixed(0)}</span><span class="pill">👥 ${s.staff.length}/${f.maxStaff}</span>
        <span class="pill ${td && td.profit >= 0 ? 'good' : 'bad'}">${td ? fmtK(td.profit) : '—'} hoy</span>${al.join('')}</div></div></button>`
    }).join('') || '<div class="card"><span class="sub">No tienes sucursales de este giro.</span></div>'}
    <button class="btn ghost" data-a="nav" data-v="mapa">+ Abrir otra sucursal desde el mapa</button>`
}
function comalHTML (s) {
  if (!comal || comal.id !== s.id) {
    return `<div class="comal"><b>🔥 Turno en el comal</b><span class="muted">Ponte el mandil y despacha tú mismo: cada taco bien servido se cobra al momento, con propina.</span>
      <button class="big" data-a="comalStart" data-id="${s.id}">Entrarle al trompo</button></div>`
  }
  const o = comal.q[0]
  return `<div class="comal" id="comal"><div class="row between"><b>🔥 Turno en el comal</b><button class="btn sm ghost" data-a="comalStop">Salir</button></div>
    ${comal.q.map((x, i) => `<div class="ord ${i === 0 ? 'first' : ''}"><span>${x.n}× pastor · ${extrasTxt(x.e)}</span><b>${x.lleva}/${x.n}</b></div>`).join('')}
    <div class="row between"><span class="muted">🔪 Carne rebanada: <b>${comal.porc}</b></span><span class="muted">Cobrado: <b>${fmt(comal.ganado)}</b></span></div>
    <div class="row between"><span class="muted">Salsero</span><div class="row" style="gap:6px">${[['chile', '🌶️'], ['limon', '🍋'], ['cebolla', '🧅']].map(([k, e]) => `<button class="ext" data-a="cExtra" data-x="${k}" aria-pressed="${comal.ex[k]}" aria-label="${k}">${e}</button>`).join('')}</div></div>
    <div class="grid2"><button class="btn gold" data-a="cRebanar">🔪 Rebanar</button><button class="big" data-a="cDespachar">🌮 ¡Despachar! ${fmt(s.prices.pastor || 28)}</button></div>
    <span class="muted">El primero pide: <b style="color:#FFC52E">${extrasTxt(o.e)}</b>.</span></div>`
}
function renderComal () {
  const s = E.storeById(S, comal?.id); const el = $('#comal')
  if (s && el) el.outerHTML = comalHTML(s)
}
function vStore () {
  const s = E.storeById(S, viewArg)
  if (!s) { view = 'tiendas'; return vTiendas() }
  const g = GIROS[s.giro]; const f = E.formatOf(s); const l = E.locOf(s.region, s.loc); const r = E.regionOf(s.region)
  const td = s.today || { served: 0, customers: 0, capacity: 0, profit: 0, rev: 0, sales: {} }
  const costs = E.storeDailyCosts(S, s); const season = E.seasonInfo(S.day, r)
  let hint = ''
  if (!s.staff.length) hint = `<span class="pill bad">Contrata al menos un ${g.staff.toLowerCase()} para abrir</span>`
  else if (td.stockout) hint = '<span class="pill bad">Anaquel casi vacío: se pierden ventas. ¡Reabastece!</span>'
  else if (td.customers && td.lost / td.customers > 0.1) hint = `<span class="pill warn">${Math.round(td.lost)} clientes se fueron por la fila</span>`
  const next = s.tier < 4 ? g.formats[s.tier] : null
  const head = `<button class="btn ghost sm back" data-a="back">‹ Sucursales</button>
    <div class="row between"><div><h2 class="h-view" style="font-size:20px">${l.name}</h2><span class="sub">${r.name} · ${g.name} · ${f.name}</span></div><span class="pill blue">🔴 Calle en vivo</span></div>
    <div id="street-slot"></div>${hint}
    ${s.franq ? '' : `<div class="card" style="gap:6px"><div class="row between"><span class="h-sec" style="flex:1">Anaquel · resurtido</span><b class="num ${s.stock < 25 ? 'bad' : s.stock < 50 ? 'warn' : ''}">${Math.round(s.stock ?? 100)} %</b></div>
      <div class="bar"><i style="width:${Math.round(s.stock ?? 100)}%;background:${s.stock < 25 ? 'var(--bad)' : s.stock < 50 ? 'var(--oro)' : 'var(--agave)'}"></i></div>
      <div class="row between"><span class="sub">${td.covered ? 'El CEDIS resurte cada noche.' : 'El mayorista resurte bajo 50 % (a veces falla) y cobra flete de $600.'}</span>
      <button class="btn sm gold" data-a="restock" data-id="${s.id}" ${(s.stock ?? 100) >= 95 || S.cash < E.EXPRESS_RESTOCK ? 'disabled' : ''}>Flete exprés ${fmt(E.EXPRESS_RESTOCK)}</button></div></div>`}
    <div class="grid2"><div class="kpi"><span>Clientes hoy</span><b>${Math.round(td.served)} <small class="sub">/ ${Math.round(td.customers)}</small></b></div>
      <div class="kpi"><span>${s.franq ? 'Regalía hoy' : 'Utilidad hoy'}</span><b class="${td.profit >= 0 ? 'good' : 'bad'}">${fmt(td.profit)}</b></div>
      <div class="kpi"><span>Satisfacción</span><b class="${satClass(s.sat)}">${s.sat.toFixed(0)} / 100</b></div>
      <div class="kpi"><span>Abasto</span><b>${td.covered ? 'CEDIS −25 %' : 'Mayorista'}</b></div></div>
    <div class="card"><span class="h-sec">Ventas diarias</span>${chartSVG([{ values: s.hist, color: 'var(--terracota)', fill: true }])}</div>`
  if (s.franq) {
    return head + `<div class="card"><span class="h-sec">Franquicia</span><span>La opera un franquiciatario con su propio personal. Tú cobras <b>${E.ROYALTY * 100} % de regalías</b> sobre sus ventas, sin rentas ni sueldos.</span>
      <button class="btn sm ${confirmKey === `close-${s.id}` ? '' : 'ghost'}" data-a="close" data-id="${s.id}">${confirmKey === `close-${s.id}` ? 'Toca otra vez para terminar el contrato' : 'Terminar contrato'}</button></div>`
  }
  const visible = g.products.filter(p => p.tier <= s.tier && (!p.season || season.muertos))
  return head + (s.giro === 'taqueria' && s.staff.length ? comalHTML(s) : '') + `
    <div class="card"><span class="h-sec">Gestión de precios</span>
      ${visible.map(p => {
        const ref = p.ref * l.wealth; const on = s.menu.includes(p.id); const pr = s.prices[p.id]; const locked = p.needs && !S.corp[p.needs]
        return `<div class="price-row"><label><input type="checkbox" class="switch" ${on && !locked ? 'checked' : ''} ${locked ? 'disabled' : ''} data-a="toggle" data-id="${s.id}" data-p="${p.id}" aria-label="Vender ${p.name}">${p.name}${p.season ? ' <span class="pill warn">temporada</span>' : ''}${locked ? ' <span class="pill">🔒 fase 4</span>' : ''}</label>
          <span class="val" id="pv-${p.id}">${fmt(pr)}</span>
          ${on && !locked ? `<input type="range" min="${Math.max(1, Math.round(ref * 0.5))}" max="${Math.round(ref * 2.2)}" step="1" value="${pr}" data-price="${p.id}" data-store="${s.id}" aria-label="Precio de ${p.name}">` : ''}
          <div class="meta"><span>Ref. ${fmt(ref)} · costo ${fmt(E.unitCost(S, s, p))}</span><span>${on && !locked ? `${Math.round(td.sales?.[p.id] || 0)} vendidos hoy` : 'fuera de venta'}</span></div></div>`
      }).join('')}
      ${g.products.some(p => p.tier > s.tier) ? `<span class="sub">Con mejor formato: ${g.products.filter(p => p.tier > s.tier).map(p => p.name).join(', ')}.</span>` : ''}</div>
    <div class="card"><span class="h-sec">${g.staffPl} · ${s.staff.length}/${f.maxStaff}</span>
      <div>${s.staff.map((b, i) => {
        const fk = confirmKey === `fire-${s.id}-${i}`
        return `<div class="staff"><div><span class="name">${esc(b.name)}</span> ${stars(b.skill)}<br><span class="sub">${fmt(b.salary)}/mes · atiende ~${g.serve[0] + g.serve[1] * b.skill} clientes/día</span></div>
          <div class="btns">${b.skill < 5 ? `<button class="btn sm gold" data-a="train" data-id="${s.id}" data-i="${i}" ${S.cash < E.trainCost(b) ? 'disabled' : ''}>Capacitar ${fmtK(E.trainCost(b))}</button>` : ''}
          <button class="btn sm ${fk ? '' : 'ghost'}" data-a="fire" data-id="${s.id}" data-i="${i}">${fk ? '¿Seguro?' : 'Despedir'}</button></div></div>`
      }).join('') || '<span class="sub">Nadie trabaja aquí todavía.</span>'}</div>
      <button class="btn green" data-a="hireSheet" data-id="${s.id}" ${s.staff.length >= f.maxStaff ? 'disabled' : ''}>${s.staff.length >= f.maxStaff ? 'Plantilla llena · remodela para crecer' : `Contratar ${g.staff.toLowerCase()}`}</button></div>
    <div class="card"><span class="h-sec">Costos fijos al mes</span>
      <div class="row between"><span>Renta</span><b class="money">${s.owned ? 'Inmueble propio' : fmt(costs.rent * 30)}</b></div>
      <div class="row between"><span>Sueldos</span><b class="money">${fmt(costs.wages * 30)}</b></div>
      <div class="row between"><span>Mantenimiento y servicios</span><b class="money">${fmt(costs.upkeep * 30)}</b></div></div>
    <div class="card"><span class="h-sec">Crecer</span>
      ${next ? `<div class="tier-pick"><div class="art">${art(s.giro, s.tier + 1)}</div><div><b>Remodelar a ${next.name}</b><br><span class="sub">${next.desc} Hasta ${next.maxStaff} ${g.staffPl.toLowerCase()}.</span></div>
        <button class="btn sm" data-a="upgrade" data-id="${s.id}" ${S.cash < E.upgradeCost(s) ? 'disabled' : ''}>${fmtK(E.upgradeCost(s))}</button></div>` : '<span class="pill good">Formato máximo</span>'}
      ${s.owned ? '<span class="pill good">El inmueble es tuyo: no pagas renta</span>' : `<div class="prop"><div><b>Comprar el inmueble</b><br><span class="sub">Ahorra ${fmt(l.rent)}/mes y gana plusvalía.</span></div>
        <button class="btn sm blue" data-a="building" data-id="${s.id}" ${S.cash < E.buildingPrice(s) ? 'disabled' : ''}>${fmtK(E.buildingPrice(s))}</button></div>`}
      <button class="btn sm ${confirmKey === `close-${s.id}` ? '' : 'ghost'}" data-a="close" data-id="${s.id}">${confirmKey === `close-${s.id}` ? 'Toca otra vez para cerrar (recuperas 30 % del equipo)' : 'Cerrar sucursal'}</button></div>`
}
function sHire (id) {
  const s = E.storeById(S, id); if (!s) return ''
  const g = GIROS[s.giro]; const full = s.staff.length >= E.formatOf(s).maxStaff
  return `<div class="sheet-head"><h2>Contratar ${g.staff.toLowerCase()}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    ${advisor('encargado', `Busca buena gente para <b>${esc(storeName(s))}</b>. Más estrellas atienden más rápido y mejor. Llegan candidatos nuevos cada semana.`)}
    <div class="card">${S.candidates.map((c, i) => `<div class="staff"><div><span class="name">${esc(c.name)}</span> ${stars(c.skill)}<br><span class="sub">${fmt(c.salary)}/mes · ~${g.serve[0] + g.serve[1] * c.skill} clientes/día</span></div>
      <button class="btn sm green" data-a="hire" data-id="${id}" data-i="${i}" ${full ? 'disabled' : ''}>Contratar</button></div>`).join('') || '<span class="sub">Ya contrataste a todos. Vuelve la próxima semana.</span>'}</div>
    <span class="sub">${s.staff.length}/${E.formatOf(s).maxStaff} en esta sucursal.</span><button class="btn ghost" data-a="closeSheet">Listo</button>`
}
function corteHTML () {
  const c = S.corte
  if (!c) return ''
  return `<div class="card"><div class="row between"><span class="h-sec" style="flex:1">Corte de caja · día ${c.day}</span><b class="${c.utilidad >= 0 ? 'good' : 'bad'}">${fmt(c.utilidad)}</b></div>
    <div class="grid3"><div class="kpi"><span>Ventas</span><b>${fmtK(c.ventas)}</b></div><div class="kpi"><span>Clientes</span><b>${c.clientes.toLocaleString('es-MX')}</b></div><div class="kpi"><span>Resurtidos</span><b>${c.resurtidos}${c.fallas ? ` <small class="bad">· ${c.fallas} fallas</small>` : ''}</b></div></div>
    ${c.bajos ? `<span class="pill bad">📦 ${c.bajos} sucursal${c.bajos > 1 ? 'es' : ''} por reabastecer</span>` : ''}</div>`
}
function procesosHTML () {
  const c = S.corte || {}
  const own = S.stores.filter(s => !s.franq).length
  const cedisN = Object.keys(S.cedis).length
  const st = [
    own ? `${own} sucursal${own === 1 ? '' : 'es'} compran` : 'Sin sucursales',
    cedisN ? `${cedisN} CEDIS reciben` : 'Sin CEDIS: directo del mayorista',
    `${(c.cedis || 0)} por ruta CEDIS · ${(c.resurtidos || 0) - (c.cedis || 0)} por flete`,
    c.fallas ? `${c.fallas} entregas fallaron` : `${c.resurtidos || 0} anaqueles llenos`,
    `${(c.clientes || 0).toLocaleString('es-MX')} cobros${S.corp.fintech ? ' + pagos y remesas' : ''}`,
    `Utilidad ${fmt(c.utilidad || 0)}`
  ]
  return `<div class="card"><span class="h-sec">Procesos operativos · flujo en tiempo real</span><div class="procesos">
    ${PROCESOS.map((p, i) => `<div class="proc ${i === 1 && !cedisN ? 'off' : ''} ${i === 3 && c.fallas ? 'alert' : ''}"><img src="${p.img}" alt=""><b>${p.n}. ${p.name}</b><span class="sub">${st[i]}</span></div>`).join('')}</div></div>`
}
function vLogistica () {
  const tip = !E.canBuildCedis(S) ? 'Para justificar un CEDIS necesitamos un <b>clúster urbano</b>: 8 sucursales propias en una misma región. Mientras, compramos a mayoristas y a veces no surten.'
    : !Object.keys(S.cedis).length ? '¡Ya tenemos clúster! Con un CEDIS la mercancía sale <b>25 % más barata</b> y se acaba el desabasto en las tiendas.'
      : 'Vigila la capacidad: las sucursales que no caben en el CEDIS vuelven a comprar a mayoristas.'
  return `<h1 class="h-view">Logística y CEDIS</h1>${advisor('logistica', tip)}${procesosHTML()}
    <div class="card"><span class="h-sec">Capacidad CEDIS</span>
      ${REGIONS.filter(r => S.unlocked.includes(r.id)).map(r => {
        const own = E.ownStoresIn(S, r.id).length; const cap = E.cedisCapacity(S, r.id); const use = cap ? own / cap : 0
        return `<div class="cap-row"><div><b>${r.name}</b><br><span class="sub">${own} sucursales propias${cap ? ` · capacidad ${cap}` : ''}</span></div>
          <div class="bar"><i style="width:${Math.min(100, use * 100).toFixed(0)}%;background:${use > 1 ? 'var(--bad)' : use > 0.85 ? 'var(--oro)' : 'var(--agave)'}"></i></div>
          ${S.cedis[r.id] ? `<button class="btn sm ghost" data-a="expand" data-r="${r.id}" ${S.cash < E.expandCost(S, r.id) ? 'disabled' : ''}>+${CEDIS.expandCap} · ${fmtK(E.expandCost(S, r.id))}</button>`
            : `<button class="btn sm blue" data-a="cedis" data-r="${r.id}" ${!E.canBuildCedis(S) || S.cash < CEDIS.cost ? 'disabled' : ''}>${E.canBuildCedis(S) ? `Construir ${fmtK(CEDIS.cost)}` : '🔒 Fase 2'}</button>`}</div>`
      }).join('')}
      <span class="sub">Cada CEDIS surte ${CEDIS.capacity} sucursales propias (ampliable), baja 25 % el costo de mercancía e insumos y cuesta ${fmt(CEDIS.upkeep)}/mes por nivel. Las franquicias se surten solas.</span></div>
    <div class="card"><span class="h-sec">Resurtido sin CEDIS</span><span class="sub">Sin CEDIS, el mayorista llega cuando el anaquel baja de 50 %, cobra flete de ${fmt(E.FLETE)} y 15 % de las veces no llega. Con el anaquel bajo 25 % se pierden ventas.</span>
      <div class="row between"><span>Sucursales cubiertas por CEDIS</span><b>${S.stores.filter(s => E.isCovered(S, s)).length} / ${S.stores.filter(s => !s.franq).length}</b></div></div>`
}
function vCorp () {
  const tabs = `<div class="giro-tabs">${[['expansion', 'Expansión'], ['holding', 'Marcas y Holding'], ['grupos', 'Conglomerados']].map(([t, l]) => `<button data-a="corpTab" data-t="${t}" aria-pressed="${corpTab === t}">${l}</button>`).join('')}</div>`
  const body = corpTab === 'holding' ? corpHolding() : corpTab === 'grupos' ? corpGrupos() : corpExpansion()
  return `<h1 class="h-view">Corporativo</h1>${tabs}${body}`
}
function corpExpansion () {
  const p4 = S.phase >= 3
  return `${advisor('finanzas', PHASES[S.phase + 1] ? `Meta de la fase ${PHASES[S.phase + 1].n}: <b>${PHASES[S.phase + 1].goal}</b>.` : 'Ya eres un imperio nacional.')}
    <div class="card"><span class="h-sec">Del local al imperio</span>
      ${PHASES.map((p, i) => `<div class="phase-card ${i > S.phase ? 'locked' : ''}"><img src="${p.img}" alt=""><div><b>Fase ${p.n}: ${p.name}</b> ${i < S.phase ? '<span class="pill good">✓</span>' : i === S.phase ? '<span class="pill warn">actual</span>' : '<span class="pill">🔒</span>'}
        <br><span class="sub">${i === 0 ? 'Inicio' : `Meta: ${p.goal}`}</span><ul>${p.perks.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`).join('')}</div>
    <div class="card"><span class="h-sec">Cadenas locales en venta</span>
      ${REGIONS.filter(r => S.unlocked.includes(r.id)).map(r => `<div class="prop"><div><b>Cadena local de ${r.name}</b><br><span class="sub">Compra a la competencia de la región: baja 50 % y +20 de reconocimiento.</span></div>
        ${S.rivals[r.id] ? '<span class="pill good">Adquirida</span>' : `<button class="btn sm blue" data-a="rival" data-r="${r.id}" ${!p4 || S.cash < E.RIVAL_COST ? 'disabled' : ''}>${p4 ? fmtK(E.RIVAL_COST) : '🔒 Fase 4'}</button>`}</div>`).join('')}</div>
    <div class="bmv"><div class="row between"><div><b style="font-size:20px">BMV</b><br><span class="muted">Salida a bolsa · ${esc(S.company)}</span></div>${S.ipo ? `<b class="num" style="font-size:18px">TMX $${S.ipo.price.toFixed(2)}</b>` : ''}</div>
      ${S.ipo ? chartSVG([{ values: S.ipo.hist, color: '#5CC18E', fill: true }], { h: 70, zero: false, labels: false }) + `<span class="muted">Recaudaste ${fmtK(S.ipo.raised)} por el 25 % de la empresa.</span>`
        : `<span class="muted">Vende 25 % de la empresa al público. Requiere fase 4 y patrimonio de ${fmtK(E.IPO_MIN)} (tienes ${fmtK(E.netWorth(S))}).</span>
        <button class="btn gold" data-a="ipo" ${!p4 || E.netWorth(S) < E.IPO_MIN ? 'disabled' : ''}>🔔 Tocar la campana</button>`}</div>
    <div class="card"><span class="h-sec">Franquicias</span><span class="sub">${E.canFranchise(S) ? 'Desbloqueadas: al abrir una sucursal marca “Abrir como franquicia”. No inviertes y cobras cuota más regalías.' : '🔒 Se desbloquean en la fase 4.'}</span></div>`
}
function corpHolding () {
  const p3 = S.phase >= 2; const p4 = S.phase >= 3
  return `${advisor('comprador', !p3 ? 'Cuando tengamos CEDIS propio podremos lanzar <b>Marca Propia</b>: margen alto y clientes fieles.' : !p4 ? 'Marca propia y fintech nos abren la fase 4 y el <b>holding del futuro</b>.' : 'Con el holding el negocio deja de ser solo tiendas: banco, telecom, energía y logística express.')}
    <div class="card"><span class="h-sec">Marcas propias, fintech y pagos</span>
      ${Object.entries(CORP).map(([k, c]) => `<div class="prop"><div><b>${c.name}</b><br><span class="sub">${c.desc}</span></div>
        ${S.corp[k] ? '<span class="pill good">Activo</span>' : `<button class="btn sm" data-a="corp" data-k="${k}" ${!p3 || S.cash < c.cost || (c.needs && !S.corp[c.needs]) ? 'disabled' : ''}>${p3 ? fmtK(c.cost) : '🔒 Fase 3'}</button>`}</div>`).join('')}</div>
    <div class="card"><span class="h-sec">Holding del futuro</span>
      ${HOLDING.map(h => {
        const own = S.holding[h.id]; const inc = E.holdingIncome(S, h.id)
        return `<div class="hold"><img src="${h.img}" alt=""><div><b>${h.name}</b><br><span class="sub">${h.desc}</span><br>
          <span class="sub">Cuesta ${fmtK(h.upkeep)}/mes${inc ? ` · genera ~${fmtK(inc * 30)}/mes` : ''}</span></div>
          ${own ? `<input type="checkbox" class="switch" data-a="holdToggle" data-id="${h.id}" ${own.on ? 'checked' : ''} aria-label="Encender ${h.name}">`
            : `<button class="btn sm" data-a="holdBuy" data-id="${h.id}" ${!p4 || S.cash < h.cost || (h.needs && !S.corp[h.needs]) ? 'disabled' : ''}>${p4 ? fmtK(h.cost) : '🔒 Fase 4'}</button>`}</div>`
      }).join('')}</div>`
}
function corpGrupos () {
  const mine = E.myShare(S)
  return `${advisor('finanzas', 'Los conglomerados se reparten el mercado. Alíate para ganar ventajas, cómprales acciones, hazles <b>guerra de precios</b> para quitarles mercado y, cuando bajen de 12 %, <b>adquiérelos</b>.')}
    <div class="card"><span class="h-sec">Participación de mercado</span>
      <div class="share-bar">${GROUPS.map(g => `<i style="width:${E.groupShare(S, g.id)}%;background:${g.color}" title="${g.name}"></i>`).join('')}<i style="width:${mine}%;background:var(--oro)" title="Tú"></i></div>
      <div class="row" style="flex-wrap:wrap;gap:8px;font-size:12px">${GROUPS.map(g => `<span><b style="color:${g.color}">■</b> ${g.name.replace('Grupo ', '')} ${E.groupShare(S, g.id).toFixed(0)} %</span>`).join('')}<span><b style="color:var(--oro)">■</b> Tú ${mine.toFixed(1)} %</span></div></div>
    ${GROUPS.map(g => {
      const st = S.groups[g.id]; const sh = E.groupShare(S, g.id); const m = S.market[g.ticker]
      const d = m.hist.length > 1 ? m.price / m.hist[m.hist.length - 2] - 1 : 0
      const wk = confirmKey === `war-${g.id}`
      return `<div class="card grupo" style="border-left:5px solid ${g.color}"><div class="row between"><span class="h-sec" style="flex:1">Rival · ${g.ticker}</span>
        ${st.acquired ? '<span class="pill good">Tuyo</span>' : st.war > 0 ? `<span class="pill bad">⚡ Guerra ${st.war} d</span>` : st.alliance ? '<span class="pill blue">🤝 Aliado</span>' : ''}</div>
        <h3 class="g-name">${g.name}</h3><div class="row" style="flex-wrap:wrap;gap:6px">${g.sectors.map(x => `<span class="pill">${x}</span>`).join('')}</div>
        <div class="grid2" style="align-items:center"><span><b>${g.tagline}</b><br><span class="sub">${st.acquired || st.alliance ? 'Beneficio: ' : 'Con alianza: '}${g.perkTxt}</span></span>
          <div class="stack" style="gap:4px">${g.stats.map(([k, v]) => `<div class="row" style="gap:6px;font-size:11.5px"><span style="width:76px">${k}</span><div class="bar grow"><i style="width:${v * 100}%;background:#2B4A5A"></i></div></div>`).join('')}</div></div>
        <div class="row between"><span class="sub">Mercado del ${sh.toFixed(0)} %</span><span class="num">$${m.price.toFixed(2)} <span class="${d >= 0 ? 'good' : 'bad'}">${pct(d, 2)}</span></span></div>
        <div class="bar"><i style="width:${Math.min(100, sh * 2.5)}%;background:${g.color}"></i></div>
        ${st.acquired ? '' : `<div class="acciones">
          <button class="btn sm" data-a="alianza" data-id="${g.id}" ${st.alliance || st.war > 0 || S.phase < 1 || S.cash < E.allianceCost(S, g.id) ? 'disabled' : ''}>🤝 Alianza ${S.phase < 1 ? '🔒' : fmtK(E.allianceCost(S, g.id))}</button>
          <button class="btn sm gold" data-a="stockSheet" data-id="${g.ticker}">📈 Invertir</button>
          <button class="btn sm ${wk ? 'blue' : 'ghost'}" data-a="guerra" data-id="${g.id}" ${st.war > 0 || S.cash < E.WAR_COST ? 'disabled' : ''}>${wk ? '¿Seguro? −8 % precios 30 d' : `⚡ Guerra ${fmtK(E.WAR_COST)}`}</button>
          <button class="btn sm green" data-a="adquirir" data-id="${g.id}" ${S.phase < 3 || sh > 12 || S.cash < E.acquireCost(S, g.id) ? 'disabled' : ''}>💼 M&A ${S.phase < 3 ? '🔒' : fmtK(E.acquireCost(S, g.id))}</button></div>`}</div>`
    }).join('')}`
}
function monthPL (key) {
  const L = S.ledger[key] || {}; const g = k => L[k] || 0
  const income = g('ventas') + g('regalias') + g('fintech') + g('holding') + g('rentas')
  const costs = ['mercancia', 'sueldos', 'renta', 'mantenimiento', 'logistica', 'holdingGasto', 'marketing', 'intereses', 'otros'].reduce((a, k) => a + g(k), 0)
  return { ...L, net: income - costs }
}
function vFinanzas () {
  const keys = Object.keys(S.ledger).sort(); const cur = keys[keys.length - 1]; const prev = keys[keys.length - 2]
  const A = monthPL(cur); const B = prev ? monthPL(prev) : null
  const last30 = S.hist.slice(-30).reduce((a, h) => a + h.profit, 0)
  const rows = [['Ventas', 'ventas'], ['Regalías de franquicias', 'regalias'], ['Comisiones fintech', 'fintech'], ['Ingresos del holding', 'holding'], ['Rentas cobradas', 'rentas'], ['Mercancía e insumos', 'mercancia', -1], ['Sueldos', 'sueldos', -1], ['Renta de locales', 'renta', -1], ['Mantenimiento', 'mantenimiento', -1], ['CEDIS y logística', 'logistica', -1], ['Operación del holding', 'holdingGasto', -1], ['Publicidad', 'marketing', -1], ['Intereses', 'intereses', -1], ['Otros', 'otros', -1]]
  const ml = k => { if (!k) return ''; const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y.slice(2)}` }
  const limit = E.loanLimit(S)
  const idx = E.ipc(S)
  const histIdx = S.market[STOCKS[0].id].hist.map((_, i) => STOCKS.reduce((a, s) => a + (S.market[s.id].hist[i] ?? S.market[s.id].price) / s.price, 0) / STOCKS.length * 52000)
  const ch = idx / histIdx[Math.max(0, histIdx.length - 31)] - 1
  return `<h1 class="h-view">Finanzas</h1>
    ${advisor('finanzas', S.cash < 0 ? 'Estamos en rojo. Un crédito puente nos da aire, pero cuesta 16 % anual.' : last30 < 0 ? 'Los últimos 30 días perdimos dinero. Revisa precios, personal y rentas caras.' : S.loan > 0 ? 'Vamos bien. Cuando sobre efectivo, liquida el crédito.' : 'Finanzas sanas. El efectivo ocioso puede trabajar en plazas o en la bolsa.')}
    <div class="grid2"><div class="kpi"><span>Patrimonio</span><b>${fmtK(E.netWorth(S))}</b></div><div class="kpi"><span>Efectivo</span><b class="${S.cash < 0 ? 'bad' : ''}">${fmtK(S.cash)}</b></div>
      <div class="kpi"><span>Utilidad 30 días</span><b class="${last30 >= 0 ? 'good' : 'bad'}">${fmtK(last30)}</b></div><div class="kpi"><span>Deuda</span><b>${fmtK(S.loan)}</b></div></div>
    <div class="card"><span class="h-sec">Ventas y utilidad diarias</span>${chartSVG([{ values: S.hist.map(h => h.rev), color: 'var(--terracota)', fill: true }, { values: S.hist.map(h => h.profit), color: 'var(--agave)' }], { h: 130 })}
      <div class="row" style="gap:14px"><span class="sub"><b style="color:var(--terracota)">━</b> Ventas propias</span><span class="sub"><b style="color:var(--agave)">━</b> Utilidad total</span></div></div>
    <div class="card"><span class="h-sec">Estado de resultados</span><table class="pl"><thead><tr><th>Concepto</th><th>${ml(cur)}</th>${B ? `<th>${ml(prev)}</th>` : ''}</tr></thead><tbody>
      ${rows.map(([lab, k, sg]) => `<tr><td>${lab}</td><td>${fmt((A[k] || 0) * (sg || 1))}</td>${B ? `<td>${fmt((B[k] || 0) * (sg || 1))}</td>` : ''}</tr>`).join('')}
      <tr class="total"><td>Resultado</td><td class="${A.net >= 0 ? 'good' : 'bad'}">${fmt(A.net)}</td>${B ? `<td class="${B.net >= 0 ? 'good' : 'bad'}">${fmt(B.net)}</td>` : ''}</tr>
      <tr><td class="sub">Inversiones</td><td class="sub">${fmt(A.inversiones || 0)}</td>${B ? `<td class="sub">${fmt(B.inversiones || 0)}</td>` : ''}</tr></tbody></table></div>
    <div class="card"><span class="h-sec">Crédito bancario · 16 % anual</span><div class="row between"><span>Línea disponible</span><b class="money">${fmt(Math.max(0, limit - S.loan))}</b></div>
      <div class="btns">${[100000, 500000, 2000000].map(n => `<button class="btn sm blue" data-a="loan" data-n="${n}" ${S.loan + n > limit ? 'disabled' : ''}>Pedir ${fmtK(n)}</button>`).join('')}</div>
      ${S.loan > 0 ? '<div class="btns"><button class="btn sm ghost" data-a="repay" data-n="100000">Pagar $100 k</button><button class="btn sm ghost" data-a="repay" data-n="all">Liquidar todo</button></div>' : ''}</div>
    <div class="card"><span class="h-sec">Bienes raíces y plazas</span>
      ${PROPERTIES.map(p => {
        const own = S.props.find(x => x.id === p.id); const k = confirmKey === `sell-${p.id}`
        return `<div class="prop"><div><b>${p.name}</b><br><span class="sub">${E.regionOf(p.region).name} · renta ${fmtK(p.rent)}/mes · ${own ? `vale ${fmtK(own.value)}` : `precio ${fmtK(p.price)}`}</span></div>
          ${own ? `<button class="btn sm ${k ? '' : 'ghost'}" data-a="sellProp" data-id="${p.id}">${k ? `¿Vender en ${fmtK(own.value * 0.97)}?` : 'Vender'}</button>` : `<button class="btn sm blue" data-a="buyProp" data-id="${p.id}" ${S.cash < p.price ? 'disabled' : ''}>Comprar</button>`}</div>`
      }).join('')}</div>
    <div class="bmv"><div class="row between"><div><b style="font-size:20px">BMV</b><br><span class="muted">Bolsa del juego · IPC</span></div><div style="text-align:right"><b class="num">${idx.toLocaleString('es-MX')}</b><br><span class="num" style="color:${ch >= 0 ? '#5CC18E' : '#F2786B'}">${pct(ch, 1)} 30d</span></div></div>
      ${chartSVG([{ values: histIdx, color: ch >= 0 ? '#5CC18E' : '#F2786B', fill: true }], { h: 60, zero: false, labels: false })}
      ${S.ipo ? `<div class="stock"><div><span class="tk">TMX</span> <span class="muted">${esc(S.company)}</span></div><div class="num" style="text-align:right">$${S.ipo.price.toFixed(2)}</div><span class="pill good">Tuya</span></div>` : ''}
      ${[...GROUPS.filter(g => !S.groups[g.id].acquired).map(g => ({ id: g.ticker, name: g.name })), ...STOCKS].map(s => {
        const m = S.market[s.id]; const h = S.holdings[s.id]; const d = m.hist.length > 1 ? m.price / m.hist[m.hist.length - 2] - 1 : 0
        return `<div class="stock"><div><span class="tk">${s.id}</span> <span class="muted">${s.name}</span>${h ? `<br><span class="muted">${h.shares.toLocaleString('es-MX')} acc. · ${fmtK(h.shares * m.price)}</span>` : ''}</div>
          <div class="num" style="text-align:right">$${m.price.toFixed(2)}<br><span style="color:${d >= 0 ? '#5CC18E' : '#F2786B'};font-size:12px">${pct(d, 2)}</span></div><button class="btn sm gold" data-a="stockSheet" data-id="${s.id}">Operar</button></div>`
      }).join('')}</div>`
}
function sStock (id) {
  const def = STOCKS.find(s => s.id === id) || (g => g && { id, name: g.name })(GROUPS.find(g => g.ticker === id)); const m = S.market[id]; const h = S.holdings[id]
  return `<div class="sheet-head"><h2>${id} · ${def.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="bmv"><b class="num" style="font-size:22px">$${m.price.toFixed(2)}</b>${chartSVG([{ values: m.hist, color: '#F2B705', fill: true }], { h: 90, zero: false })}</div>
    <div class="row between"><span>Tienes</span><b>${h ? `${h.shares.toLocaleString('es-MX')} acciones · ${fmt(h.shares * m.price)}` : 'Nada'}</b></div>
    <span class="h-sec">Comprar</span><div class="btns">${[10, 100, 1000].map(n => `<button class="btn sm green" data-a="buyStock" data-id="${id}" data-n="${n}" ${S.cash < n * m.price * 1.0025 ? 'disabled' : ''}>${n.toLocaleString('es-MX')} · ${fmtK(n * m.price)}</button>`).join('')}
      <button class="btn sm green" data-a="buyStock" data-id="${id}" data-n="max" ${S.cash < m.price ? 'disabled' : ''}>Todo el efectivo</button></div>
    ${h ? `<span class="h-sec">Vender</span><div class="btns">${[10, 100, 1000].filter(n => n <= h.shares).map(n => `<button class="btn sm" data-a="sellStock" data-id="${id}" data-n="${n}">${n.toLocaleString('es-MX')}</button>`).join('')}<button class="btn sm" data-a="sellStock" data-id="${id}" data-n="all">Vender todo</button></div>` : ''}`
}
function sCompany () {
  return `<div class="sheet-head"><h2>${esc(S.company)}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="grid2"><div class="kpi"><span>Patrimonio</span><b>${fmtK(E.netWorth(S))}</b></div><div class="kpi"><span>Clientes atendidos</span><b>${Math.round(S.stats.customers).toLocaleString('es-MX')}</b></div>
      <div class="kpi"><span>Sucursales</span><b>${S.stores.length}</b></div><div class="kpi"><span>Días operando</span><b>${S.day}</b></div></div>
    <div class="card"><div class="row between"><span>Prestigio nacional</span><b class="num">${S.brand.toFixed(0)} / 100</b></div><div class="bar"><i style="width:${S.brand.toFixed(0)}%;background:var(--talavera)"></i></div></div>
    <div class="card"><span class="h-sec">Noticias</span><ul class="log">${S.log.slice(0, 25).map(n => `<li><span class="d">${dateLabel(n.day).main.replace(/ \d{4}$/, '')}</span><span class="${n.kind}">${esc(n.text)}</span></li>`).join('')}</ul></div>
    <div class="card"><span class="h-sec">Partida</span>
      <div class="btns"><button class="btn sm ghost" data-a="saveNow">Guardar</button><button class="btn sm ghost" data-a="exportSave">Copiar partida</button><button class="btn sm ghost" data-a="importSave">Cargar partida</button></div>
      <textarea id="export-box" class="inp" rows="3" hidden readonly aria-label="Partida exportada"></textarea>
      <textarea id="import-box" class="inp" rows="3" hidden placeholder="Pega tu partida y toca Cargar partida otra vez" aria-label="Pegar partida"></textarea>
      <div class="btns"><span class="sub" style="align-self:center">Tema:</span><button class="btn sm ghost" data-a="theme" data-t="light">Claro</button><button class="btn sm ghost" data-a="theme" data-t="dark">Oscuro</button></div>
      <button class="btn sm ${confirmKey === 'new' ? '' : 'ghost'}" data-a="newGame">${confirmKey === 'new' ? 'Toca otra vez: se borra la partida actual' : 'Nueva partida'}</button>
      <span class="sub">Barra espaciadora: pausa. La partida se guarda sola en este navegador.</span></div>`
}
function renderSheet () {
  const root = $('#sheet-root'); if (!sheet || !root) return
  const fn = { region: sRegion, open: sOpen, hire: sHire, stock: sStock, company: sCompany }[sheet.fn]
  const prev = root.querySelector('.sheet'); const sc = prev ? prev.scrollTop : 0
  root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${fn(sheet.arg)}</div></div>`
  root.querySelector('.sheet').scrollTop = sc
}

// ---------- arranque ----------
function shell () {
  document.getElementById('root').innerHTML = `<div class="app"><header class="top" id="top"></header><main id="main"></main>
    <nav class="tabs" aria-label="Secciones">${[['mapa', 'Mapa', IC.map], ['tiendas', 'Sucursales', IC.store], ['logistica', 'CEDIS', IC.truck], ['corporativo', 'Corporativo', IC.corp], ['finanzas', 'Finanzas', IC.chart]]
      .map(([v, l, ic]) => `<button data-a="nav" data-v="${v}" aria-current="${v === view ? 'page' : 'false'}">${ic}<span>${l}</span></button>`).join('')}</nav></div><div id="sheet-root"></div>`
}
function startGame (st) {
  S = st; rng = E.mulberry32(S.seed + S.day * 7919); lastSave = S.day; view = 'mapa'
  shell(); renderTop(); go('mapa'); save(); setSpeed(S.over ? 0 : 1)
}
function renderIntro () {
  const has = !!loadSave()
  document.getElementById('root').innerHTML = `<div class="intro">
    <img src="assets/calle.jpg" alt="Calle mexicana con tiendas, metrobús y jacarandas" class="intro-hero">
    <h1 style="font-family:var(--f-display);font-weight:400;text-transform:uppercase">Tienda <em>MX</em> Inc.</h1>
    <p style="margin:0;font-size:17px">Del local al imperio. Abre tienditas, cafeterías y taquerías, arma tu red de CEDIS, lanza tu marca propia y tu fintech, y sal a la Bolsa Mexicana.</p>
    ${advisor('finanzas', 'Tienes <b>$350,000 MXN</b> de capital semilla para tu tienda piloto.')}
    ${has ? '<button class="btn full" data-a="continue">Continuar partida</button><span class="sub" style="text-align:center">o empieza una nueva:</span>' : ''}
    <div class="field"><label for="company-name">Nombre de tu empresa</label><input id="company-name" maxlength="40" value="Tienda MX Inc." autocomplete="off"></div>
    <button class="btn full ${has ? 'ghost' : ''}" data-a="start">Fundar empresa</button></div>`
}
try { const t = localStorage.getItem('tiendamx-theme'); if (t) document.documentElement.dataset.theme = t } catch {}
function boot (data) {
  if (data?.save) { try { startGame(E.deserialize(data.save)); return } catch {} }
  renderIntro()
}
window.claude?.hot?.snapshot?.(() => (S ? { save: E.serialize(S) } : {}))
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {})
