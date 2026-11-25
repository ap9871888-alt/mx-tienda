// Sonidos sintetizados con Web Audio: no pesan nada y funcionan sin archivos.
let ctx: AudioContext | null = null
const KEY = 'tienda-mx-sonido'
let on = (() => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } })()
export const soundOn = () => on
export function setSound (v: boolean) { on = v; try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* sin almacenamiento */ } }
function ac () {
  if (!ctx) { const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!C) return null; ctx = new C() }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone (freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, delay = 0, slide = 0) {
  const a = ac(); if (!a) return
  const t = a.currentTime + delay
  const o = a.createOscillator(); const g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02)
}
let lastCoin = 0
// efectos grabados (si existen) en lugar de los sintetizados
const FILES = import.meta.glob('../assets/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const pool = new Map<string, HTMLAudioElement[]>()
function file (name: string, vol = 0.7) {
  const src = FILES[`../assets/sfx/${name}.mp3`]; if (!src) return false
  let list = pool.get(name); if (!list) { list = []; pool.set(name, list) }
  let a = list.find(x => x.paused || x.ended)
  if (!a) { if (list.length >= 4) return true; a = new Audio(src); list.push(a) }
  a.volume = vol; a.currentTime = 0; a.play().catch(() => {})
  return true
}
export const sfx = {
  click: () => { if (on && !file('sfx-click', 0.5)) tone(660, 0.06, 'triangle', 0.05) },
  tab: () => on && tone(520, 0.07, 'sine', 0.05, 0, 1.3),
  coin: () => { const n = performance.now(); if (!on || n - lastCoin < 350) return; lastCoin = n; if (file('sfx-moneda', 0.45)) return; tone(1320, 0.08, 'square', 0.03); tone(1760, 0.12, 'square', 0.03, 0.06) },
  cash: () => { if (!on || file('sfx-caja', 0.8)) return; tone(880, 0.08, 'square', 0.04); tone(1175, 0.1, 'square', 0.04, 0.07); tone(1568, 0.25, 'triangle', 0.05, 0.14) },
  error: () => on && tone(180, 0.18, 'sawtooth', 0.04, 0, 0.7),
  good: () => { if (!on || file('sfx-logro', 0.6)) return; [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.09)) },
  money: () => { if (on) file('sfx-monedas', 0.7) },
  door: () => { if (on) file('sfx-puerta', 0.35) },
  plane: () => { if (on) file('sfx-avion', 0.6) },
  bus: () => { if (on) file('sfx-autobus', 0.6) },
  truck: () => { if (on) file('sfx-camion', 0.45) },
  bell: () => { if (on) file('sfx-campana-bolsa', 0.7) },
  travel: () => { if (!on) return; tone(300, 0.6, 'sine', 0.04, 0, 2.2) }
}

// ambiente de la calle en bucle, bajito, solo mientras ves la calle de una tienda
let amb: HTMLAudioElement | null = null
export function streetAmbience (play: boolean) {
  const src = FILES['../assets/sfx/ambiente-calle.mp3']
  if (!src) return
  if (play && on) {
    if (!amb) { amb = new Audio(src); amb.loop = true; amb.volume = 0.25 }
    if (amb.paused) amb.play().catch(() => {})
  } else if (amb && !amb.paused) amb.pause()
}
