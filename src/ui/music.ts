// Música de fondo: cambia según el momento (menú, día, noche, bolsa, fiesta) con transición suave.
// Si todavía no existe la pista de un momento, se usa la del menú.
const files = import.meta.glob('../assets/audio/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const url = (name: string) => files[`../assets/audio/${name}.mp3`]

export type Mood = 'menu' | 'dia' | 'noche' | 'bolsa' | 'fiesta'
const TRACK: Record<Mood, string> = { menu: 'musica-menu', dia: 'musica-ciudad-dia', noche: 'musica-ciudad-noche', bolsa: 'musica-bolsa', fiesta: 'musica-fiesta' }

const KEY = 'tienda-mx-musica'
let volume = (() => { try { const v = localStorage.getItem(KEY); return v == null ? 0.5 : +v } catch { return 0.5 } })()
let current: HTMLAudioElement | null = null
let currentSrc = ''
let wanted: Mood = 'menu'
let unlocked = false

export const musicVolume = () => volume
export function setMusicVolume (v: number) {
  volume = v; try { localStorage.setItem(KEY, String(v)) } catch { /* sin almacenamiento */ }
  if (current) current.volume = v
  if (v > 0 && !current) play(wanted)
}

function fade (a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = a.volume; const t0 = performance.now()
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms)
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) requestAnimationFrame(step); else done?.()
  }
  requestAnimationFrame(step)
}

function play (mood: Mood) {
  wanted = mood
  if (!unlocked || volume <= 0) return
  const src = url(TRACK[mood]) ?? url(TRACK.menu)
  if (!src || src === currentSrc) return
  const old = current
  const a = new Audio(src); a.loop = true; a.volume = 0
  a.play().then(() => fade(a, volume, 1200)).catch(() => {})
  current = a; currentSrc = src
  if (old) fade(old, 0, 1200, () => old.pause())
}

export function setMood (mood: Mood) { if (mood !== wanted || !current) play(mood) }

// los navegadores solo dejan sonar música después del primer toque
export function unlockMusic () {
  if (unlocked) return
  unlocked = true
  play(wanted)
}

// baja la música mientras hay una noticia o celebración en pantalla
let ducked = false
export function duckMusic (on: boolean) {
  if (on === ducked || !current) return
  ducked = on; fade(current, on ? volume * 0.3 : volume, 400)
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (!current) return
  if (document.hidden) current.pause(); else if (unlocked && volume > 0) current.play().catch(() => {})
})

// silenciar todo (música y efectos) recordando el volumen anterior para volver a encender
export function muteAll (mute: boolean, setSfx: (on: boolean) => void) {
  try {
    if (mute) { if (volume > 0) localStorage.setItem('tienda-mx-musica-antes', String(volume)); setMusicVolume(0) } else setMusicVolume(+(localStorage.getItem('tienda-mx-musica-antes') ?? '0.5') || 0.5)
  } catch { setMusicVolume(mute ? 0 : 0.5) }
  setSfx(!mute)
}
