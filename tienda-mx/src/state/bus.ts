import type { GameEvent } from '../engine/types'

type Fn = (e: GameEvent[]) => void
const subs = new Set<Fn>()
export const bus = {
  on (fn: Fn) { subs.add(fn); return () => { subs.delete(fn) } },
  emit (e: GameEvent[]) { if (e.length) for (const f of subs) f(e) }
}
