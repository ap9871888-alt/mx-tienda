import type { GameState } from './types'

// mulberry32 con el estado guardado en la partida: misma semilla, misma simulación.
export function nextRandom (s: { rng: number }): number {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
export const randInt = (s: GameState, a: number, b: number) => a + Math.floor(nextRandom(s) * (b - a + 1))
export const pick = <T>(s: GameState, arr: T[]): T => arr[Math.floor(nextRandom(s) * arr.length)]
// Poisson para llegadas por minuto (λ pequeño)
export function poisson (s: GameState, lambda: number): number {
  if (lambda <= 0) return 0
  const L = Math.exp(-lambda); let k = 0; let p = 1
  do { k++; p *= nextRandom(s) } while (p > L && k < 50)
  return k - 1
}
