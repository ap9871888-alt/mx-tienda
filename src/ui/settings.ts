// Preferencias del jugador que se guardan en el teléfono (vista del mapa, tráfico…)
import { useSyncExternalStore } from 'react'

export interface Prefs { labels: boolean; traffic: number; petals: boolean }
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
