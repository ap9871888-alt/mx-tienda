import { useMemo, useState } from 'react'
import { Lock, MapPin, Store as StoreIcon } from 'lucide-react'
import { CITIES, HOUR_PROFILE, type Colony } from '../../data/cities'
import { FORMATS, type FormatId } from '../../data/formats'
import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Pill, Modal, Kpi, BarChart } from '../components/kit'

const CITY = CITIES[0]
const maxTraffic = Math.max(...CITY.colonies.map(c => c.traffic))

// puntos estables dentro del polígono para los pines rivales
function pinsFor (col: Colony, n: number) {
  const pts = col.shape.split(' ').map(p => p.split(',').map(Number))
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length; const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
  return Array.from({ length: n }, (_, i) => [cx + Math.cos(i * 2.4 + col.traffic) * 11, cy + Math.sin(i * 2.4 + col.traffic) * 10])
}

export function Mapa () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [sel, setSel] = useState<string>('roma')
  const [confirm, setConfirm] = useState<FormatId | null>(null)
  const col = CITY.colonies.find(c => c.id === sel)!
  const est = useMemo(() => E.estimateStore(CITY.id, col.id, 'tiendita'), [col.id])
  const mine = game.stores.filter(s => s.colonyId === col.id)

  const open = () => {
    const r = useApp.getState().run(g => E.openStore(g, CITY.id, col.id, 'tiendita'))
    setConfirm(null)
    if (r?.ok && r.data) { useApp.getState().selectStore(r.data.id); useApp.getState().setTab('tienda') }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-baseline justify-between'><h1 className='font-display text-2xl uppercase'>{CITY.name}</h1><span className='text-xs text-tenue'>Más ciudades en el Hito 3</span></div>
      <Card>
        <svg viewBox='0 0 100 100' className='w-full h-auto rounded-xl bg-[#EDE8DC]' role='img' aria-label='Mapa de colonias con tráfico peatonal'>
          <defs>
            <radialGradient id='heat'><stop offset='0' stopColor='#D63B2F' stopOpacity='.65' /><stop offset='.55' stopColor='#F2B705' stopOpacity='.35' /><stop offset='1' stopColor='#F2B705' stopOpacity='0' /></radialGradient>
            <pattern id='calles' width='8' height='8' patternUnits='userSpaceOnUse' patternTransform='rotate(12)'><path d='M0 0H8M0 0V8' stroke='#fff' strokeWidth='.8' /></pattern>
          </defs>
          {CITY.colonies.map(c => {
            const [lx, ly] = c.label; const r = 10 + (c.traffic / maxTraffic) * 16
            return (
              <g key={c.id} onClick={() => setSel(c.id)} style={{ cursor: 'pointer' }}>
                <polygon points={c.shape} fill={c.id === sel ? '#FFFFFF' : '#F7F5F0'} stroke={c.id === sel ? '#1B4D8F' : '#D6CFC0'} strokeWidth={c.id === sel ? 1.2 : 0.6} />
                <polygon points={c.shape} fill='url(#calles)' opacity='.8' pointerEvents='none' />
                <circle cx={lx} cy={ly} r={r} fill='url(#heat)' pointerEvents='none' />
                <text x={lx} y={ly - 1} textAnchor='middle' fontSize='4' fontWeight='700' fill='#2B2D33'>{c.name}</text>
                <text x={lx} y={ly + 4.5} textAnchor='middle' fontSize='3' fill='#6E6A63'>{fmtK(E.estimateStore(CITY.id, c.id, 'tiendita').rent)}/mes</text>
                {pinsFor(c, c.rivals).map(([x, y], i) => <circle key={i} cx={x} cy={y} r='1.6' fill='#6E6A63' stroke='#fff' strokeWidth='.5' />)}
                {game.stores.filter(s => s.colonyId === c.id).map((s, i) => (
                  <g key={s.id} transform={`translate(${lx + 8 + i * 4} ${ly - 8})`}><path d='M0 0 l-2.6 -4 a3 3 0 1 1 5.2 0 z' fill='#D63B2F' stroke='#fff' strokeWidth='.5' /></g>
                ))}
              </g>
            )
          })}
        </svg>
        <div className='flex flex-wrap gap-3 text-[11.5px] text-tenue'>
          <span className='inline-flex items-center gap-1'><span className='w-3 h-3 rounded-full' style={{ background: 'radial-gradient(#D63B2F,#F2B705)' }} /> Tráfico peatonal</span>
          <span className='inline-flex items-center gap-1'><MapPin size={12} className='text-rojo' /> Tu tienda</span>
          <span className='inline-flex items-center gap-1'><span className='w-2.5 h-2.5 rounded-full bg-tenue' /> Competencia</span>
        </div>
      </Card>

      <Card title={col.name} right={mine.length ? <Pill tone='good'>Tienes {mine.length}</Pill> : undefined}>
        <p className='text-sm text-tenue -mt-1'>{col.blurb}</p>
        <div className='grid grid-cols-3 gap-2'>
          <Kpi label='Peatones/h' value={col.traffic} />
          <Kpi label='Poder adq.' value={`×${col.wealth.toFixed(2)}`} />
          <Kpi label='Competencia' value={col.competition > 0.5 ? 'Alta' : col.competition > 0.4 ? 'Media' : 'Baja'} tone={col.competition > 0.5 ? 'bad' : undefined} />
        </div>
        <div><span className='text-[11px] uppercase tracking-wider text-tenue'>Tráfico por hora</span>
          <BarChart values={HOUR_PROFILE.map(h => Math.round(col.traffic * h))} labels={['0 h', '23 h']} color='#F2B705' height={80} /></div>
      </Card>

      <Card title='Formatos de tienda'>
        {FORMATS.map(f => {
          const e = f.id === 'tiendita' ? est : null
          const taken = game.stores.some(s => s.colonyId === col.id && s.formatId === f.id)
          return (
            <div key={f.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
              <div className={`w-10 h-10 rounded-xl grid place-items-center ${f.available ? 'bg-rojo/10 text-rojo' : 'bg-arena text-tenue'}`}>{f.available ? <StoreIcon size={20} /> : <Lock size={18} />}</div>
              <div className='flex-1 min-w-0'>
                <b className='block'>{f.name}</b>
                <span className='text-xs text-tenue'>CAPEX {fmtK(f.capex)} · renta base {fmtK(f.rent)}/mes · margen {Math.round(f.grossMargin * 100)} %{f.available ? '' : ` · ${f.unlockNote}`}</span>
                {e && <span className='block text-xs text-ahorro font-semibold'>≈ {e.customersDay} clientes/día · utilidad ≈ {fmtK(e.profitMonth)}/mes · retorno {e.paybackMonths ?? '—'} meses</span>}
              </div>
              {f.available
                ? <Btn small disabled={taken} onClick={() => setConfirm(f.id)}>{taken ? 'Abierta' : 'Abrir'}</Btn>
                : <Pill>{f.unlockNote}</Pill>}
            </div>
          )
        })}
      </Card>

      {confirm && (
        <Modal title='Confirmar apertura' onClose={() => setConfirm(null)}>
          <p className='text-sm'>Tiendita de Esquina en <b>{col.name}</b>. Estos son todos los costos, sin letras chiquitas:</p>
          <div className='bg-white border border-borde rounded-xl p-3 text-sm flex flex-col gap-1.5 num'>
            <Row k='Equipo y adecuación (CAPEX)' v={fmt(est.capex)} />
            <Row k='Depósito: 1 mes de renta' v={fmt(est.rent)} />
            <Row k='Inventario inicial' v={fmt(est.openingCost - est.capex - est.rent)} />
            <Row k='Pagas hoy' v={fmt(est.openingCost)} bold />
            <div className='h-px bg-borde my-1' />
            <Row k='Renta mensual' v={fmt(est.rent)} />
            <Row k='Costos fijos y variables al mes' v={fmt(est.costsMonth)} />
            <Row k='Ventas estimadas al mes' v={fmt(est.salesMonth)} />
            <Row k='Utilidad estimada al mes' v={fmt(est.profitMonth)} bold tone={est.profitMonth >= 0 ? 'text-ahorro' : 'text-rojo'} />
            <Row k='Recuperas la inversión en' v={est.paybackMonths ? `${est.paybackMonths} meses` : 'No se recupera'} />
          </div>
          <p className='text-xs text-tenue'>Pronóstico con 2 cajeros de 2 ★ y precios de mercado. Tu efectivo: {fmt(game.cash)}.</p>
          <Btn onClick={open} disabled={game.cash < est.openingCost}>{game.cash < est.openingCost ? 'No alcanza el efectivo' : `Abrir por ${fmt(est.openingCost)}`}</Btn>
        </Modal>
      )}
    </div>
  )
}
function Row ({ k, v, bold, tone = '' }: { k: string; v: string; bold?: boolean; tone?: string }) {
  return <div className={`flex justify-between gap-3 ${bold ? 'font-bold' : ''} ${tone}`}><span>{k}</span><span>{v}</span></div>
}
