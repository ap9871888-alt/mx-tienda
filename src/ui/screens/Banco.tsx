import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Kpi, Bar, Advisor } from '../components/kit'
import { FUNDS, FUND_FEE } from '../../data/market'
import { OFFICES, OFFICE_CREDIT, TERM_LOANS } from '../../data/bank'
import { Spark } from './Corporativo'

const pct = (r: number) => `${(r * 100).toFixed(1)} %`

export function Banco () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const limit = E.loanLimit(game); const rate = E.lineRate(game)
  const lvl = game.office ?? 0; const next = OFFICES[lvl + 1]
  const terms = game.terms ?? []
  const debt = game.loan + E.termDebt(game)
  return (
    <div className='flex flex-col gap-3'>
      <div className='rounded-2xl bg-gradient-to-br from-corp to-[#0F2F5C] text-white p-4 shadow-card'>
        <span className='text-xs uppercase tracking-wider opacity-80'>Banca Mexicana del Comercio · cuenta empresarial</span>
        <div className='font-display text-3xl num mt-1'>{fmt(game.cash)}</div>
        <span className='text-xs opacity-80'>{game.company}</span>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        <Kpi label='Deuda total' value={fmtK(debt)} tone={debt > 0 ? 'bad' : undefined} />
        <Kpi label='Inversiones' value={fmtK(E.fundValue(game))} />
        <Kpi label='Patrimonio' value={fmtK(E.netWorth(game))} />
      </div>

      <Card title={`Línea de crédito PyME · ${pct(rate)} anual`}>
        <div className='flex justify-between text-sm'><span>Usado {fmt(game.loan)}</span><span>Límite {fmt(limit)}</span></div>
        <Bar value={limit ? game.loan / limit : 0} color='#D63B2F' />
        <div className='flex flex-wrap gap-2'>
          {[100000, 250000, 1000000].map(n => <Btn key={n} small kind='blue' disabled={game.loan + n > limit} onClick={() => run(g => E.takeLoan(g, n))}>Pedir {fmtK(n)}</Btn>)}
          {game.loan > 0 && <Btn small kind='ghost' onClick={() => run(g => E.repayLoan(g, Math.min(g.loan, 100000)))}>Abonar {fmtK(Math.min(game.loan, 100000))}</Btn>}
          {game.loan > 0 && <Btn small kind='ghost' onClick={() => run(g => E.repayLoan(g, g.loan))}>Liquidar</Btn>}
        </div>
        <p className='text-xs text-tenue'>Revolvente: pagas interés diario sobre lo usado. El límite crece con tus tiendas y tu sede.</p>
      </Card>

      <Card fold title='Créditos a plazo'>
        {TERM_LOANS.map(t => {
          const mine = terms.find(x => x.id === t.id)
          return <div key={t.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
            <div className='flex-1 min-w-0'><b className='text-sm block'>{t.label}</b>
              <span className='text-xs text-tenue'>{fmtK(t.amount)} · tasa ≈ {pct(Math.max(0.04, rate - t.rateCut))}{t.minStores ? ` · requiere ${t.minStores} tiendas` : ''} · requiere oficina</span>
              {mine && <span className='text-xs block num'>Saldo {fmt(mine.balance)} · pago diario {fmt(mine.daily)}</span>}</div>
            {mine ? <span className='text-xs font-semibold text-ahorro'>Activo</span> : <Btn small onClick={() => run(g => E.takeTerm(g, t.id))}>Solicitar</Btn>}
          </div>
        })}
      </Card>

      <Card title='Seguro empresarial' right={<span className={`text-xs font-bold ${game.insured ? 'text-ahorro' : 'text-tenue'}`}>{game.insured ? 'Activo' : 'Sin seguro'}</span>}>
        <p className='text-sm'>Cubre el 80 % de lo que se llevan en un asalto. Cuesta {fmtK(game.stores.reduce((a, st) => a + E.insuranceMonthly(st), 0))}/mes por todas tus tiendas.</p>
        <Btn small kind={game.insured ? 'ghost' : 'primary'} onClick={() => useApp.getState().run(g => E.toggleInsurance(g))}>{game.insured ? 'Cancelar seguro' : 'Contratar seguro'}</Btn>
      </Card>
      <Card fold title='Oficinas corporativas'>
        <div className='flex gap-1.5'>{OFFICES.map((_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i <= lvl ? 'bg-corp' : 'bg-borde'}`} />)}</div>
        <div><b className='text-sm'>{OFFICES[lvl].name}</b> <span className='text-xs text-tenue'>· {OFFICES[lvl].place}</span><p className='text-xs text-tenue'>{OFFICES[lvl].desc}{OFFICES[lvl].monthly ? ` Renta ${fmtK(OFFICES[lvl].monthly)}/mes.` : ''}</p></div>
        {next && <div className='rounded-xl border border-dashed border-borde p-3 flex flex-col gap-1.5'>
          <b className='text-sm'>Siguiente: {next.name} · {next.place}</b>
          <span className='text-xs text-tenue'>{next.desc} Línea ×{OFFICE_CREDIT[lvl + 1]} · tasa más baja · renta {fmtK(next.monthly)}/mes.</span>
          <Btn small disabled={game.cash < next.cost} onClick={() => run(g => E.buyOffice(g))}>Mudarte por {fmt(next.cost)}</Btn>
        </div>}
      </Card>

      <Advisor who='finanzas'>{debt > limit * 0.8 ? 'Estás muy endeudado: abona antes de abrir más tiendas.' : game.cash > 600000 ? 'Tienes efectivo de sobra: invierte lo que no uses y deja colchón para nómina y renta.' : 'Un crédito a plazo sale más barato que la línea revolvente para abrir tiendas.'}</Advisor>

      <Card fold title='Inversiones' right={<span className='num text-sm font-bold'>{fmtK(E.fundValue(game))}</span>}>
        {FUNDS.map(f => {
          const st = game.market?.funds[f.id]
          if (!st) return null
          const value = st.units * st.nav; const gain = value - st.invested
          const h = st.hist; const ch = h.length > 30 ? st.nav / h[h.length - 31] - 1 : st.nav / h[0] - 1
          return (
            <div key={f.id} className='flex flex-col gap-1.5 py-2 border-t border-borde first:border-t-0'>
              <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-2 min-w-0'><span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ background: f.color }} /><b className='text-sm truncate'>{f.name}</b></span>
                <span className={`num text-xs font-semibold ${ch >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)} % 30 días</span>
              </div>
              <p className='text-xs text-tenue'>{f.desc} ~{Math.round(f.annual * 100)} % al año.</p>
              <Spark values={h} color={f.color} />
              {st.units > 0 && <div className='flex justify-between text-xs num'><span>Tienes {fmt(value)}</span><span className={gain >= 0 ? 'text-ahorro' : 'text-rojo'}>{gain >= 0 ? '+' : ''}{fmt(gain)}</span></div>}
              <div className='flex flex-wrap gap-1.5'>
                {[100000, 500000].map(n => <Btn key={n} small kind='ghost' disabled={game.cash < n} onClick={() => run(g => E.investFund(g, f.id, n))}>+{fmtK(n)}</Btn>)}
                {st.units > 0 && <Btn small kind='ghost' onClick={() => run(g => E.withdrawFund(g, f.id, Infinity))}>Retirar todo</Btn>}
              </div>
            </div>
          )
        })}
        <span className='text-xs text-tenue'>Comisión de {FUND_FEE * 100} % al entrar y al salir.</span>
      </Card>
    </div>
  )
}
