import { useRef, useState } from 'react'
import { Download, Upload, RotateCcw } from 'lucide-react'
import * as E from '../../engine'
import type { DayReport } from '../../engine/types'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Kpi, BarChart, Bar, Modal, Advisor } from '../components/kit'

const sum = (rs: DayReport[], k: keyof DayReport) => rs.reduce((a, r) => a + ((r[k] as number) || 0), 0)
export function Spark ({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 300},${38 - ((v - min) / span) * 34}`).join(' ')
  return <svg viewBox='0 0 300 40' className='w-full h-8' aria-hidden><polyline points={pts} fill='none' stroke={color} strokeWidth='2' strokeLinejoin='round' /></svg>
}

export function Corporativo () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [resetOpen, setResetOpen] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const last = game.reports[game.reports.length - 1]
  const week = game.reports.slice(-7); const prev = game.reports.slice(-14, -7)
  const ph = E.phaseInfo(game)
  const rows: [string, keyof DayReport, number][] = [['Ventas', 'sales', 1], ['Comisiones de servicios', 'commissions', 1], ['Costo de mercancía', 'cogs', -1], ['Nómina', 'payroll', -1], ['Renta', 'rent', -1], ['Luz CFE', 'power', -1], ['Merma y robo', 'shrink', -1], ['Servicios, seguridad y limpieza', 'upkeep', -1], ['Fletes', 'fees', -1], ['CEDIS y flotilla', 'logistics', -1], ['Intereses', 'interest', -1]]

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

      <Card fold title='Estado de resultados semanal'>
        <table className='w-full text-sm num'>
          <thead><tr className='text-[11px] uppercase text-tenue'><th className='text-left font-semibold'>Concepto</th><th className='text-right font-semibold'>Últimos 7 días</th><th className='text-right font-semibold'>7 días previos</th></tr></thead>
          <tbody>
            {rows.map(([n, k, sg]) => <tr key={k} className='border-t border-borde'><td className='py-1'>{n}</td><td className='text-right'>{fmt(sum(week, k) * sg)}</td><td className='text-right text-tenue'>{prev.length ? fmt(sum(prev, k) * sg) : '—'}</td></tr>)}
            <tr className='border-t-2 border-urbano font-bold'><td className='py-1'>Utilidad</td><td className={`text-right ${sum(week, 'profit') >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{fmt(sum(week, 'profit'))}</td><td className='text-right'>{prev.length ? fmt(sum(prev, 'profit')) : '—'}</td></tr>
          </tbody>
        </table>
      </Card>

      <Card fold title='Flujo de caja · utilidad diaria'>
        <BarChart values={game.reports.slice(-30).map(r => Math.round(r.profit))} labels={game.reports.slice(-30).map(r => E.dateLabel(r.day).date.slice(0, 6))} color='#2E7D5B' />
      </Card>

      <Advisor who='finanzas'>{game.cash > 600000 ? 'Tienes efectivo de sobra: lo que no uses en tiendas puede rendir en el fondo de inversión. Deja siempre un colchón para nómina y renta.' : 'Cuida la caja: la nómina y la renta se cobran cada noche en el corte.'}</Advisor>

      <button onClick={() => useApp.getState().setTab('banco')} className='flex items-center gap-3 rounded-2xl border border-borde bg-corp text-white p-3 text-left shadow-card'>
        <span className='text-3xl'>🏦</span><span className='flex-1'><b className='block'>Banco y oficinas</b><span className='text-xs opacity-80'>Créditos, inversiones y tu sede corporativa</span></span><span>›</span>
      </button>

      <Card fold title='Partida'>
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
