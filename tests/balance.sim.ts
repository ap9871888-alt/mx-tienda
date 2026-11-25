import { it } from 'vitest'
import * as E from '../src/engine'
import { cityOf } from '../src/data/cities'
// jugador automático razonable: abre tiendas cuando puede, contrata y reinvierte
it('balance', () => {
  for (const seed of [11, 22, 33]) {
    const g = E.newGame(seed)
    const cols = cityOf('cdmx').colonies.map(c => c.id)
    const hits: string[] = []
    for (let d = 0; d < 730; d++) {
      E.advance(g, 1440)
      if (g.dilemma) E.resolveDilemma(g, 0); g.weekly = null; g.offer = null
      if (g.milestone != null) { hits.push(`${(g.milestonesHit ?? 0)}:d${d}`); g.milestone = null }
      for (const st of g.stores) while (st.cashiers.length < 2 && g.candidates.length) E.hireCashier(g, st.id, 0)
      if (g.cash > (g.stores.length ? 450000 : 300000) && g.stores.length < 40) {
        const c = cols.filter(id => E.ownIn(g, id) < 8).sort((a, b) => E.effectiveTraffic(g, 'cdmx', b) - E.effectiveTraffic(g, 'cdmx', a))[0]
        if (c) E.openStore(g, 'cdmx', c, 'tiendita')
      }
      if ((g.milestonesHit ?? 0) >= 1) g.directors = { ...g.directors, ops: true }
    }
    console.log('SIM', seed, 'tiendas', g.stores.length, 'patrimonio', Math.round(E.netWorth(g) / 1e6 * 10) / 10, 'M', hits.join(' '), 'imp', g.world?.taxRate)
  }
}, 120000)
