// Preferencias del jugador que se guardan en el teléfono (vista del mapa, tráfico…)
import { useSyncExternalStore } from 'react'

export interface Prefs { labels: boolean; traffic: number; petals: boolean; lite?: boolean; autoPause?: boolean }
const KEY = 'tienda-mx-prefs'
let prefs: Prefs = (() => { try { return { labels: true, traffic: 1, petals: true, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { labels: true, traffic: 1, petals: true } } })()
const subs = new Set<() => void>()
export const getPrefs = () => prefs
export function setPrefs (p: Partial<Prefs>) {
  prefs = { ...prefs, ...p }
  try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* sin almacenamiento */ }
  subs.forEach(f => f())
}
export const usePrefs = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => prefs)

// Si la página se cerró a la fuerza la vez anterior (el teléfono se quedó sin memoria),
// arrancamos en modo ligero: menos tráfico, sin pétalos y mapa a menor resolución.
try {
  const ALIVE = 'tienda-mx-abierta'
  if (localStorage.getItem(ALIVE) === '1' && !prefs.lite) setPrefs({ lite: true, traffic: 0.5, petals: false })
  localStorage.setItem(ALIVE, '1')
  const bye = () => { try { localStorage.setItem(ALIVE, '0') } catch { /* nada */ } }
  addEventListener('pagehide', bye); document.addEventListener('visibilitychange', () => { if (document.hidden) bye(); else localStorage.setItem(ALIVE, '1') })
} catch { /* sin almacenamiento */ }
export const isLite = () => !!prefs.lite
