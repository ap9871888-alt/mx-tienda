// Estado de la app con Zustand. La partida es un objeto mutable que el motor avanza en el bucle;
// `rev` avisa a React que redibuje unas veces por segundo.
import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import * as E from '../engine'
import type { GameState, Result } from '../engine/types'
import { ECONOMY } from '../data/economy'
import { bus } from './bus'

export type Tab = 'calle' | 'mapa' | 'tienda' | 'logistica' | 'corporativo'
export type Speed = 0 | 1 | 2 | 4

interface AppState {
  game: GameState | null
  rev: number
  speed: Speed
  tab: Tab
  storeId: number | null
  toast: { text: string; bad: boolean; id: number } | null
  newGame: (company: string) => void
  setSpeed: (s: Speed) => void
  setTab: (t: Tab) => void
  selectStore: (id: number | null) => void
  run: <T>(fn: (g: GameState) => Result<T>) => Result<T> | null
  say: (text: string, bad?: boolean) => void
  importGame: (text: string) => boolean
  reset: () => void
}

// escritura a localStorage con espera, para no guardar varias veces por segundo
let pending: { k: string; v: string } | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const flush = () => { if (pending) { try { localStorage.setItem(pending.k, pending.v) } catch { /* sin almacenamiento */ } pending = null } }
const storage: StateStorage = {
  getItem: k => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { pending = { k, v }; clearTimeout(timer); timer = setTimeout(flush, 1500) },
  removeItem: k => { pending = null; try { localStorage.removeItem(k) } catch { /* sin almacenamiento */ } }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush() })
}

export const useApp = create<AppState>()(persist((set, get) => ({
  game: null, rev: 0, speed: 1, tab: 'calle', storeId: null, toast: null,
  newGame: company => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
    set({ game: E.newGame(seed, company), storeId: null, tab: 'mapa', speed: 1, rev: 0 })
  },
  setSpeed: speed => set({ speed }),
  setTab: tab => set({ tab }),
  selectStore: storeId => set({ storeId }),
  run: fn => {
    const g = get().game
    if (!g) return null
    const r = fn(g)
    if (r.msg) get().say(r.msg, !r.ok)
    set({ game: g, rev: get().rev + 1 })
    return r
  },
  say: (text, bad = false) => set({ toast: { text, bad, id: Date.now() } }),
  importGame: text => {
    try {
      const g = E.deserialize(text)
      set({ game: g, storeId: g.stores[0]?.id ?? null, rev: get().rev + 1 })
      get().say('Partida cargada')
      return true
    } catch { get().say('Ese archivo no es una partida válida', true); return false }
  },
  reset: () => set({ game: null, storeId: null, tab: 'calle' })
}), {
  name: 'tienda-mx-v3',
  storage: createJSONStorage(() => storage),
  partialize: s => ({ game: s.game, speed: s.speed, storeId: s.storeId }),
  version: E.SAVE_VERSION,
  migrate: (persisted, version) => {
    const p = persisted as { game: GameState | null; speed: Speed; storeId: number | null }
    if ((version === 3 || version === 4) && p?.game) return { ...p, game: E.migrateGame(p.game) } as never
    return { game: null, speed: 1, storeId: null } as never
  }
}))

// mientras el jugador toca la pantalla no se redibuja la interfaz: así nada brinca bajo el dedo
let touching = false; let touchTimer: ReturnType<typeof setTimeout> | undefined
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { touching = true; clearTimeout(touchTimer) }, { passive: true })
  const up = () => { clearTimeout(touchTimer); touchTimer = setTimeout(() => { touching = false }, 350) }
  window.addEventListener('pointerup', up, { passive: true }); window.addEventListener('pointercancel', up, { passive: true })
}
// bucle de simulación: 1 día de juego = 60 s reales a 1x
let raf = 0; let last = 0; let uiAcc = 0
export function startLoop () {
  if (raf) return
  last = performance.now()
  const tick = (now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000); last = now
    const st = useApp.getState()
    if (st.game && st.speed > 0) {
      const events = E.advance(st.game, dt * st.speed * ECONOMY.gameMinutesPerRealSecond)
      bus.emit(events)
      uiAcc += dt
      if ((uiAcc > 0.4 && !touching) || events.some(e => e.type === 'dayEnd')) { uiAcc = 0; useApp.setState({ game: st.game, rev: st.rev + 1 }) }
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

export const fmt = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-MX')
export function fmtK (n: number) {
  const a = Math.abs(n); const s = n < 0 ? '−' : ''
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)} M`
  if (a >= 1e4) return `${s}$${Math.round(a / 1000)} k`
  return fmt(n)
}

// solo en desarrollo: acceso desde la consola para pruebas
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __app: typeof useApp }).__app = useApp
