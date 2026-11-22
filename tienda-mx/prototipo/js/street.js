// Calle en vivo: escena animada sobre la foto de la sucursal. Clientes que caminan (sprites de 4 fotogramas),
// camión del CEDIS que llega a resurtir y avisos flotantes. Solo lee el estado; no lo modifica.
const WALK = [2, 3, 4, 5].map(i => `assets/sprites/cliente-${i}.png`)
const REP = [1, 2, 3].map(i => `assets/sprites/reparto-${i}.png`)
const VAN = 'assets/sprites/van.png'

export function createStreet ({ getStore, getDay, background, fmt }) {
  const root = document.createElement('div')
  root.className = 'street'
  root.innerHTML = `<div class="street-bg">${background}</div><div class="street-walk" aria-hidden="true"></div>
    <div class="street-layer" aria-hidden="true"></div><div class="street-notes" aria-live="polite"></div>
    <div class="street-hud"><span>Fila y Satisfacción</span><span class="face">😐</span><div class="fila"><i></i></div></div>`
  const layer = root.querySelector('.street-layer')
  const notes = root.querySelector('.street-notes')
  const bar = root.querySelector('.fila i'); const face = root.querySelector('.face')
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let walkers = []; let last = 0; let spawn = 0.6; let raf = 0; let noteT = 0; let happyT = 0
  let seenRestock = getStore()?.restockedDay ?? -1
  let van = null

  function sprite (src, cls) {
    const el = document.createElement('img'); el.src = src; el.alt = ''; el.className = cls; el.draggable = false
    layer.appendChild(el); return el
  }
  function bubble (text, x, kind = 'money') {
    const b = document.createElement('div'); b.className = `bub ${kind}`; b.textContent = text
    b.style.left = `${x}%`; layer.appendChild(b); setTimeout(() => b.remove(), 1500)
  }
  function addWalker (enter, fromLeft) {
    const el = sprite(WALK[0], 'walker')
    el.style.filter = `hue-rotate(${Math.floor(Math.random() * 360)}deg)`
    const w = { el, x: enter ? (fromLeft ? -8 : 108) : 50, to: enter ? 50 : (fromLeft ? 112 : -12), enter, speed: 7 + Math.random() * 4, phase: Math.random() * 4 }
    walkers.push(w)
  }
  function startVan () {
    const el = sprite(VAN, 'van'); const man = sprite(REP[0], 'walker rep'); man.style.opacity = 0
    van = { el, man, x: 118, t: 0, stage: 'in' }
  }

  function frame (t) {
    if (!root.isConnected) { raf = 0; return }
    const dt = Math.min(0.1, (t - (last || t)) / 1000); last = t
    const s = getStore(); const td = s?.today
    // clientes según los clientes reales del día
    const rate = reduce || !td || td.closed ? 0 : Math.min(1.6, Math.max(0.15, (td.served || 0) / 250))
    spawn -= dt * rate
    if (spawn <= 0 && walkers.length < 10) { spawn = 1; addWalker(true, Math.random() < 0.5) }
    const ticket = td?.served ? td.rev / td.served : 0
    for (const w of walkers) {
      const dir = Math.sign(w.to - w.x)
      w.x += dir * w.speed * dt
      w.phase += dt * 7
      w.el.src = WALK[Math.floor(w.phase) % 4]
      w.el.style.left = `${w.x}%`
      w.el.style.transform = `translateX(-50%) scaleX(${dir < 0 ? -1 : 1})`
      w.el.classList.toggle('out', !w.enter)
      if ((dir > 0 && w.x >= w.to) || (dir < 0 && w.x <= w.to)) {
        w.done = true; w.el.remove()
        if (w.enter) {
          if (ticket) bubble(`+${fmt(ticket)} MXN`, 50)
          setTimeout(() => { if (root.isConnected) addWalker(false, Math.random() < 0.5) }, 900 + Math.random() * 900)
        }
      }
    }
    walkers = walkers.filter(w => !w.done)
    // camión del CEDIS o del mayorista cuando hubo resurtido
    if (!reduce && s && s.restockedDay != null && s.restockedDay !== seenRestock && !van) { seenRestock = s.restockedDay; startVan() }
    if (van) {
      van.t += dt
      if (van.stage === 'in') { van.x -= 30 * dt; if (van.x <= 80) { van.x = 80; van.stage = 'unload'; van.t = 0 } }
      if (van.stage === 'unload') {
        const p = Math.min(1, van.t / 2.4)
        van.man.style.opacity = p < 1 ? 1 : 0
        van.man.style.left = `${74 - p * 22}%`
        van.man.src = REP[1 + Math.floor(van.t * 5) % 2]
        van.man.style.transform = 'translateX(-50%) scaleX(-1)'
        if (p >= 1) { van.stage = 'out'; bubble('📦 ¡Resurtido!', 52, 'info') }
      }
      if (van.stage === 'out') { van.x += 34 * dt; if (van.x > 125) { van.el.remove(); van.man.remove(); van = null } }
      if (van) van.el.style.left = `${van.x}%`
    }
    // avisos y barra de satisfacción
    noteT -= dt; happyT -= dt
    if (noteT <= 0 && s) {
      noteT = 1
      const chips = []
      if (td?.customers && td.lost / td.customers > 0.1) chips.push('<span class="note bad">⏱️ ¡Fila larga!</span>')
      if (!s.franq && s.stock < 25) chips.push('<span class="note warn">📦 ¡Reabastecer!</span>')
      if (!s.staff.length) chips.push('<span class="note bad">🚫 Sin personal</span>')
      notes.innerHTML = chips.join('')
      bar.style.width = `${s.sat.toFixed(0)}%`
      face.textContent = s.sat >= 65 ? '😄' : s.sat >= 45 ? '🙂' : '😟'
    }
    if (happyT <= 0 && s?.sat >= 68 && walkers.length) { happyT = 6; bubble('😄 ★★★★★ ¡Cliente feliz!', 30 + Math.random() * 40, 'happy') }
    raf = requestAnimationFrame(frame)
  }
  return {
    el: root,
    start () { if (!raf) { last = 0; raf = requestAnimationFrame(frame) } },
    get day () { return getDay() }
  }
}
