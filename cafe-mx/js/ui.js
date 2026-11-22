// Café MX Inc. — interfaz. Vistas como cadenas HTML, eventos delegados con data-a.
import * as E from './engine.js'
import {
  TIERS, PRODUCTS, CITIES, ORIGINS, CAMPAIGNS, PROPERTIES, STOCKS, ADVISORS, PHASES, MONTHS
} from './data.js'

const SAVE_KEY = 'cafemx-save-v1'
const SPEEDS = { 0: 0, 1: 1400, 2: 650, 3: 260 }
const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

let S = null
let rng = null
let speed = 1
let timer = null
let view = 'mapa'
let viewArg = null
let sheet = null
let interacting = false
let interactTimer = null
let confirmKey = null
let lastSave = 0

const $ = sel => document.querySelector(sel)

// ---------- formato ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-MX')
function fmtK (n) {
  const a = Math.abs(n); const sign = n < 0 ? '−' : ''
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2)} M`
  if (a >= 1e4) return `${sign}$${Math.round(a / 1000)} k`
  return fmt(n)
}
const pct = (v, d = 0) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)} %`
function dateLabel (day) {
  const d = E.dateOf(day)
  return { main: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, dow: DOW[d.getUTCDay()] }
}
const stars = n => `<span class="stars" aria-label="${n} de 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`
const satClass = v => v >= 65 ? 'good' : v >= 45 ? 'warn' : 'bad'

// ---------- íconos ----------
const I = {
  logo: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#FFF6EC"/><path d="M9 13h12v5a6 6 0 0 1-12 0z" fill="#D45B34"/><path d="M21 14h2a2.5 2.5 0 0 1 0 5h-2" fill="none" stroke="#D45B34" stroke-width="2"/><path d="M12 7c0 2 2 2 2 4M16 6c0 2 2 2 2 4" stroke="#D4A343" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="8" y="24" width="16" height="2" rx="1" fill="#3D2314"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>',
  ff: '<svg viewBox="0 0 16 16"><path d="M1 3l7 5-7 5zM8 3l7 5-7 5z" fill="currentColor"/></svg>',
  fff: '<svg viewBox="0 0 16 16"><path d="M0 3l5 5-5 5zM5.5 3l5 5-5 5zM11 3l5 5-5 5z" fill="currentColor"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6c0 1.5-1.3 2.5-3 2.5S15 11.5 15 10c0 1.5-1.3 2.5-3 2.5S9 11.5 9 10c0 1.5-1.3 2.5-3 2.5S3 11.5 3 10z"/><path d="M10 20v-5h4v5"/></svg>',
  bean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(35 12 12)"/><path d="M8 18c3-3 1-9 8-12"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4v16h16"/><path d="M7 15l4-4 3 3 5-6"/><path d="M15 8h4v4"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.6 0-2.6.9-2.6 2 0 2.7 5.4 1.4 5.4 4.3 0 1.2-1.1 2.1-2.8 2.1-1.2 0-2.3-.6-2.7-1.5M12 6.5v11"/></svg>',
  lock: '🔒'
}

// ---------- guardado ----------
function save () {
  try { localStorage.setItem(SAVE_KEY, E.serialize(S)); lastSave = S.day } catch {}
}
function loadSave () {
  try { const t = localStorage.getItem(SAVE_KEY); return t ? E.deserialize(t) : null } catch { return null }
}

// ---------- ciclo de juego ----------
function setSpeed (v) {
  speed = v
  clearInterval(timer)
  if (SPEEDS[v]) timer = setInterval(tick, SPEEDS[v])
  renderTop()
}
function tick () {
  if (!S || S.over) return
  E.step(S, rng)
  if (S.day - lastSave >= 5) save()
  if (S.over) { setSpeed(0); save() }
  refresh()
}
function refresh () {
  renderTop()
  if (interacting) return
  renderView()
  if (sheet?.live) renderSheet()
}
function markInteracting () {
  interacting = true
  clearTimeout(interactTimer)
}
function endInteracting () {
  clearTimeout(interactTimer)
  interactTimer = setTimeout(() => { interacting = false }, 250)
}

// ---------- acciones ----------
function act (res, after) {
  if (!res) return
  if (res.msg) toast(res.msg, !res.ok)
  if (res.ok && after) after(res)
  save()
  renderTop(); renderView(); if (sheet) renderSheet()
}
let toastTimer = null
function toast (msg, bad = false) {
  let t = $('#toast')
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
  t.className = 'toast' + (bad ? ' bad' : '')
  t.textContent = msg
  t.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { t.hidden = true }, 2600)
}

function go (v, arg = null) {
  view = v; viewArg = arg; confirmKey = null
  renderView()
  window.scrollTo(0, 0)
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.v === (v === 'store' ? 'tiendas' : v) ? 'page' : 'false'))
}
function openSheet (fn, arg = null, live = true) { sheet = { fn, arg, live }; confirmKey = null; renderSheet() }
function closeSheet () { sheet = null; $('#sheet-root').innerHTML = '' }

const handlers = {
  nav: d => go(d.v),
  speed: d => setSpeed(+d.s),
  city: d => openSheet('city', d.id),
  origin: d => { go('grano') },
  unlock: d => act(E.unlockCity(S, d.id)),
  openLoc: d => openSheet('open', { city: d.city, loc: d.loc }),
  openStore: d => act(E.openStore(S, d.city, d.loc, +d.tier), res => { closeSheet(); go('store', res.data.id); openSheet('hire', res.data.id) }),
  store: d => go('store', +d.id),
  back: () => go('tiendas'),
  hireSheet: d => openSheet('hire', +d.id),
  hire: d => act(E.hire(S, +d.id, +d.i)),
  fire: d => {
    const k = `fire-${d.id}-${d.i}`
    if (confirmKey !== k) { confirmKey = k; renderView(); return }
    confirmKey = null; act(E.fire(S, +d.id, +d.i))
  },
  train: d => act(E.train(S, +d.id, +d.i)),
  toggle: d => act(E.toggleMenu(S, +d.id, d.p)),
  upgrade: d => act(E.upgradeStore(S, +d.id)),
  building: d => act(E.buyBuilding(S, +d.id)),
  close: d => {
    const k = `close-${d.id}`
    if (confirmKey !== k) { confirmKey = k; renderView(); return }
    confirmKey = null; act(E.closeStore(S, +d.id), () => go('tiendas'))
  },
  beans: d => act(E.buyBeans(S, d.o, +d.kg)),
  finca: d => act(E.buyFinca(S, d.o)),
  camp: d => act(E.runCampaign(S, d.city, d.c)),
  loan: d => act(E.takeLoan(S, +d.n)),
  repay: d => act(E.repayLoan(S, d.n === 'all' ? S.loan : +d.n)),
  stockSheet: d => openSheet('stock', d.id),
  buyStock: d => {
    const price = S.market[d.id].price
    const n = d.n === 'max' ? Math.floor(Math.max(0, S.cash) / (price * 1.0025)) : +d.n
    act(E.buyStock(S, d.id, n))
  },
  sellStock: d => act(E.sellStock(S, d.id, d.n === 'all' ? (S.holdings[d.id]?.shares || 0) : +d.n)),
  buyProp: d => act(E.buyProperty(S, d.id)),
  sellProp: d => {
    const k = `sell-${d.id}`
    if (confirmKey !== k) { confirmKey = k; renderView(); return }
    confirmKey = null; act(E.sellProperty(S, d.id))
  },
  invest: d => act(E.investStartup(S, d.id)),
  badge: () => act(E.buyBadge(S)),
  company: () => openSheet('company'),
  closeSheet: () => closeSheet(),
  saveNow: () => { save(); toast('Partida guardada en este navegador') },
  exportSave: async () => {
    const text = E.serialize(S)
    try { await navigator.clipboard.writeText(text); toast('Partida copiada al portapapeles') } catch {
      const ta = $('#export-box'); if (ta) { ta.hidden = false; ta.value = text; ta.select() }
      toast('Copia el texto seleccionado')
    }
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
  start: () => {
    const name = ($('#company-name')?.value || '').trim() || 'Café MX Inc.'
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
    startGame(E.newGame(seed, name.slice(0, 40)))
  },
  continue: () => { const s = loadSave(); if (s) startGame(s) },
  theme: d => { document.documentElement.dataset.theme = d.t; try { localStorage.setItem('cafemx-theme', d.t) } catch {} }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]')
  if (el) {
    const fn = handlers[el.dataset.a]
    if (fn && !el.disabled) { e.preventDefault(); fn(el.dataset) }
    return
  }
  if (e.target.classList?.contains('scrim')) closeSheet()
})
document.addEventListener('input', e => {
  const el = e.target
  if (el.dataset.price) {
    const id = +el.dataset.store
    E.setPrice(S, id, el.dataset.price, +el.value)
    const out = document.getElementById(`pv-${el.dataset.price}`)
    if (out) out.textContent = fmt(+el.value)
  }
  if (el.id === 'autobuy') { S.autoBuy = el.value || null; save(); toast(el.value ? 'Autocompra activada' : 'Autocompra desactivada') }
})
document.addEventListener('pointerdown', e => { if (e.target.closest('main, .sheet')) markInteracting() })
document.addEventListener('pointerup', endInteracting)
document.addEventListener('pointercancel', endInteracting)
document.addEventListener('change', e => { if (e.target.dataset.price) save() })
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet) closeSheet()
  if (e.target.matches('input, textarea, select')) return
  if (e.key === ' ' && S) { e.preventDefault(); setSpeed(speed ? 0 : 1) }
})
document.addEventListener('visibilitychange', () => { if (document.hidden && S) save() })
window.addEventListener('pagehide', () => { if (S) save() })

// ---------- gráficas ----------
function chartSVG (series, { w = 320, h = 110, zero = true, labels = true } = {}) {
  const all = series.flatMap(s => s.values)
  if (all.length < 2) return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Sin datos aún"><text x="${w / 2}" y="${h / 2}" text-anchor="middle">Aún no hay datos</text></svg>`
  let min = Math.min(...all); let max = Math.max(...all)
  if (zero) { min = Math.min(min, 0); max = Math.max(max, 0) }
  if (max === min) max = min + 1
  const padL = labels ? 4 : 0; const padT = labels ? 14 : 4; const padB = 4
  const n = Math.max(...series.map(s => s.values.length))
  const X = i => padL + i * (w - padL - 6) / (n - 1)
  const Y = v => padT + (max - v) * (h - padT - padB) / (max - min)
  let out = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfica">`
  if (zero && min < 0) out += `<line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)" stroke-dasharray="3 3"/>`
  out += `<line x1="0" x2="${w}" y1="${h - padB}" y2="${h - padB}" stroke="var(--line)"/>`
  for (const s of series) {
    const pts = s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
    if (s.fill) out += `<path d="M${X(0)},${Y(Math.max(min, 0))} L${pts.join(' L')} L${X(s.values.length - 1)},${Y(Math.max(min, 0))} Z" fill="${s.color}" fill-opacity=".16"/>`
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    const li = s.values.length - 1
    out += `<circle cx="${X(li)}" cy="${Y(s.values[li])}" r="3.5" fill="${s.color}"/>`
  }
  if (labels) out += `<text x="${padL}" y="10">${fmtK(max)}</text>${min < 0 ? `<text x="${padL}" y="${h - 6}">${fmtK(min)}</text>` : ''}`
  return out + '</svg>'
}

// mapa de calles con calor por tráfico (generado y estable por ciudad)
function streetMap (city) {
  const r = E.mulberry32([...city.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))
  const w = 340; const h = 190
  let svg = `<svg class="streetmap" viewBox="0 0 ${w} ${h}" role="img" aria-label="Mapa de barrios de ${esc(city.name)}">`
  svg += `<rect width="${w}" height="${h}" fill="var(--surface-2)"/>`
  svg += `<rect x="${20 + r() * 200}" y="${10 + r() * 90}" width="80" height="55" rx="10" fill="var(--agave)" fill-opacity=".28"/>`
  const ang = (r() - 0.5) * 30
  svg += `<g transform="rotate(${ang.toFixed(1)} ${w / 2} ${h / 2})" stroke="var(--surface)" stroke-linecap="round">`
  for (let x = -60; x < w + 60; x += 28 + r() * 16) svg += `<line x1="${x.toFixed(0)}" y1="-60" x2="${(x + (r() - 0.5) * 30).toFixed(0)}" y2="${h + 60}" stroke-width="${r() < 0.2 ? 7 : 3.5}"/>`
  for (let y = -40; y < h + 40; y += 24 + r() * 14) svg += `<line x1="-60" y1="${y.toFixed(0)}" x2="${w + 60}" y2="${(y + (r() - 0.5) * 20).toFixed(0)}" stroke-width="${r() < 0.2 ? 7 : 3.5}"/>`
  svg += '</g><defs><radialGradient id="heat"><stop offset="0" stop-color="#E0452B" stop-opacity=".75"/><stop offset=".5" stop-color="#F0A63A" stop-opacity=".4"/><stop offset="1" stop-color="#F0D04A" stop-opacity="0"/></radialGradient></defs>'
  const n = city.locs.length
  city.locs.forEach((l, i) => {
    const x = 45 + (n === 1 ? 125 : i * (250 / (n - 1)))
    const y = 70 + ((i * 53 + r() * 40) % 90)
    l._x = x; l._y = y
    svg += `<circle cx="${x}" cy="${y}" r="${(16 + l.traffic * 26).toFixed(0)}" fill="url(#heat)"/>`
  })
  city.locs.forEach(l => {
    const mine = S.stores.find(s => s.city === city.id && s.loc === l.id)
    const fill = mine ? 'var(--agave)' : 'var(--terracota)'
    const label = mine ? 'Tu tienda' : `${fmtK(l.rent)}/mes`
    svg += `<g data-a="${mine ? 'store' : 'openLoc'}" data-id="${mine?.id || ''}" data-city="${city.id}" data-loc="${l.id}" style="cursor:pointer">`
    svg += `<path d="M${l._x},${l._y} l-9,-14 a10.5,10.5 0 1 1 18,0 z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="${l._x}" cy="${l._y - 21}" r="3.6" fill="#fff"/>`
    const tw = label.length * 5.6 + 12
    svg += `<rect x="${l._x - tw / 2}" y="${l._y + 4}" width="${tw}" height="17" rx="5" fill="#FFFBF5" stroke="#E2D2BD"/><text x="${l._x}" y="${l._y + 16}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#3D2314">${label}</text>`
    svg += '</g>'
  })
  return svg + '</svg>'
}

// ---------- asesores ----------
function advisor (key, text) {
  const a = ADVISORS[key]
  return `<div class="advisor"><img src="${a.img}" alt="" width="52" height="52"><p><span class="who">${a.name} · ${a.role}</span>${text}</p></div>`
}
function mainTip () {
  if (!S.stores.length) return advisor('finanzas', 'Empecemos en grande pero con cabeza: toca <b>CDMX</b> en el mapa y abre un kiosco. El Centro Histórico tiene renta baja y mucho tráfico.')
  const noStaff = S.stores.find(s => !s.staff.length)
  if (noStaff) return advisor('barista', `La tienda de <b>${esc(E.locOf(noStaff.city, noStaff.loc).name)}</b> no tiene baristas. Sin personal no se vende ni un café.`)
  const busy = S.stores.find(s => s.today && s.today.customers > 0 && s.today.lost / s.today.customers > 0.15)
  if (busy) return advisor('barista', `En <b>${esc(E.locOf(busy.city, busy.loc).name)}</b> se fueron ${Math.round(busy.today.lost)} clientes sin atender. Contrata otro barista o sube un poco los precios.`)
  if (S.beans.kg < S.beans.usage * 3) return advisor('tostador', 'Se nos acaba el grano, patrón. Compra en la pestaña <b>Grano</b> o activa la autocompra.')
  if (S.cash < 0) return advisor('finanzas', '¡Números rojos! Pide un crédito en <b>Finanzas</b> o recorta costos antes de 45 días.')
  const p = S.phase
  if (p < PHASES.length - 1) return advisor('finanzas', `Siguiente meta, fase ${PHASES[p + 1].n}: <b>${PHASES[p + 1].goal}</b>.`)
  return advisor('inversion', 'Ya eres el imperio del grano. Diversifica y disfruta tu cafecito.')
}

// ---------- barra superior ----------
function renderTop () {
  const top = $('#top')
  if (!top || !S) return
  const d = dateLabel(S.day)
  const news = S.log[0]
  top.innerHTML = `
    <button class="logo" data-a="company" aria-label="Empresa y ajustes">${I.logo}</button>
    <div class="cash money ${S.cash < 0 ? 'neg' : ''}" aria-live="off">${fmt(S.cash)}<small>MXN</small></div>
    <div class="clock">
      <div class="date">${d.main}<span>${d.dow}</span></div>
      <div class="speeds" role="group" aria-label="Velocidad">
        ${[[0, I.pause, 'Pausa'], [1, I.play, 'Normal'], [2, I.ff, 'Rápido'], [3, I.fff, 'Muy rápido']].map(([v, ic, l]) =>
          `<button data-a="speed" data-s="${v}" aria-label="${l}" aria-pressed="${speed === v}">${ic}</button>`).join('')}
      </div>
    </div>
    <div class="ticker" title="${news ? esc(news.text) : ''}">${news ? esc(news.text) : ''}</div>`
}

// ---------- vistas ----------
function renderView () {
  const m = $('#main')
  if (!m || !S) return
  const fn = { mapa: viewMapa, tiendas: viewTiendas, store: viewStore, grano: viewGrano, finanzas: viewFinanzas, inversiones: viewInversiones }[view]
  m.innerHTML = (S.over ? `<div class="over"><b>Quiebra.</b> Pasaste 45 días en números rojos y el banco tomó la empresa. <button class="btn ghost sm" data-a="company">Empezar de nuevo</button></div>` : '') + fn()
}

function viewMapa () {
  const pins = CITIES.map(c => {
    const open = S.unlocked.includes(c.id)
    const n = S.stores.filter(s => s.city === c.id).length
    const pulse = !S.stores.length && c.id === 'cdmx'
    return `<button class="pin ${open ? '' : 'locked'} ${pulse ? 'pulse' : ''}" style="left:${c.x}%;top:${c.y}%" data-a="city" data-id="${c.id}" aria-label="${c.name}">
      <span class="dot">${open ? n : I.lock}</span><span class="tag ${c.side}">${c.name}${open ? '' : ' · ' + fmtK(c.unlock)}</span></button>`
  }).join('') + ORIGINS.filter(o => o.x).map(o => {
    const f = S.fincas[o.id]
    return `<button class="pin origin" style="left:${o.x}%;top:${o.y}%" data-a="origin" aria-label="Origen ${o.region}"><span class="dot">${f ? '★' : '●'}</span></button>`
  }).join('')
  const nw = E.netWorth(S)
  const ph = S.phase
  const cityRows = CITIES.filter(c => S.unlocked.includes(c.id)).map(c => {
    const n = S.stores.filter(s => s.city === c.id).length
    return `<div class="cityrow"><div><b>${c.name}</b> <span class="sub">· ${c.tag} · ${n} ${n === 1 ? 'tienda' : 'tiendas'}</span>
      <div class="bar" style="margin-top:6px" title="Reconocimiento de marca"><i style="width:${S.aware[c.id].toFixed(0)}%"></i></div></div>
      <button class="btn sm ghost" data-a="city" data-id="${c.id}">Ver</button></div>`
  }).join('')
  return `
    <h1 class="h-view">Mapa de expansión</h1>
    ${mainTip()}
    <div class="mapwrap"><img src="assets/mapa.jpg" alt="Mapa de México con ciudades y regiones cafetaleras" width="1400" height="818">${pins}</div>
    <div class="card">
      <div class="row between"><div><span class="h-sec" style="display:block">Fase de expansión ${PHASES[ph].n}</span><b>${PHASES[ph].name}</b></div>
        <div style="text-align:right"><span class="sub">Patrimonio</span><br><b class="money">${fmtK(nw)}</b></div></div>
      <div class="bar"><i style="width:${((ph + 1) / PHASES.length * 100).toFixed(0)}%;background:var(--oro)"></i></div>
      ${ph < PHASES.length - 1 ? `<span class="sub">Siguiente: ${PHASES[ph + 1].goal}</span>` : '<span class="sub">¡Meta final alcanzada!</span>'}
    </div>
    <div class="card citylist"><span class="h-sec">Tus ciudades · reconocimiento de marca</span>${cityRows}</div>`
}

function sheetCity (id) {
  const c = E.cityOf(id)
  const open = S.unlocked.includes(id)
  const season = E.seasonInfo(S.day, c)
  if (!open) {
    return `<div class="sheet-head"><h2>${c.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
      <p class="sub" style="margin:0">${c.tag} · ${c.locs.length} ubicaciones disponibles</p>
      ${streetMap(c)}
      <div class="card">${c.locs.map(l => `<div class="row between"><span>${l.name}</span><span class="sub money">${fmtK(l.rent)}/mes</span></div>`).join('')}</div>
      <button class="btn full" data-a="unlock" data-id="${id}" ${S.cash < c.unlock ? 'disabled' : ''}>Expandirse a ${c.name} · ${fmt(c.unlock)}</button>
      <p class="sub" style="margin:0">Incluye permisos, estudio de mercado y bodega regional.</p>`
  }
  const active = S.campaigns.filter(x => x.city === id)
  return `<div class="sheet-head"><h2>${c.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="row" style="flex-wrap:wrap"><span class="pill blue">${c.tag}</span>${season.tags.map(t => `<span class="pill warn">${t}</span>`).join('')}</div>
    <div><div class="row between"><span class="sub">Reconocimiento de marca</span><b class="num">${S.aware[id].toFixed(0)} / 100</b></div>
    <div class="bar"><i style="width:${S.aware[id].toFixed(0)}%"></i></div></div>
    ${streetMap(c)}
    <div class="card">
      <span class="h-sec">Ubicaciones</span>
      ${c.locs.map(l => {
        const mine = S.stores.find(s => s.city === id && s.loc === l.id)
        return `<div class="prop"><div><b>${l.name}</b><br><span class="sub">Renta ${fmt(l.rent)}/mes · tráfico ${'▮'.repeat(Math.round(l.traffic * 3))} · poder adq. ×${l.wealth.toFixed(2)}</span></div>
          ${mine ? `<button class="btn sm green" data-a="store" data-id="${mine.id}">Tu tienda</button>` : `<button class="btn sm" data-a="openLoc" data-city="${id}" data-loc="${l.id}">Abrir</button>`}</div>`
      }).join('')}
    </div>
    <div class="card">
      <span class="h-sec">Publicidad en ${c.name}</span>
      ${active.length ? `<span class="pill good">${active.length} campaña(s) activa(s) · ${Math.max(...active.map(a => a.daysLeft))} días</span>` : ''}
      ${CAMPAIGNS.map(k => `<div class="prop"><div><b>${k.name}</b><br><span class="sub">${k.desc} +${k.boost} de reconocimiento en ${k.days} días</span></div>
        <button class="btn sm blue" data-a="camp" data-city="${id}" data-c="${k.id}" ${S.cash < k.cost ? 'disabled' : ''}>${fmtK(k.cost)}</button></div>`).join('')}
    </div>`
}

function sheetOpen ({ city, loc }) {
  const l = E.locOf(city, loc); const c = E.cityOf(city)
  return `<div class="sheet-head"><h2>${l.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <p class="sub" style="margin:0">${c.name} · renta ${fmt(l.rent)}/mes (se paga un mes de depósito). Elige el formato:</p>
    ${TIERS.map(t => {
      const cost = t.cost + l.rent
      const prods = PRODUCTS.filter(p => p.tier === t.id && !p.season).map(p => p.name).join(', ')
      return `<div class="tier-pick"><img src="${t.img}" alt="" width="70" height="52"><div><b>${t.name}</b><br><span class="sub">${t.desc} Hasta ${t.maxStaff} baristas. Nuevo: ${prods}.</span></div>
        <button class="btn sm" data-a="openStore" data-city="${city}" data-loc="${loc}" data-tier="${t.id}" ${S.cash < cost ? 'disabled' : ''}>${fmtK(cost)}</button></div>`
    }).join('')}`
}

function viewTiendas () {
  if (!S.stores.length) {
    return `<h1 class="h-view">Tus tiendas</h1>${mainTip()}
      <div class="card" style="align-items:flex-start"><b>Todavía no tienes tiendas.</b><span class="sub">Abre un Kiosco de Barrio desde el mapa: cuesta ${fmt(TIERS[0].cost)} más un mes de renta.</span>
      <button class="btn" data-a="city" data-id="cdmx">Abrir en CDMX</button></div>`
  }
  const rev = S.stores.reduce((a, s) => a + (s.today?.rev || 0), 0)
  const prof = S.stores.reduce((a, s) => a + (s.today?.profit || 0), 0)
  const cups = S.stores.reduce((a, s) => a + (s.today?.served || 0), 0)
  return `<h1 class="h-view">Tus tiendas</h1>${mainTip()}
    <div class="grid3"><div class="kpi"><span>Ventas hoy</span><b>${fmtK(rev)}</b></div><div class="kpi"><span>Utilidad hoy</span><b class="${prof >= 0 ? 'good' : 'bad'}">${fmtK(prof)}</b></div><div class="kpi"><span>Tazas hoy</span><b>${Math.round(cups).toLocaleString('es-MX')}</b></div></div>
    ${S.stores.map(s => {
      const t = E.tierOf(s.tier); const l = E.locOf(s.city, s.loc); const td = s.today
      const alerts = []
      if (!s.staff.length) alerts.push('<span class="pill bad">Sin baristas</span>')
      else if (td?.customers && td.lost / td.customers > 0.12) alerts.push(`<span class="pill warn">${Math.round(td.lost)} sin atender</span>`)
      if (td?.short) alerts.push('<span class="pill bad">Sin grano</span>')
      return `<button class="store-card" data-a="store" data-id="${s.id}"><img src="${t.img}" alt="" width="88" height="72">
        <div class="stack" style="gap:4px;min-width:0"><h3>${l.name}</h3><span class="sub">${E.cityOf(s.city).name} · ${t.name}</span>
        <div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill ${satClass(s.sat)}">☺ ${s.sat.toFixed(0)}</span><span class="pill">👥 ${s.staff.length}/${t.maxStaff}</span>
        <span class="pill ${td && td.profit >= 0 ? 'good' : 'bad'}">${td ? fmtK(td.profit) : '—'} hoy</span>${alerts.join('')}</div></div></button>`
    }).join('')}
    <button class="btn ghost" data-a="nav" data-v="mapa">+ Abrir otra tienda desde el mapa</button>`
}

function viewStore () {
  const s = E.storeById(S, viewArg)
  if (!s) { view = 'tiendas'; return viewTiendas() }
  const t = E.tierOf(s.tier); const l = E.locOf(s.city, s.loc); const c = E.cityOf(s.city)
  const td = s.today || { served: 0, customers: 0, capacity: 0, profit: 0, rev: 0, sales: {} }
  const costs = E.storeDailyCosts(s)
  const season = E.seasonInfo(S.day, c)
  let hint = ''
  if (!s.staff.length) hint = '<span class="pill bad">Contrata al menos un barista para abrir</span>'
  else if (td.short) hint = '<span class="pill bad">Se acabó el grano: compra en la pestaña Grano</span>'
  else if (td.customers && td.lost / td.customers > 0.1) hint = `<span class="pill warn">${Math.round(td.lost)} clientes se fueron por la fila</span>`
  const visible = PRODUCTS.filter(p => p.tier <= s.tier && (!p.season || season.muertos))
  const lockedP = PRODUCTS.filter(p => p.tier > s.tier)
  const next = s.tier < 4 ? E.tierOf(s.tier + 1) : null
  return `
    <button class="btn ghost sm back" data-a="back">‹ Tiendas</button>
    <div class="hero"><img src="${t.img}" alt="${t.name}"><div class="cap"><h2>${l.name}</h2><span>${c.name} · ${t.name}</span></div></div>
    ${hint}
    <div class="grid2">
      <div class="kpi"><span>Clientes hoy</span><b>${Math.round(td.served)} <small class="sub">/ ${Math.round(td.customers)}</small></b></div>
      <div class="kpi"><span>Capacidad</span><b>${Math.round(td.capacity || 0)} /día</b></div>
      <div class="kpi"><span>Satisfacción</span><b class="${satClass(s.sat)}">${s.sat.toFixed(0)} / 100</b></div>
      <div class="kpi"><span>Utilidad hoy</span><b class="${td.profit >= 0 ? 'good' : 'bad'}">${fmt(td.profit)}</b></div>
    </div>
    <div class="card"><div class="row between"><span class="h-sec" style="flex:1">Ingresos diarios</span><span class="sub">${s.hist.length} días</span></div>${chartSVG([{ values: s.hist, color: 'var(--terracota)', fill: true }])}</div>
    <div class="card">
      <span class="h-sec">Menú y precios</span>
      ${visible.map(p => {
        const ref = p.ref * l.wealth; const on = s.menu.includes(p.id); const pr = s.prices[p.id]
        return `<div class="price-row"><label><input type="checkbox" class="switch" ${on ? 'checked' : ''} data-a="toggle" data-id="${s.id}" data-p="${p.id}" aria-label="Vender ${p.name}">${p.name}${p.season ? ' <span class="pill warn">temporada</span>' : ''}</label>
          <span class="val" id="pv-${p.id}">${fmt(pr)}</span>
          ${on ? `<input type="range" min="${Math.max(5, Math.round(ref * 0.5))}" max="${Math.round(ref * 2.2)}" step="1" value="${pr}" data-price="${p.id}" data-store="${s.id}" aria-label="Precio de ${p.name}">` : ''}
          <div class="meta"><span>Ref. del barrio ${fmt(ref)} · costo ${fmt(p.cost * S.costMult + p.g / 1000 * S.beans.avgCost)}</span><span>${on ? `${Math.round(td.sales?.[p.id] || 0)} vendidos hoy` : 'fuera del menú'}</span></div></div>`
      }).join('')}
      ${lockedP.length ? `<span class="sub">Con mejor nivel: ${lockedP.map(p => p.name).join(', ')}.</span>` : ''}
    </div>
    <div class="card">
      <div class="row between"><span class="h-sec" style="flex:1">Personal · ${s.staff.length}/${t.maxStaff}</span></div>
      <div>${s.staff.map((b, i) => {
        const fk = confirmKey === `fire-${s.id}-${i}`
        return `<div class="staff"><div><span class="name">${esc(b.name)}</span> ${stars(b.skill)}<br><span class="sub">${fmt(b.salary)}/mes · atiende ~${35 + 14 * b.skill} clientes/día</span></div>
          <div class="btns">${b.skill < 5 ? `<button class="btn sm gold" data-a="train" data-id="${s.id}" data-i="${i}" ${S.cash < E.trainCost(b) ? 'disabled' : ''}>Capacitar ${fmtK(E.trainCost(b))}</button>` : ''}
          <button class="btn sm ${fk ? '' : 'ghost'}" data-a="fire" data-id="${s.id}" data-i="${i}">${fk ? '¿Seguro?' : 'Despedir'}</button></div></div>`
      }).join('') || '<span class="sub">Nadie trabaja aquí todavía.</span>'}</div>
      <button class="btn green" data-a="hireSheet" data-id="${s.id}" ${s.staff.length >= t.maxStaff ? 'disabled' : ''}>${s.staff.length >= t.maxStaff ? 'Plantilla llena · remodela para crecer' : 'Contratar barista'}</button>
    </div>
    <div class="card">
      <span class="h-sec">Costos fijos al mes</span>
      <div class="row between"><span>Renta</span><b class="money">${s.owned ? 'Inmueble propio' : fmt(costs.rent * 30)}</b></div>
      <div class="row between"><span>Sueldos</span><b class="money">${fmt(costs.wages * 30)}</b></div>
      <div class="row between"><span>Mantenimiento y servicios</span><b class="money">${fmt(costs.upkeep * 30)}</b></div>
    </div>
    <div class="card">
      <span class="h-sec">Crecer</span>
      ${next ? `<div class="tier-pick"><img src="${next.img}" alt="" width="70" height="52"><div><b>Remodelar a ${next.name}</b><br><span class="sub">Hasta ${next.maxStaff} baristas, más ambiente y nuevo menú${next.id === 4 ? ', y tostador propio' : ''}.</span></div>
        <button class="btn sm" data-a="upgrade" data-id="${s.id}" ${S.cash < E.upgradeCost(s) ? 'disabled' : ''}>${fmtK(E.upgradeCost(s))}</button></div>` : '<span class="pill good">Nivel máximo: Hacienda con tostador</span>'}
      ${s.owned ? '<span class="pill good">El inmueble es tuyo: no pagas renta</span>' : `<div class="prop"><div><b>Comprar el inmueble</b><br><span class="sub">Ahorra ${fmt(l.rent)}/mes de renta y gana plusvalía.</span></div>
        <button class="btn sm blue" data-a="building" data-id="${s.id}" ${S.cash < E.buildingPrice(s) ? 'disabled' : ''}>${fmtK(E.buildingPrice(s))}</button></div>`}
      <button class="btn sm ${confirmKey === `close-${s.id}` ? '' : 'ghost'}" data-a="close" data-id="${s.id}">${confirmKey === `close-${s.id}` ? 'Toca otra vez para cerrar (recuperas 30 % del equipo)' : 'Cerrar tienda'}</button>
    </div>`
}

function sheetHire (id) {
  const s = E.storeById(S, id)
  if (!s) return ''
  const t = E.tierOf(s.tier)
  const full = s.staff.length >= t.maxStaff
  return `<div class="sheet-head"><h2>Contratar</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    ${advisor('barista', `Busca buenas manos para <b>${esc(E.locOf(s.city, s.loc).name)}</b>. Más estrellas atienden más rápido y mejor. Llegan candidatos nuevos cada lunes.`)}
    <div class="card">${S.candidates.map((c, i) => `<div class="staff"><div><span class="name">${esc(c.name)}</span> ${stars(c.skill)}<br><span class="sub">${fmt(c.salary)}/mes · ~${35 + 14 * c.skill} clientes/día</span></div>
      <button class="btn sm green" data-a="hire" data-id="${id}" data-i="${i}" ${full ? 'disabled' : ''}>Contratar</button></div>`).join('') || '<span class="sub">Ya contrataste a todos. Vuelve la próxima semana.</span>'}</div>
    <span class="sub">${s.staff.length}/${t.maxStaff} baristas en esta tienda.</span>
    <button class="btn ghost" data-a="closeSheet">Listo</button>`
}

function viewGrano () {
  const b = S.beans
  const days = b.usage > 0.01 ? b.kg / b.usage : Infinity
  const q = E.effectiveQuality(S)
  const roaster = E.hasRoaster(S)
  const tip = days < 4
    ? 'Nos quedan pocos días de grano. ¡Compra ya o las tiendas dejarán de vender café!'
    : q < 0.95 ? 'El grano importado sale barato, pero la clientela lo nota. El de Chiapas y Oaxaca sube la satisfacción.'
      : roaster ? 'Con el tostador de la Hacienda pagamos 25 % menos por saco y tostamos a nuestro gusto.'
        : 'Una finca propia te da grano diario casi regalado. Y si abres una Hacienda, tendrás tostador propio.'
  const market = S.beanMult - 1
  return `<h1 class="h-view">Abasto de grano</h1>
    ${advisor('tostador', tip)}
    <div class="grid2">
      <div class="kpi"><span>Inventario</span><b>${b.kg.toFixed(0)} kg</b></div>
      <div class="kpi"><span>Alcanza para</span><b class="${days < 4 ? 'bad' : days < 8 ? 'warn' : ''}">${days === Infinity ? '—' : days.toFixed(1) + ' días'}</b></div>
      <div class="kpi"><span>Calidad del tueste</span><b>${q.toFixed(2)}</b></div>
      <div class="kpi"><span>Costo promedio</span><b>${fmt(b.avgCost)}/kg</b></div>
    </div>
    <div class="row" style="flex-wrap:wrap"><span class="pill ${market > 0.03 ? 'bad' : market < -0.03 ? 'good' : ''}">Precio del mercado ${pct(market)}</span>
      <span class="pill">Consumo ${b.usage.toFixed(1)} kg/día</span>${roaster ? '<span class="pill good">Tostador propio −25 %</span>' : ''}</div>
    <div class="card">
      <span class="h-sec">Comprar por origen</span>
      ${ORIGINS.map(o => {
        const p = E.beanPrice(S, o.id)
        return `<div class="prop"><div class="grow"><b>${o.name}</b> ${S.fincas[o.id] ? '<span class="pill good">finca propia</span>' : ''}<br>
          <span class="sub">${fmt(p)}/kg · calidad ${o.quality.toFixed(2)}</span>
          <div class="bar" style="margin-top:4px"><i style="width:${(o.quality / 1.2 * 100).toFixed(0)}%;background:var(--oro)"></i></div></div>
          <div class="btns" style="justify-content:flex-end">${[25, 100, 500].map(kg => `<button class="btn sm ghost" data-a="beans" data-o="${o.id}" data-kg="${kg}" ${S.cash < p * kg ? 'disabled' : ''}>+${kg}</button>`).join('')}</div></div>`
      }).join('')}
      <div class="field"><label for="autobuy">Autocompra cuando quedan menos de 5 días</label>
        <select id="autobuy" class="inp"><option value="">Desactivada</option>${ORIGINS.map(o => `<option value="${o.id}" ${S.autoBuy === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}</select></div>
    </div>
    <div class="card">
      <span class="h-sec">Fincas y origen</span>
      ${ORIGINS.filter(o => o.finca).map(o => {
        const lvl = S.fincas[o.id] || 0
        return `<div class="prop"><div><b>Finca en ${o.region}</b> ${lvl ? `<span class="pill good">nivel ${lvl}</span>` : ''}<br><span class="sub">${lvl ? `Produce ${o.finca.kgDay * lvl} kg/día · calidad ${(o.quality + 0.04).toFixed(2)}` : `Produciría ${o.finca.kgDay} kg/día de grano propio`}</span></div>
          ${lvl < 3 ? `<button class="btn sm green" data-a="finca" data-o="${o.id}" ${S.cash < E.fincaCost(S, o.id) ? 'disabled' : ''}>${lvl ? 'Ampliar' : 'Comprar'} ${fmtK(E.fincaCost(S, o.id))}</button>` : '<span class="pill good">Máximo</span>'}</div>`
      }).join('')}
    </div>`
}

function monthPL (key) {
  const L = S.ledger[key] || {}
  const g = k => L[k] || 0
  const costs = g('insumos') + g('grano') + g('sueldos') + g('renta') + g('mantenimiento') + g('marketing') + g('intereses') + g('otros')
  return { ...L, costs, net: g('ventas') + g('rentas') - costs }
}
function viewFinanzas () {
  const nw = E.netWorth(S)
  const keys = Object.keys(S.ledger).sort()
  const cur = keys[keys.length - 1]; const prev = keys[keys.length - 2]
  const A = monthPL(cur); const B = prev ? monthPL(prev) : null
  const last30 = S.hist.slice(-30).reduce((a, h) => a + h.profit, 0)
  const rows = [['Ventas', 'ventas'], ['Rentas cobradas', 'rentas'], ['Insumos', 'insumos', -1], ['Grano', 'grano', -1], ['Sueldos', 'sueldos', -1], ['Renta de locales', 'renta', -1], ['Mantenimiento', 'mantenimiento', -1], ['Publicidad', 'marketing', -1], ['Intereses', 'intereses', -1], ['Otros', 'otros', -1]]
  const mLabel = k => { if (!k) return ''; const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y.slice(2)}` }
  const limit = E.loanLimit(S)
  const tip = S.cash < 0 ? 'Estamos en rojo. Un crédito puente nos da aire, pero cuesta 16 % anual.'
    : last30 < 0 ? 'Los últimos 30 días perdimos dinero. Revisa precios, personal y rentas caras.'
      : S.loan > 0 ? 'Vamos bien. Cuando sobre efectivo, paga el crédito: los intereses se comen la utilidad.'
        : 'Las finanzas están sanas. El efectivo ocioso puede trabajar en Inversiones.'
  return `<h1 class="h-view">Finanzas</h1>
    ${advisor('finanzas', tip)}
    <div class="grid2">
      <div class="kpi"><span>Patrimonio</span><b>${fmtK(nw)}</b></div>
      <div class="kpi"><span>Efectivo</span><b class="${S.cash < 0 ? 'bad' : ''}">${fmtK(S.cash)}</b></div>
      <div class="kpi"><span>Utilidad 30 días</span><b class="${last30 >= 0 ? 'good' : 'bad'}">${fmtK(last30)}</b></div>
      <div class="kpi"><span>Deuda</span><b>${fmtK(S.loan)}</b></div>
    </div>
    <div class="card"><div class="row between"><span class="h-sec" style="flex:1">Ventas y utilidad diarias</span></div>
      ${chartSVG([{ values: S.hist.map(h => h.rev), color: 'var(--terracota)', fill: true }, { values: S.hist.map(h => h.profit), color: 'var(--agave)' }], { h: 130 })}
      <div class="row" style="gap:14px"><span class="sub"><b style="color:var(--terracota)">━</b> Ventas</span><span class="sub"><b style="color:var(--agave)">━</b> Utilidad (incluye grano usado)</span></div></div>
    <div class="card"><span class="h-sec">Estado de resultados</span>
      <table class="pl"><thead><tr><th>Concepto</th><th>${mLabel(cur)}</th>${B ? `<th>${mLabel(prev)}</th>` : ''}</tr></thead><tbody>
      ${rows.map(([lab, k, sign]) => `<tr><td>${lab}</td><td>${fmt((A[k] || 0) * (sign || 1))}</td>${B ? `<td>${fmt((B[k] || 0) * (sign || 1))}</td>` : ''}</tr>`).join('')}
      <tr class="total"><td>Resultado</td><td class="${A.net >= 0 ? 'good' : 'bad'}">${fmt(A.net)}</td>${B ? `<td class="${B.net >= 0 ? 'good' : 'bad'}">${fmt(B.net)}</td>` : ''}</tr>
      <tr><td class="sub">Inversiones (tiendas, inmuebles, fincas)</td><td class="sub">${fmt(A.inversiones || 0)}</td>${B ? `<td class="sub">${fmt(B.inversiones || 0)}</td>` : ''}</tr>
      </tbody></table></div>
    <div class="card"><span class="h-sec">Crédito bancario · 16 % anual</span>
      <div class="row between"><span>Línea disponible</span><b class="money">${fmt(Math.max(0, limit - S.loan))}</b></div>
      <div class="btns">${[100000, 500000, 2000000].map(n => `<button class="btn sm blue" data-a="loan" data-n="${n}" ${S.loan + n > limit ? 'disabled' : ''}>Pedir ${fmtK(n)}</button>`).join('')}</div>
      ${S.loan > 0 ? `<div class="btns"><button class="btn sm ghost" data-a="repay" data-n="100000">Pagar ${fmtK(100000)}</button><button class="btn sm ghost" data-a="repay" data-n="all">Liquidar todo</button></div>` : ''}
    </div>`
}

function viewInversiones () {
  const idx = E.ipc(S)
  const histIdx = S.market[STOCKS[0].id].hist.map((_, i) => STOCKS.reduce((a, s) => a + (S.market[s.id].hist[i] ?? S.market[s.id].price) / s.price, 0) / STOCKS.length * 52000)
  const ch30 = histIdx.length > 30 ? idx / histIdx[histIdx.length - 31] - 1 : idx / histIdx[0] - 1
  const portfolio = Object.entries(S.holdings).reduce((a, [id, h]) => a + h.shares * S.market[id].price, 0)
  return `<h1 class="h-view">Inversiones</h1>
    ${advisor('inversion', S.ventures.length ? `Tienes ${S.ventures.length} startup(s) en cartera. Paciencia: unas fracasan y otras pagan por todas.` : 'El café paga las cuentas; los inmuebles y la bolsa hacen el patrimonio. Diversifica, mijo.')}
    <div class="bmv">
      <div class="row between"><div><b style="font-size:20px">BMV</b><br><span class="muted">Bolsa del juego · índice IPC</span></div>
        <div style="text-align:right"><b class="num" style="font-size:18px">${idx.toLocaleString('es-MX')}</b><br><span class="num" style="color:${ch30 >= 0 ? '#6CC08F' : '#F07A6A'}">${pct(ch30, 1)} 30d</span></div></div>
      ${chartSVG([{ values: histIdx, color: ch30 >= 0 ? '#6CC08F' : '#F07A6A', fill: true }], { h: 70, zero: false, labels: false })}
      ${STOCKS.map(s => {
        const m = S.market[s.id]; const h = S.holdings[s.id]
        const d = m.hist.length > 1 ? m.price / m.hist[m.hist.length - 2] - 1 : 0
        return `<div class="stock"><div><span class="tk">${s.id}</span> <span class="muted">${s.name}</span>${h ? `<br><span class="muted">${h.shares.toLocaleString('es-MX')} acc. · ${fmtK(h.shares * m.price)} (${pct(h.shares * m.price / h.cost - 1)})</span>` : ''}</div>
          <div class="num" style="text-align:right">$${m.price.toFixed(2)}<br><span style="color:${d >= 0 ? '#6CC08F' : '#F07A6A'};font-size:12px">${pct(d, 2)}</span></div>
          <button class="btn sm gold" data-a="stockSheet" data-id="${s.id}">Operar</button></div>`
      }).join('')}
      <span class="muted">Portafolio: ${fmt(portfolio)} · comisión 0.25 % por operación</span>
    </div>
    <div class="card"><span class="h-sec">Bienes raíces</span>
      ${PROPERTIES.map(p => {
        const own = S.props.find(x => x.id === p.id)
        const k = confirmKey === `sell-${p.id}`
        return `<div class="prop"><div><b>${p.name}</b><br><span class="sub">${E.cityOf(p.city).name} · renta ${fmtK(p.rent)}/mes${p.tourism ? ' (temporada)' : ''} · ${own ? `vale ${fmtK(own.value)}` : `precio ${fmtK(p.price)}`}</span></div>
          ${own ? `<button class="btn sm ${k ? '' : 'ghost'}" data-a="sellProp" data-id="${p.id}">${k ? `¿Vender en ${fmtK(own.value * 0.97)}?` : 'Vender'}</button>` : `<button class="btn sm blue" data-a="buyProp" data-id="${p.id}" ${S.cash < p.price ? 'disabled' : ''}>Comprar</button>`}</div>`
      }).join('')}
    </div>
    <div class="card"><span class="h-sec">Startups · capital de riesgo</span>
      ${S.pitches.map(p => `<div class="prop"><div><b>${esc(p.name)}</b> <span class="pill blue">${p.sector}</span><br><span class="sub">Piden ${fmtK(p.ask)} · riesgo ${E.riskLabel(p.odds)} · hasta ×${p.multiple} · ${p.months} meses</span></div>
        <button class="btn sm" data-a="invest" data-id="${p.id}" ${S.cash < p.ask ? 'disabled' : ''}>Invertir</button></div>`).join('') || '<span class="sub">Nuevas propuestas el día 1 de cada mes.</span>'}
      ${S.ventures.length ? `<span class="h-sec">En cartera</span>${S.ventures.map(v => `<div class="row between"><span>${esc(v.name)} <span class="sub">· ${fmtK(v.ask)}</span></span><span class="pill">${Math.ceil((v.resolveDay - S.day) / 30)} meses</span></div>`).join('')}` : ''}
    </div>`
}

function sheetStock (id) {
  const def = STOCKS.find(s => s.id === id); const m = S.market[id]; const h = S.holdings[id]
  return `<div class="sheet-head"><h2>${id} · ${def.name}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="bmv"><div class="row between"><b class="num" style="font-size:22px">$${m.price.toFixed(2)}</b><span class="muted">90 días</span></div>
      ${chartSVG([{ values: m.hist, color: '#D4A343', fill: true }], { h: 90, zero: false })}</div>
    <div class="row between"><span>Tienes</span><b>${h ? `${h.shares.toLocaleString('es-MX')} acciones · ${fmt(h.shares * m.price)}` : 'Nada'}</b></div>
    <span class="h-sec">Comprar</span>
    <div class="btns">${[10, 100, 1000].map(n => `<button class="btn sm green" data-a="buyStock" data-id="${id}" data-n="${n}" ${S.cash < n * m.price * 1.0025 ? 'disabled' : ''}>${n.toLocaleString('es-MX')} · ${fmtK(n * m.price)}</button>`).join('')}
      <button class="btn sm green" data-a="buyStock" data-id="${id}" data-n="max" ${S.cash < m.price ? 'disabled' : ''}>Todo el efectivo</button></div>
    ${h ? `<span class="h-sec">Vender</span><div class="btns">${[10, 100, 1000].filter(n => n <= h.shares).map(n => `<button class="btn sm" data-a="sellStock" data-id="${id}" data-n="${n}">${n.toLocaleString('es-MX')}</button>`).join('')}
      <button class="btn sm" data-a="sellStock" data-id="${id}" data-n="all">Vender todo</button></div>` : ''}`
}

function sheetCompany () {
  const nw = E.netWorth(S)
  return `<div class="sheet-head"><h2>${esc(S.company)}</h2><button class="x" data-a="closeSheet" aria-label="Cerrar">×</button></div>
    <div class="grid2"><div class="kpi"><span>Patrimonio</span><b>${fmtK(nw)}</b></div><div class="kpi"><span>Tazas servidas</span><b>${Math.round(S.stats.cups).toLocaleString('es-MX')}</b></div>
      <div class="kpi"><span>Mejor día</span><b>${fmtK(S.stats.bestDay)}</b></div><div class="kpi"><span>Días operando</span><b>${S.day}</b></div></div>
    <div class="card"><span class="h-sec">Marca y cultura</span>
      <div class="row between"><span>Prestigio nacional</span><b class="num">${S.brand.toFixed(0)} / 100</b></div><div class="bar"><i style="width:${S.brand.toFixed(0)}%;background:var(--talavera)"></i></div>
      ${S.badge ? '<span class="pill good">Distintivo Café Sostenible y Comercio Justo</span>' : `<div class="prop"><div><b>Distintivo Café Sostenible</b><br><span class="sub">+5 % clientes y más prestigio. Requiere grano de calidad ≥ 1.00 o finca propia.</span></div>
        <button class="btn sm green" data-a="badge" ${S.cash < E.BADGE_COST ? 'disabled' : ''}>${fmtK(E.BADGE_COST)}</button></div>`}</div>
    <div class="card"><span class="h-sec">Fases de expansión</span><div class="phases">
      ${PHASES.map((p, i) => `<div class="phase ${i < S.phase ? 'done' : i === S.phase ? 'cur' : ''}"><span class="n">${p.n}</span><div><b>${p.name}</b><br><span class="sub">${p.goal}</span></div></div>`).join('')}</div></div>
    <div class="card"><span class="h-sec">Noticias</span><ul class="log">${S.log.slice(0, 25).map(n => `<li><span class="d">${dateLabel(n.day).main.replace(/ \d{4}$/, '')}</span><span class="${n.kind}">${esc(n.text)}</span></li>`).join('')}</ul></div>
    <div class="card"><span class="h-sec">Partida</span>
      <div class="btns"><button class="btn sm ghost" data-a="saveNow">Guardar</button><button class="btn sm ghost" data-a="exportSave">Copiar partida</button><button class="btn sm ghost" data-a="importSave">Cargar partida</button></div>
      <textarea id="export-box" class="inp" rows="3" hidden readonly aria-label="Partida exportada"></textarea>
      <textarea id="import-box" class="inp" rows="3" hidden placeholder="Pega aquí tu partida y toca Cargar partida otra vez" aria-label="Pegar partida"></textarea>
      <div class="btns"><span class="sub" style="align-self:center">Tema:</span>${[['light', 'Claro'], ['dark', 'Oscuro']].map(([t, l]) => `<button class="btn sm ghost" data-a="theme" data-t="${t}">${l}</button>`).join('')}</div>
      <button class="btn sm ${confirmKey === 'new' ? '' : 'ghost'}" data-a="newGame">${confirmKey === 'new' ? 'Toca otra vez: se borra la partida actual' : 'Nueva partida'}</button>
      <span class="sub">Barra espaciadora: pausa. La partida se guarda sola en este navegador.</span></div>`
}

function renderSheet () {
  const root = $('#sheet-root')
  if (!sheet || !root) return
  const fn = { city: sheetCity, open: sheetOpen, hire: sheetHire, stock: sheetStock, company: sheetCompany }[sheet.fn]
  const prev = root.querySelector('.sheet')
  const scroll = prev ? prev.scrollTop : 0
  root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true"><span class="grab"></span>${fn(sheet.arg)}</div></div>`
  root.querySelector('.sheet').scrollTop = scroll
}

// ---------- arranque ----------
function shell () {
  document.getElementById('root').innerHTML = `
    <div class="app">
      <header class="top" id="top"></header>
      <main id="main"></main>
      <nav class="tabs" aria-label="Secciones">
        ${[['mapa', 'Mapa', I.map], ['tiendas', 'Tiendas', I.store], ['grano', 'Grano', I.bean], ['finanzas', 'Finanzas', I.chart], ['inversiones', 'Inversiones', I.coin]]
          .map(([v, l, ic]) => `<button data-a="nav" data-v="${v}" aria-current="${v === view ? 'page' : 'false'}">${ic}<span>${l}</span></button>`).join('')}
      </nav>
    </div>
    <div id="sheet-root"></div>`
}
function startGame (state) {
  S = state
  rng = E.mulberry32(S.seed + S.day * 7919)
  lastSave = S.day
  view = 'mapa'
  shell()
  renderTop(); go('mapa')
  save()
  setSpeed(S.over ? 0 : 1)
}
function renderIntro () {
  const has = !!loadSave()
  document.getElementById('root').innerHTML = `
    <div class="intro">
      <div class="tile" role="img" aria-label="Mosaico de talavera"></div>
      <h1>Café <em>MX</em> Inc.</h1>
      <p style="margin:0;font-size:17px">Del grano al imperio. Abre un kiosco en la Ciudad de México, contrata baristas, compra fincas en Chiapas y Oaxaca y conquista el país.</p>
      ${advisor('finanzas', 'Tienes <b>$300,000 MXN</b> de capital semilla. Úsalos con cabeza.')}
      ${has ? '<button class="btn full" data-a="continue">Continuar partida</button><span class="sub" style="text-align:center">o empieza una nueva:</span>' : ''}
      <div class="field"><label for="company-name">Nombre de tu empresa</label><input id="company-name" maxlength="40" value="Café MX Inc." autocomplete="off"></div>
      <button class="btn full ${has ? 'ghost' : ''}" data-a="start">Fundar empresa</button>
    </div>`
}

try { const t = localStorage.getItem('cafemx-theme'); if (t) document.documentElement.dataset.theme = t } catch {}
function boot (data) {
  if (data?.save) { try { startGame(E.deserialize(data.save)); return } catch {} }
  renderIntro()
}
window.claude?.hot?.snapshot?.(() => (S ? { save: E.serialize(S) } : {}))
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {})

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.claude) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
