// Sonido sintetizado con WebAudio: no hay archivos de audio que descargar ni licencias que pagar.
let ctx = null
let master = null
let fxOn = true
let loop = null

function ac () {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
export const setFx = v => { fxOn = v }
export const fxEnabled = () => fxOn

function noise (dur) {
  const c = ac(); const n = Math.floor(c.sampleRate * dur)
  const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource(); src.buffer = b
  return src
}
function env (g, t, a, peak, rel) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel)
}
function tone (freq, t, dur, type = 'square', peak = 0.15, dest) {
  const c = ac(); const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.value = freq
  env(g, t, 0.005, peak, dur)
  o.connect(g).connect(dest || master)
  o.start(t); o.stop(t + dur + 0.05)
}

// chisporroteo del comal
export function sizzle () {
  if (!fxOn || !ac()) return
  const c = ctx; const t = c.currentTime
  const n = noise(0.35); const f = c.createBiquadFilter(); const g = c.createGain()
  f.type = 'highpass'; f.frequency.value = 3500
  env(g, t, 0.01, 0.25, 0.3)
  n.connect(f).connect(g).connect(master); n.start(t)
}
// cuchillo
export function chop () {
  if (!fxOn || !ac()) return
  const t = ctx.currentTime
  const n = noise(0.06); const f = ctx.createBiquadFilter(); const g = ctx.createGain()
  f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2
  env(g, t, 0.002, 0.4, 0.05)
  n.connect(f).connect(g).connect(master); n.start(t)
  sizzle()
}
// caja registradora
export function coin (big = false) {
  if (!fxOn || !ac()) return
  const t = ctx.currentTime
  tone(1318, t, 0.08, 'square', 0.08)
  tone(1760, t + 0.07, big ? 0.35 : 0.2, 'square', 0.08)
}
export function bad () {
  if (!fxOn || !ac()) return
  const t = ctx.currentTime
  tone(220, t, 0.18, 'sawtooth', 0.1); tone(165, t + 0.15, 0.3, 'sawtooth', 0.1)
}
export function alarm () {
  if (!fxOn || !ac()) return
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, t + i * 0.16, 0.14, 'square', 0.09)
}
export function pop () {
  if (!fxOn || !ac()) return
  tone(880, ctx.currentTime, 0.06, 'triangle', 0.15)
}
export function moto () {
  if (!fxOn || !ac()) return
  const c = ctx; const t = c.currentTime; const o = c.createOscillator(); const g = c.createGain()
  o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.6)
  env(g, t, 0.02, 0.12, 0.7)
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.8)
}

// "Sonidero": cumbia sintetizada (bajo, acordeón y güiro) a 96 bpm
const CHORDS = [[220, 277, 330], [294, 370, 440], [330, 415, 494], [220, 277, 330]] // La, Re, Mi, La
const BASS = [110, 82.4, 110, 82.4, 147, 110, 147, 110, 165, 123, 165, 123, 110, 82.4, 110, 82.4]
export function sonidero (on) {
  if (!on) { if (loop) { clearInterval(loop.timer); loop.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1); loop = null } return false }
  if (loop || !ac()) return !!loop
  const bus = ctx.createGain(); bus.gain.value = 0.55; bus.connect(master)
  const step = 60 / 96 / 2 // corcheas
  let next = ctx.currentTime + 0.1; let i = 0
  const sched = () => {
    while (next < ctx.currentTime + 0.25) {
      const bar = Math.floor(i / 4) % 4
      tone(BASS[i % 16], next, step * 0.9, 'triangle', 0.35, bus)
      if (i % 2 === 1) for (const f of CHORDS[bar]) tone(f, next, step * 0.7, 'square', 0.03, bus)
      // güiro: raspado largo-corto-corto
      const g = ctx.createGain(); const n = noise(0.12); const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'; hp.frequency.value = 6000
      env(g, next, 0.01, i % 4 === 0 ? 0.12 : 0.06, i % 4 === 0 ? 0.1 : 0.04)
      n.connect(hp).connect(g).connect(bus); n.start(next)
      next += step; i++
    }
  }
  loop = { bus, timer: setInterval(sched, 60) }
  sched()
  return true
}

// gritos del sampler con la voz del sistema (si existe)
export function grito (text) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'es-MX'; u.rate = 1.05; u.pitch = 1.1
    const v = speechSynthesis.getVoices().find(v => v.lang?.startsWith('es-MX')) || speechSynthesis.getVoices().find(v => v.lang?.startsWith('es'))
    if (v) u.voice = v
    speechSynthesis.cancel(); speechSynthesis.speak(u)
    return true
  } catch { return false }
}
