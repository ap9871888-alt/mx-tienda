import { useRef, useState } from 'react'
import { Download, Upload, RotateCcw } from 'lucide-react'
import * as E from '../../engine'
import type { DayReport } from '../../engine/types'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Kpi, BarChart, Bar, Modal } from '../components/kit'

const sum = (rs: DayReport[], k: keyof DayReport) => rs.reduce((a, r) => a + (r[k] as number), 0)

export function Corporativo () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const [resetOpen, setResetOpen] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const last = game.reports[game.reports.length - 1]
  const week = game.reports.slice(-7); const prev = game.reports.slice(-14, -7)
  const ph = E.phaseInfo(game)
  const limit = E.loanLimit(game)
  const rows: [string, keyof DayReport, number][] = [['Ventas', 'sales', 1], ['Comisiones de servicios', 'commissions', 1], ['Costo de mercancía', 'cogs', -1], ['Nómina', 'payroll', -1], ['Renta', 'rent', -1], ['Luz CFE', 'power', -1], ['Merma y robo', 'shrink', -1], ['Servicios, seguridad y limpieza', 'upkeep', -1], ['Fletes', 'fees', -1], ['Intereses', 'interest', -1]]

  const exportGame = async () => {
    const text = E.serialize(game)
    try {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      a.download = `tienda-mx-dia-${E.dayOf(game.minute)}.json`; a.click()
      URL.revokeObjectURL(a.href)
      useApp.getState().say('Partida exportada')
    } catch {
      try { await navigator.clipboard.writeText(text); useApp.getState().say('Partida copiada al portapapeles') } catch { useApp.getState().say('No se pudo exportar', true) }
    }
  }
  const importGame = async (f: File) => useApp.getState().importGame(await f.text())

  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Corporativo</h1>
      <div className='grid grid-cols-2 gap-2'>
        <Kpi label='Efectivo' value={fmtK(game.cash)} tone={game.cash < 0 ? 'bad' : undefined} />
        <Kpi label='Patrimonio' value={fmtK(E.netWorth(game))} />
        <Kpi label='Utilidad 7 días' value={fmtK(sum(week, 'profit'))} tone={sum(week, 'profit') >= 0 ? 'good' : 'bad'} />
        <Kpi label='Deuda' value={fmtK(game.loan)} />
      </div>

      <Card title={`Fase ${ph.phase} · ${ph.name}`}>
        <Bar value={ph.progress} color='#F2B705' />
        <span className='text-xs text-tenue'>{ph.next}</span>
      </Card>

      <Card title={last ? `Corte del ${E.dateLabel(last.day).date}` : 'Corte diario'}>
        {last
          ? <div className='text-sm num flex flex-col gap-1'>
            {rows.map(([n, k, sg]) => <div key={k} className='flex justify-between'><span>{n}</span><span className={sg < 0 ? 'text-tenue' : ''}>{fmt((last[k] as number) * sg)}</span></div>)}
            <div className='flex justify-between font-bold border-t border-urbano pt-1'><span>Utilidad neta</span><span className={last.profit >= 0 ? 'text-ahorro' : 'text-rojo'}>{fmt(last.profit)}</span></div>
            <span className='text-xs text-tenue'>{last.tickets} tickets · {last.abandoned} clientes se fueron</span>
          </div>
          : <p className='text-sm text-tenue'>El primer corte se hace a medianoche.</p>}
      </Card>

      <Card title='Estado de resultados semanal'>
        <table className='w-full text-sm num'>
          <thead><tr className='text-[11px] uppercase text-tenue'><th className='text-left font-semibold'>Concepto</th><th className='text-right font-semibold'>Últimos 7 días</th><th className='text-right font-semibold'>7 días previos</th></tr></thead>
          <tbody>
            {rows.map(([n, k, sg]) => <tr key={k} className='border-t border-borde'><td className='py-1'>{n}</td><td className='text-right'>{fmt(sum(week, k) * sg)}</td><td className='text-right text-tenue'>{prev.length ? fmt(sum(prev, k) * sg) : '—'}</td></tr>)}
            <tr className='border-t-2 border-urbano font-bold'><td className='py-1'>Utilidad</td><td className={`text-right ${sum(week, 'profit') >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{fmt(sum(week, 'profit'))}</td><td className='text-right'>{prev.length ? fmt(sum(prev, 'profit')) : '—'}</td></tr>
          </tbody>
        </table>
      </Card>

      <Card title='Flujo de caja · utilidad diaria'>
        <BarChart values={game.reports.slice(-30).map(r => Math.round(r.profit))} labels={game.reports.slice(-30).map(r => E.dateLabel(r.day).date.slice(0, 6))} color='#2E7D5B' />
      </Card>

      <Card title={`Crédito PyME · ${Math.round(18)} % anual`}>
        <div className='flex justify-between text-sm'><span>Línea disponible</span><b className='num'>{fmt(Math.max(0, limit - game.loan))}</b></div>
        <div className='flex flex-wrap gap-2'>
          {[100000, 250000].map(n => <Btn key={n} small kind='blue' disabled={game.loan + n > limit} onClick={() => run(g => E.takeLoan(g, n))}>Pedir {fmtK(n)}</Btn>)}
          {game.loan > 0 && <Btn small kind='ghost' onClick={() => run(g => E.repayLoan(g, g.loan))}>Liquidar</Btn>}
        </div>
      </Card>

      <Card title='Partida'>
        <div className='flex flex-wrap gap-2'>
          <Btn small kind='ghost' onClick={exportGame}><Download size={14} /> Exportar JSON</Btn>
          <Btn small kind='ghost' onClick={() => file.current?.click()}><Upload size={14} /> Importar JSON</Btn>
          <Btn small kind='ghost' onClick={() => setResetOpen(true)}><RotateCcw size={14} /> Nueva partida</Btn>
          <input ref={file} type='file' accept='application/json,.json' className='hidden' onChange={e => { const f = e.target.files?.[0]; if (f) importGame(f); e.target.value = '' }} />
        </div>
        <ul className='text-sm flex flex-col gap-1 max-h-56 overflow-auto'>
          {game.log.slice(0, 15).map((l, i) => <li key={i} className={l.kind === 'bad' ? 'text-rojo' : l.kind === 'good' ? 'text-ahorro' : ''}><span className='text-tenue text-xs num'>{E.dateLabel(E.dayOf(l.minute)).date.slice(0, 6)} {E.clockLabel(l.minute)} · </span>{l.text}</li>)}
        </ul>
      </Card>

      {resetOpen && (
        <Modal title='Nueva partida' onClose={() => setResetOpen(false)}>
          <p className='text-sm'>Se borra la partida actual de este navegador. Exporta antes si la quieres guardar.</p>
          <div className='flex gap-2'><Btn kind='ghost' onClick={() => setResetOpen(false)}>Cancelar</Btn><Btn onClick={() => { useApp.getState().reset(); setResetOpen(false) }}>Borrar y empezar</Btn></div>
        </Modal>
      )}
    </div>
  )
}
