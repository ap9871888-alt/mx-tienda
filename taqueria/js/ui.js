// Taquería Tycoon — interfaz. Cada pestaña se dibuja completa al entrar o al cambiar algo estructural;
// los números que se mueven cada décima de segundo se actualizan en su lugar (data-k) para no romper los toques.
import * as E from './engine.js'
import * as A from './audio.js'

const SAVE_KEY = 'taqueria-tycoon-v1'
const SAMPLES = ['¡Saaabor!', '¡Tacubaya!', '¡Con todo!', '¡Música Maestro!']
const CARAS = ['🧑', '👩', '👨‍🦳', '👱‍♀️', '🧔', '👵', '👷', '👮', '🧑‍🎓', '💁‍♀️', '🧑‍🔧', '🤠']
let S, rng, tab = 'comal', modal = null, sonideroOn = false, lastT = 0, saveAcc = 0, filaSig = '', pedSig = ''
const $ = s => document.querySelector(s)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const mxn = n => (n < 0 ? '−$' : '$') + Math.floor(Math.abs(n)).toLocaleString('es-MX')

function save () { try { localStorage.setItem(SAVE_KEY, E.serialize(S)) } catch {} }
function load () { try { const t = localStorage.getItem(SAVE_KEY); return t ? E.deserialize(t) : null } catch { return null } }

// ---------- avisos ----------
let toastT
function toast (msg, bad = false) {
  if (!msg) return
  let t = $('#toast')
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
  t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; t.hidden = false
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true }, 2200)
}
function floatAt (el, text) {
  const r = el?.getBoundingClientRect(); if (!r) return
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text
  f.style.left = `${r.left + r.width / 2 - 30}px`; f.style.top = `${r.top - 6}px`
  document.body.appendChild(f); setTimeout(() => f.remove(), 950)
}
function bocadillo (text) {
  const b = document.createElement('div'); b.className = 'bocadillo'; b.textContent = text
  document.body.appendChild(b); setTimeout(() => b.remove(), 1450)
}
function act (res, okSound) {
  if (!res) return res
  if (res.ok) { okSound?.(); if (res.msg) toast(res.msg) } else { A.bad(); toast(res.msg, true) }
  draw(); save()
  return res
}

// ---------- HUD ----------
function hud () {
  const sd = E.sedeOf(S.sede)
  return `<div class="picado" aria-hidden="true"></div>
  <header class="hud">
    <div class="brand"><h1>🌮 TAQUERÍA TYCOON</h1>
      <div class="toggles">
        <button class="chip" data-a="fx" aria-pressed="${A.fxEnabled()}">🔊 FX</button>
        <button class="chip" data-a="sonidero" aria-pressed="${sonideroOn}">📻 SONIDERO ${sonideroOn ? 'ON' : 'OFF'}</button>
        <button class="chip" data-a="evento">🎲 EVENTO</button>
      </div></div>
    <div class="sede-row">
      <button class="chip" data-a="sedes">📍 ${sd.name} (${sd.lugar.split(' / ')[0]}) · 🗺️ CAMBIAR</button>
      <div class="clock"><b data-k="dia">DÍA ${S.day}</b><span class="num" data-k="hora">${E.hora(S)} hrs</span></div>
    </div>
    <div class="row between"><span class="comal-st" data-k="comal">● COMAL ACTIVO</span><span class="sub" data-k="rush"></span></div>
    <div class="stats">
      <div class="stat cash"><span>💵 Capital</span><b data-k="cash">${mxn(S.cash)}</b></div>
      <div class="stat"><span>🏦 Cuenta</span><b data-k="bank">${mxn(S.bank)}</b></div>
      <div class="stat"><span>⚡ Pasivo</span><b data-k="pas">+$0/s</b></div>
      <div class="stat"><span>⭐ Reput.</span><b data-k="rep">${S.rep.toFixed(1)} ★</b></div>
    </div>
    <div class="stock">
      <span class="chip" data-k="carne">🥩 ${S.carne.toFixed(1)} kg</span>
      <span class="chip" data-k="tort">🫓 ${S.tortillas}</span>
      <span class="chip" data-k="salsa">🌶️ ${Math.round(S.salsa)}%</span>
      <button class="chip" data-a="tab" data-t="abasto">🛒 ABASTO</button>
    </div>
    ${tab !== 'comal' ? '' : `<div class="sampler"><span>🎙️ SAMPLER:</span>${SAMPLES.map(s => `<button data-a="sample" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>`}
  </header>
  ${tab === 'comal' ? `<p class="grito">🌶️ “${sd.grito}”</p>` : ''}`
}

// ---------- pestañas ----------
function tabComal () {
  const recs = E.RECETAS.filter(r => r.sede === S.sede)
  return `<section class="panel ${S.comalOff > 0 ? 'off' : ''}" id="station">
    <div class="station">
      <div class="trompo-wrap ${S.comalOff > 0 ? 'off' : ''}">
        <span class="porciones" data-k="porc">🔪 ${S.porciones}</span>
        <div class="glow"></div><span class="pina-top" id="pina-top">🍍</span><div class="trompo" role="img" aria-label="Trompo girando"></div><div class="espada"></div>
      </div>
      <div class="controls">
        <div class="status"><span>🟢 ${S.sede === 'cdmx' ? 'EL TROMPO CHILANGO' : S.sede === 'mty' ? 'EL ASADOR REGIO' : 'LA OLLA TAPATÍA'}</span><span data-k="temp">🔥 COMAL A 240°C</span></div>
        <div class="ctrl2">
          <button class="btn sm pinabtn" data-a="pina" aria-pressed="${S.pina}" ${S.sede !== 'cdmx' ? 'disabled title="Solo para pastor"' : ''}>🍍 PIÑA</button>
          <button class="btn sm yel" data-a="rebanar">🔪 Rebanar</button>
        </div>
        <button class="btn go despachar" data-a="despachar" id="btn-desp">🌮 ¡DESPACHAR!</button>
        <div class="precio" data-k="precio"></div>
        <div class="salsero"><span>🫙 Salsero</span>
          ${[['chile', '🌶️'], ['limon', '🍋'], ['cebolla', '🧅']].map(([k, e]) => `<button class="ext" data-a="extra" data-x="${k}" aria-pressed="${S.extras[k]}" aria-label="${k}">${e}</button>`).join('')}</div>
      </div>
    </div>
    <div class="rushbar"><button class="btn pink sm" data-a="rush" data-k="rushbtn">⚡ RUSH (X2)</button><span class="sub">Pagos dobles 20 s. Úsalo con la fila llena.</span></div>
  </section>
  <section class="panel"><div class="row between"><h2>👥 FILA EN BANQUETA</h2><span class="pill hot" data-k="filan">(${S.fila.length}/${E.MAX_FILA})</span></div>
    <p class="lead">Despacha tacos al primero de la fila. Arma el salsero como lo pide y te deja propina.</p>
    <div class="fila" id="fila">${filaHTML()}</div></section>
  <section class="panel"><h2>👨‍🍳 EQUIPO EN TURNO</h2>
    <div class="item"><span class="ico">👨‍🍳</span><div><b>Don Beto <span class="lv">Nv.${S.betoLvl}</span></b><span class="sub">Rebana solo cada ${E.betoIntervalo(S).toFixed(1)} s · corta piña al vuelo</span></div>
      <button class="btn sm yel" data-a="beto" ${S.betoLvl >= 8 ? 'disabled' : ''}>${S.betoLvl >= 8 ? 'MÁX' : `MEJORAR ${mxn(E.costoBeto(S))}`}</button></div>
    <div class="item"><span class="ico">🛵</span><div><b>El Brayan <span class="lv">Moto Nv.${S.motoLvl}</span></b><span class="sub" data-k="brayan">${S.entrega ? 'En ruta' : 'LISTO para entregas'}</span></div>
      <button class="btn sm yel" data-a="moto" ${S.motoLvl >= 5 ? 'disabled' : ''}>${S.motoLvl >= 5 ? 'MÁX' : `MOTO ${mxn(E.costoMoto(S))}`}</button></div>
  </section>
  <section class="panel"><h2>🌮 RECETARIO</h2><p class="lead">Mejora para ganar más por taco y subir el pasivo de la sede.</p>
    ${E.RECETAS.map(r => {
      const lvl = S.recetas[r.id]; const abierta = S.sedes[r.sede]; const c = E.costoMejora(S, r.id)
      return `<div class="item"><span class="ico">${r.icon}</span><div><b>${r.name} <span class="lv">${E.sedeOf(r.sede).name.slice(0, 4).toUpperCase()} Nv.${lvl}</span></b><span class="sub">${r.desc}${lvl ? ` · $${E.precio(S, r.id)}/taco` : ''}</span></div>
        ${!abierta ? `<span class="pill no">Abre ${E.sedeOf(r.sede).name}</span>` : lvl >= 10 ? '<span class="pill ok">MÁX</span>' : `<button class="btn sm ${lvl ? 'yel' : 'pink'}" data-a="receta" data-id="${r.id}">${lvl ? 'MEJORAR' : 'DESBLOQUEAR'} ${mxn(c)}</button>`}</div>`
    }).join('')}
    ${recs.every(r => !S.recetas[r.id]) ? '' : ''}
  </section>`
}
function filaHTML () {
  if (!S.fila.length) return '<div class="vacio">La banqueta está tranquila… grita con el sampler 🎙️</div>'
  return S.fila.map((c, i) => {
    const r = E.recetaOf(c.receta)
    return `<div class="cliente ${i === 0 ? 'first' : ''}"><span class="av">${CARAS[c.id % CARAS.length]}</span>
      <div><b>${esc(c.name)}</b> <span class="ord">${i === 0 ? '· atendiendo' : ''}</span><div class="ord">${c.quiere}× ${r.name.split(' ').slice(0, 3).join(' ')} · ${E.describeExtras(c.extras)}</div>
      <div class="pac"><i data-pac="${c.id}" style="width:${(c.paciencia / c.max * 100).toFixed(0)}%"></i></div></div>
      <span class="pill hot">${c.lleva}/${c.quiere}</span></div>`
  }).join('')
}
function tabAbasto () {
  return `<section class="panel"><h2>🏬 MAYOREO & CENTRAL DE ABASTO</h2><p class="lead">Precios de mayoreo para que nunca pares el comal.</p>
    ${E.ABASTO.map(a => `<div class="item"><span class="ico">${a.icon}</span><div><b>${a.name}</b><span class="sub">${a.desc}<br>${a.efecto}</span></div>
      <button class="btn sm go" data-a="comprar" data-id="${a.id}">${a.id === 'carne' ? 'SURTIR' : 'COMPRAR'} ${mxn(E.precioAbasto(S, a.id))}</button></div>`).join('')}
    <span class="sub">Cada taco lleva ${E.TORTILLAS_POR_TACO} tortillas (con copia) y ${E.CARNE_POR_PORCION * 1000} g de carne. La salsa baja 1 % por taco picoso.</span>
  </section>`
}
function tabEntregas () {
  return `<section class="panel"><h2>🛵 APPS DE ENTREGA</h2><p class="lead">Pedidos grandes desde ${E.sedeOf(S.sede).name}. El Brayan lleva uno a la vez.</p>
    <div class="item"><span class="ico">🛵</span><div><b>El Brayan</b><span class="sub" data-k="brayan2">${S.entrega ? `En ruta: ${S.entrega.tacos} tacos para ${S.entrega.app}` : 'Listo, esperando pedido'}</span>
      <div class="bar" style="margin-top:6px"><i data-k="ruta" style="width:0%"></i></div></div><span class="pill">${S.motoLvl > 1 ? 'Moto Nv.' + S.motoLvl : 'Moto 125'}</span></div>
    <div id="pedidos">${pedidosHTML()}</div></section>`
}
function pedidosHTML () {
  if (!S.pedidos.length) return '<div class="vacio">Sin pedidos por ahora. Llegan solos cada ratito.</div>'
  return S.pedidos.map(p => `<div class="item"><span class="ico">📦</span><div><b>${p.app} · ${p.tacos} tacos</b><span class="sub">${E.recetaOf(p.receta).name} · ${p.km} km · ~${E.tiempoEntrega(S, p)} s</span></div>
    <button class="btn sm go" data-a="pedido" data-id="${p.id}" ${S.entrega ? 'disabled' : ''}>ACEPTAR +${mxn(p.paga)}</button></div>`).join('')
}
function tabCuenta () {
  return `<section class="panel"><h2>🏦 CUENTA BANCARIA & SPEI 24/7</h2><p class="lead">El dinero en la cuenta no se lo llevan en un asalto. Las compras usan primero el efectivo.</p>
    <div class="row between"><span class="sub">SALDO EN CUENTA</span><span class="big num" data-k="bank2">${mxn(S.bank)}</span></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn sm go" data-a="dep" data-n="100">DEPOSITAR $100</button><button class="btn sm go" data-a="dep" data-n="all">DEPOSITAR TODO</button>
      <button class="btn sm" data-a="ret" data-n="100">RETIRAR $100</button><button class="btn sm" data-a="ret" data-n="all">RETIRAR TODO</button></div></section>
  <section class="panel"><h2>💳 TERMINAL DE COBRO</h2><p class="lead">Cobra con tarjeta en todas tus sedes: +25 % de propina en cada taco bien servido.</p>
    ${S.terminal ? '<span class="pill ok">ACTIVA</span>' : `<button class="btn pink" data-a="terminal">CONTRATAR ${mxn(E.COSTO_TERMINAL)}</button>`}</section>
  <section class="panel"><h2>📊 NÚMEROS DEL NEGOCIO</h2>
    <div class="row between"><span>Tacos vendidos</span><b class="num">${S.stats.tacos.toLocaleString('es-MX')}</b></div>
    <div class="row between"><span>Servidos perfecto</span><b class="num">${S.stats.perfectos.toLocaleString('es-MX')}</b></div>
    <div class="row between"><span>Clientes que se fueron</span><b class="num">${S.stats.perdidos}</b></div>
    <div class="row between"><span>Total ganado</span><b class="num">${mxn(S.stats.ganado)}</b></div>
    <ul class="log">${S.log.slice(0, 10).map(l => `<li class="${l.kind}">Día ${l.day} · ${esc(l.text)}</li>`).join('')}</ul>
    <button class="btn sm" data-a="reset">${confirmReset ? 'Toca otra vez: se borra la partida' : 'Nueva partida'}</button></section>`
}
let confirmReset = false
function tabExpansion () {
  const n = E.SEDES.filter(s => S.sedes[s.id]).length
  return `<section class="panel"><h2>🏆 MAPA DE EXPANSIÓN NACIONAL</h2><p class="lead">Las sedes donde no estás despachando producen ganancias pasivas cada segundo.</p>
    <div class="row between"><span class="sub">SEDE EN OPERACIÓN</span><span class="pill hot">${n}/${E.SEDES.length} SEDES</span></div>
    <b>📍 ${E.sedeOf(S.sede).name} (${E.sedeOf(S.sede).lugar})</b>
    ${E.SEDES.map(sd => sedeCard(sd)).join('')}</section>`
}
function sedeCard (sd) {
  const on = S.sedes[sd.id]; const aqui = S.sede === sd.id
  const esp = E.RECETAS.find(r => r.sede === sd.id)
  return `<div class="sede ${aqui ? 'on' : ''} ${on ? '' : 'locked'}"><div class="row between"><h3>${sd.icon} ${sd.name}: ${sd.lugar}</h3>
    <span class="pill ${aqui ? 'ok' : on ? 'hot' : 'no'}">${aqui ? (sd.id === 'cdmx' ? 'MATRIZ · AQUÍ' : 'AQUÍ') : on ? 'PASIVO' : 'BLOQUEADA'}</span></div>
    <span class="sub">${sd.desc}<br>Maestro: ${sd.maestro} · Especialidad: ${esp.name} ($${esp.base})</span>
    <span class="sub">${on ? `Genera +$${E.pasivoSede(S, sd.id).toFixed(0)}/s cuando no estás aquí` : `Genera +$${sd.pasivo}/s pasivo al desbloquear · renta $${sd.renta}/día`}</span>
    ${aqui ? '' : on ? `<button class="btn sm go" data-a="cambiar" data-id="${sd.id}">OPERAR AQUÍ</button>` : `<button class="btn sm pink" data-a="sede" data-id="${sd.id}">DESBLOQUEAR ${mxn(sd.unlock)}</button>`}</div>`
}

// ---------- modales ----------
function modalHTML () {
  if (S.evento) {
    const e = E.eventoActual(S)
    return `<div class="modal emer" role="alertdialog" aria-modal="true" aria-labelledby="ev-t"><span class="tag">🚨 EMERGENCIA NACIONAL</span>
      <h2 id="ev-t">${e.icon} ${e.title}</h2><p style="margin:0">${e.desc}</p><b>¿QUÉ DECISIÓN TOMAS, PATRÓN?</b>
      ${e.ops.map((o, i) => `<button class="btn ${i ? '' : 'yel'}" style="white-space:normal;text-align:left" data-a="decide" data-i="${i}">${o.label}</button>`).join('')}</div>`
  }
  if (modal === 'sedes') {
    return `<div class="modal" role="dialog" aria-modal="true"><div class="row between"><h2>🗺️ EXPANSIÓN NACIONAL</h2><button class="x" data-a="close" aria-label="Cerrar">✕</button></div>
      <span class="sub">Selecciona qué taquería operar hoy</span>${E.SEDES.map(sedeCard).join('')}<button class="btn yel" data-a="close">VOLVER AL COMAL</button></div>`
  }
  if (modal?.offline) {
    return `<div class="modal" role="dialog" aria-modal="true"><h2>🌙 Mientras no estabas…</h2><p style="margin:0">Tus sedes siguieron vendiendo ${Math.round(modal.offline.secs / 60)} min.</p>
      <span class="big">+${mxn(modal.offline.g)}</span><button class="btn yel" data-a="close">¡A DARLE!</button></div>`
  }
  return ''
}
function drawModal () {
  const root = $('#modal-root'); if (!root) return
  const html = modalHTML()
  root.innerHTML = html ? `<div class="scrim">${html}</div>` : ''
}

// ---------- dibujo ----------
function draw () {
  if (!S) return
  $('#hud').innerHTML = hud()
  $('#main').innerHTML = { comal: tabComal, abasto: tabAbasto, entregas: tabEntregas, cuenta: tabCuenta, expansion: tabExpansion }[tab]()
  document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.t === tab ? 'page' : 'false'))
  filaSig = sig(); pedSig = pSig()
  drawModal(); update()
}
const sig = () => S.fila.map(c => `${c.id}:${c.lleva}`).join(',')
const pSig = () => S.pedidos.map(p => p.id).join(',') + '|' + !!S.entrega
function set (k, text, cls) {
  document.querySelectorAll(`[data-k="${k}"]`).forEach(el => {
    if (text != null && el.textContent !== text) el.textContent = text
    if (cls) for (const [c, on] of Object.entries(cls)) el.classList.toggle(c, on)
  })
}
function update () {
  set('cash', mxn(S.cash)); set('bank', mxn(S.bank)); set('bank2', mxn(S.bank))
  set('pas', `+$${Math.round(E.pasivoTotal(S))}/s`); set('rep', `${S.rep.toFixed(1)} ★`)
  set('dia', `DÍA ${S.day}`); set('hora', `${E.hora(S)} hrs`)
  set('carne', `🥩 Carne: ${S.carne.toFixed(1)} kg`, { low: S.carne < 2 })
  set('tort', `🫓 Tortillas: ${S.tortillas}`, { low: S.tortillas < 10 })
  set('salsa', `🌶️ Salsas: ${Math.round(S.salsa)}%`, { low: S.salsa < 10 })
  set('comal', S.comalOff > 0 ? `● COMAL APAGADO (${Math.ceil(S.comalOff)} s)` : '● COMAL ACTIVO', { off: S.comalOff > 0 })
  set('temp', S.comalOff > 0 ? '🧊 COMAL FRÍO' : '🔥 COMAL A 240°C')
  set('rush', S.rush > 0 ? `⚡ RUSH X2: ${Math.ceil(S.rush)} s` : '')
  set('porc', `🔪 ${S.porciones}`)
  set('filan', `(${S.fila.length}/${E.MAX_FILA})`)
  const c = S.fila[0]
  if (c) {
    const base = E.precio(S, c.receta) + (c.receta === 'pastor' && S.pina ? 4 : 0)
    set('precio', `+$${base * (S.rush > 0 ? 2 : 1)} MXN / taco ${S.rush > 0 ? '(X2)' : ''}`)
  } else set('precio', 'Esperando clientes…')
  const rb = document.querySelector('[data-k="rushbtn"]')
  if (rb) { rb.disabled = S.rushCd > 0; rb.textContent = S.rush > 0 ? `⚡ RUSH ${Math.ceil(S.rush)} s` : S.rushCd > 0 ? `⚡ RECARGA ${Math.ceil(S.rushCd)} s` : '⚡ RUSH (X2)' }
  const br = S.entrega ? `En ruta: ${S.entrega.tacos} tacos para ${S.entrega.app} (${Math.ceil(S.entrega.left)} s)` : 'LISTO para entregas'
  set('brayan', br); set('brayan2', br)
  const ruta = document.querySelector('[data-k="ruta"]')
  if (ruta) ruta.style.width = S.entrega ? `${(1 - S.entrega.left / S.entrega.total) * 100}%` : '0%'
  // fila y pedidos: se redibujan solo si cambiaron
  const f = $('#fila')
  if (f && sig() !== filaSig) { f.innerHTML = filaHTML(); filaSig = sig() }
  for (const cl of S.fila) {
    const el = document.querySelector(`[data-pac="${cl.id}"]`)
    if (el) { const p = cl.paciencia / cl.max; el.style.width = `${(p * 100).toFixed(0)}%`; el.className = p < 0.3 ? 'low' : p < 0.6 ? 'mid' : '' }
  }
  const pd = $('#pedidos')
  if (pd && pSig() !== pedSig) { pd.innerHTML = pedidosHTML(); pedSig = pSig() }
}

// ---------- bucle ----------
function loop (t) {
  const dt = Math.min(0.5, (t - (lastT || t)) / 1000); lastT = t
  if (S && !document.hidden) {
    const out = E.tick(S, dt, rng)
    if (out.cortado && tab === 'comal') A.chop()
    if (out.seFueron) A.bad()
    if (out.entregado) { A.coin(true); toast(`🛵 Entrega completada: +${mxn(out.entregado)}`) }
    if (out.evento) { A.alarm(); drawModal() }
    update()
    saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; save() }
  }
  requestAnimationFrame(loop)
}

// ---------- eventos de la interfaz ----------
const H = {
  tab: d => { tab = d.t; confirmReset = false; draw(); window.scrollTo(0, 0) },
  fx: () => { A.setFx(!A.fxEnabled()); A.pop(); draw() },
  sonidero: () => { sonideroOn = A.sonidero(!sonideroOn); draw() },
  evento: () => { const r = E.lanzarEvento(S, rng); if (r.ok) { A.alarm(); drawModal() } else toast(r.msg, true) },
  sample: d => { A.pop(); bocadillo(d.s); A.grito(d.s); S.spawnAcc += 0.35 }, // gritar atrae clientes
  sedes: () => { modal = 'sedes'; drawModal() },
  close: () => { modal = null; drawModal() },
  decide: d => { const r = E.resolverEvento(S, +d.i, rng); r.kind === 'bad' ? A.bad() : A.coin(); toast(r.msg, r.kind === 'bad'); draw(); save() },
  rebanar: () => act(E.rebanar(S), A.chop),
  pina: (d, el) => {
    const r = E.cacharPina(S)
    if (r.ok) {
      const top = $('#pina-top')?.getBoundingClientRect()
      if (top) { const p = document.createElement('div'); p.className = 'flypina'; p.textContent = '🍍'; p.style.left = `${top.left}px`; p.style.top = `${top.top}px`; document.body.appendChild(p); setTimeout(() => p.remove(), 600) }
      A.pop()
    }
    el.setAttribute('aria-pressed', String(S.pina)); if (!r.ok) toast(r.msg)
  },
  extra: (d, el) => { E.toggleExtra(S, d.x); el.setAttribute('aria-pressed', String(S.extras[d.x])); A.pop() },
  despachar: (d, el) => {
    const r = E.despachar(S)
    if (!r.ok) { A.bad(); toast(r.msg, true); return }
    A.coin(r.data.done); floatAt(el, `+$${r.data.monto}`)
    if (!r.data.match) toast(r.msg, true)
    $('.pinabtn')?.setAttribute('aria-pressed', 'false')
    update()
  },
  rush: () => act(E.activarRush(S), A.alarm),
  beto: () => act(E.mejorarBeto(S), A.coin),
  moto: () => act(E.mejorarMoto(S), A.moto),
  receta: d => act(E.mejorarReceta(S, d.id), A.coin),
  comprar: d => act(E.comprar(S, d.id), A.coin),
  pedido: d => act(E.aceptarPedido(S, +d.id), A.moto),
  dep: d => act(E.depositar(S, d.n === 'all' ? S.cash : +d.n), A.coin),
  ret: d => act(E.retirar(S, d.n === 'all' ? S.bank : +d.n), A.coin),
  terminal: () => act(E.contratarTerminal(S), A.coin),
  sede: d => act(E.desbloquearSede(S, d.id), () => A.coin(true)),
  cambiar: d => { const r = act(E.cambiarSede(S, d.id), A.pop); if (r.ok) { modal = null; tab = 'comal'; draw() } },
  reset: () => {
    if (!confirmReset) { confirmReset = true; draw(); return }
    try { localStorage.removeItem(SAVE_KEY) } catch {}
    confirmReset = false; S = null; A.sonidero(false); sonideroOn = false; intro()
  },
  start: () => { start(E.newGame((Date.now() ^ Math.random() * 1e9) >>> 0)); A.pop() },
  continue: () => { const s = load(); if (s) { const off = E.offline(s); start(s); if (off.g > 0) { modal = { offline: off }; drawModal() } } }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]')
  if (!el || el.disabled) return
  const fn = H[el.dataset.a]
  if (fn) { e.preventDefault(); fn(el.dataset, el) }
})
document.addEventListener('keydown', e => {
  if (!S || e.target.matches('input, textarea')) return
  if (S.evento) return
  if (e.key === ' ' || e.key === 'Enter') { if (tab === 'comal' && document.activeElement === document.body) { e.preventDefault(); H.despachar({}, $('#btn-desp')) } }
  if (e.key === 'r' || e.key === 'R') H.rebanar()
  if (e.key === 'Escape' && modal) H.close()
})
document.addEventListener('visibilitychange', () => { if (document.hidden && S) save() })
window.addEventListener('pagehide', () => { if (S) save() })

function shell () {
  document.getElementById('root').innerHTML = `<div class="app"><div id="hud"></div><main id="main"></main>
    <nav class="tabs" aria-label="Secciones">${[['comal', '🔥', 'COMAL'], ['abasto', '📦', 'ABASTO'], ['entregas', '🛵', 'ENTREGAS'], ['cuenta', '🏦', 'CUENTA'], ['expansion', '🏆', 'EXPANSIÓN']]
      .map(([t, e, l]) => `<button data-a="tab" data-t="${t}"><span class="e">${e}</span>${l}</button>`).join('')}</nav></div><div id="modal-root"></div>`
}
function start (state) {
  S = state; rng = E.mulberry32(S.seed + S.stats.tacos * 31 + S.day)
  tab = 'comal'; modal = null; shell(); draw(); save()
}
function intro () {
  const has = !!load()
  document.getElementById('root').innerHTML = `<div class="intro"><div class="picado" aria-hidden="true"></div>
    <h1>TAQUERÍA TYCOON</h1>
    <p>Arrancas con un puesto de banqueta afuera del Metro Tacubaya, $450 en la caja y un trompo que no para. Rebana, despacha, arma el salsero como lo pide la gente y expándete a Monterrey y Guadalajara.</p>
    <p class="sub">🔪 Rebanar (R) · 🌮 Despachar (Espacio) · 🌶️🍋🧅 como lo pida el cliente</p>
    ${has ? '<button class="btn yel" data-a="continue">CONTINUAR MI TAQUERÍA</button>' : ''}
    <button class="btn ${has ? '' : 'yel'}" data-a="start">${has ? 'Empezar de cero' : '¡ABRIR EL PUESTO!'}</button></div>`
}

function boot (data) {
  if (data?.save) { try { start(E.deserialize(data.save)) } catch { intro() } } else intro()
  requestAnimationFrame(loop)
}
window.claude?.hot?.snapshot?.(() => (S ? { save: E.serialize(S) } : {}))
if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {})
