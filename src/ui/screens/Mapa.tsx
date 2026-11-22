import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { CITIES, HOUR_PROFILE } from '../../data/cities'
import { FORMATS, formatOf, type FormatId } from '../../data/formats'
import { RIVAL_STYLES } from '../../data/market'
import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Card, Btn, Pill, Modal, Kpi, BarChart, Icon, AnalystCard } from '../components/kit'

const CITY = CITIES[0]

// qué colonia hay en un punto del mapa (usa la máscara de colores de tu lámina)
function colonyAt (px: number, py: number) {
  const { grid, n, ids } = CITY.map
  const gx = Math.min(n - 1, Math.max(0, Math.floor(px * n))); const gy = Math.min(n - 1, Math.max(0, Math.floor(py * n)))
  const v = +grid[gy * n + gx]
  return v ? ids[v - 1] : null
}

export function Mapa () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [sel, setSel] = useState<string>('roma')
  const [confirm, setConfirm] = useState<FormatId | null>(null)
  const col = CITY.colonies.find(c => c.id === sel)!
  const day = E.dayOf(game.minute)
  const estimates = useMemo(() => Object.fromEntries(FORMATS.filter(f => f.available).map(f => [f.id, E.estimateStore(CITY.id, col.id, f.id, game)])) as Record<FormatId, E.Estimate>,
    // se recalcula al cambiar de colonia, de día o de número de tiendas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [col.id, day, game.stores.length, !!game.cedis, game.labels.length])
  const insights = useMemo(() => E.analyzeMarket(game).filter(i => i.kind !== 'precio'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, game.stores.length, Math.floor(game.cash / 250000)])
  const est = estimates[confirm ?? 'tiendita']
  const traffic = Math.round(E.effectiveTraffic(game, CITY.id, col.id))
  const wealth = E.effectiveWealth(game, CITY.id, col.id)
  const comp = E.effectiveCompetition(game, CITY.id, col.id)
  const cm = game.market?.colonies[col.id]
  const maxT = Math.max(...CITY.colonies.map(c => E.effectiveTraffic(game, CITY.id, c.id)))

  const open = () => {
    const fid = confirm!
    const r = useApp.getState().run(g => E.openStore(g, CITY.id, col.id, fid))
    setConfirm(null)
    if (r?.ok && r.data) { useApp.getState().selectStore(r.data.id); useApp.getState().setTab('tienda') }
  }
  const onMap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const id = colonyAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
    if (id) setSel(id)
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-baseline justify-between'><h1 className='font-display text-2xl uppercase'>{CITY.name}</h1><span className='text-xs text-tenue'>Toca una colonia</span></div>
      <div className='relative rounded-2xl overflow-hidden border border-borde shadow-card bg-[#EDE8DC] aspect-square select-none' onClick={onMap} role='img' aria-label='Mapa de la Ciudad de México con colonias, tráfico y tiendas'>
        <img src={assetUrl('map/cdmx.webp')} alt='' className='absolute inset-0 w-full h-full' draggable={false} />
        {CITY.colonies.map(c => (
          <img key={c.id} src={assetUrl(`map/zona-${c.id}.png`)} alt='' draggable={false}
            className='absolute inset-0 w-full h-full pointer-events-none transition-opacity'
            style={{ opacity: c.id === sel ? 0.55 : 0, filter: 'brightness(0) saturate(100%) invert(22%) sepia(60%) saturate(2400%) hue-rotate(205deg)' }} />
        ))}
        {CITY.colonies.map(c => {
          const t = E.effectiveTraffic(game, CITY.id, c.id) / maxT
          return <div key={c.id} className='absolute rounded-full pointer-events-none' style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${10 + t * 14}%`, height: `${10 + t * 14}%`, transform: 'translate(-50%,-50%)', background: 'radial-gradient(closest-side, rgba(214,59,47,.5), rgba(242,183,5,.25) 60%, rgba(242,183,5,0))' }} />
        })}
        {CITY.colonies.map(c => {
          const mine = game.stores.filter(s => s.colonyId === c.id).length
          const rivals = E.rivalStoresIn(game, c.id)
          return (
            <div key={c.id} className='absolute pointer-events-none flex flex-col items-center' style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)' }}>
              <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md shadow whitespace-nowrap ${c.id === sel ? 'bg-corp text-white' : 'bg-white/95 text-urbano'}`}>{c.name}</span>
              <span className='flex gap-0.5 mt-0.5'>
                {Array.from({ length: mine }).map((_, i) => <MapPin key={`m${i}`} size={14} className='text-rojo fill-white drop-shadow' />)}
                {Array.from({ length: Math.min(5, rivals) }).map((_, i) => <span key={`r${i}`} className='w-2 h-2 mt-1 rounded-full bg-urbano/70 border border-white' />)}
              </span>
            </div>
          )
        })}
      </div>
      <div className='flex flex-wrap gap-3 text-[11.5px] text-tenue -mt-1'>
        <span className='inline-flex items-center gap-1'><span className='w-3 h-3 rounded-full' style={{ background: 'radial-gradient(#D63B2F,#F2B705)' }} /> Tráfico peatonal</span>
        <span className='inline-flex items-center gap-1'><MapPin size={12} className='text-rojo' /> Tus tiendas</span>
        <span className='inline-flex items-center gap-1'><span className='w-2.5 h-2.5 rounded-full bg-urbano/70' /> Tiendas rivales</span>
      </div>

      <Card title={col.name} right={game.stores.some(s => s.colonyId === col.id) ? <Pill tone='good'>Tienes {game.stores.filter(s => s.colonyId === col.id).length}</Pill> : undefined}>
        <p className='text-sm text-tenue -mt-1'>{col.blurb}</p>
        <div className='grid grid-cols-3 gap-2'>
          <Kpi label='Peatones/h' value={traffic} />
          <Kpi label='Poder adq.' value={`×${wealth.toFixed(2)}`} />
          <Kpi label='Competencia' value={`${Math.round(comp * 100)} %`} tone={comp > 0.55 ? 'bad' : undefined} />
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {cm && cm.trend > 0.0004 && <Pill tone='good'>En crecimiento</Pill>}
          {cm && cm.trend < -0.0004 && <Pill tone='bad'>A la baja</Pill>}
          {cm && cm.war > 0 && <Pill tone='bad'>Guerra de precios · {cm.war} días</Pill>}
          {cm?.events.map((e, i) => <Pill key={i} tone={e.traffic >= 0 ? 'good' : 'warn'}>{e.text}</Pill>)}
          <Pill>{E.rivalStoresIn(game, col.id)} tiendas rivales</Pill>
        </div>
        <div><span className='text-[11px] uppercase tracking-wider text-tenue'>Tráfico por hora</span>
          <BarChart values={HOUR_PROFILE.map(h => Math.round(traffic * h))} labels={['0 h', '23 h']} color='#F2B705' height={80} /></div>
      </Card>

      <AnalystCard insights={insights} max={3} />

      <Card title='Formatos de tienda'>
        {FORMATS.map(f => {
          const e = f.available ? estimates[f.id] : null
          const taken = game.stores.some(s => s.colonyId === col.id && s.formatId === f.id)
          return (
            <div key={f.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
              <Icon name={f.id} size={40} className={f.available ? '' : 'grayscale opacity-50'} />
              <div className='flex-1 min-w-0'>
                <b className='block'>{f.name}</b>
                <span className='text-xs text-tenue'>CAPEX {fmtK(f.capex)} · renta base {fmtK(f.rent)}/mes · margen {Math.round(f.grossMargin * 100)} %{f.available ? '' : ` · ${f.unlockNote}`}</span>
                {e && <span className={`block text-xs font-semibold ${e.profitMonth > 0 ? 'text-ahorro' : 'text-rojo'}`}>≈ {e.customersDay} clientes/día · utilidad ≈ {fmtK(e.profitMonth)}/mes · retorno {e.paybackMonths ?? '—'} meses</span>}
              </div>
              {f.available ? <Btn small disabled={taken} onClick={() => setConfirm(f.id)}>{taken ? 'Abierta' : 'Abrir'}</Btn> : <Pill>{f.unlockNote}</Pill>}
            </div>
          )
        })}
      </Card>

      <Card title='Cadenas rivales'>
        {game.market?.rivals.map(r => (
          <div key={r.id} className='flex items-center gap-3 py-1.5 border-t border-borde first:border-t-0'>
            <span className='w-3 h-8 rounded-full shrink-0' style={{ background: r.color }} />
            <div className='flex-1 min-w-0'><b className='text-sm'>{r.name}</b><p className='text-xs text-tenue'>{RIVAL_STYLES[r.style].label}: {RIVAL_STYLES[r.style].desc.toLowerCase()}.</p></div>
            <span className='num text-sm font-semibold'>{Object.values(r.stores).reduce((a, b) => a + b, 0)} tiendas</span>
          </div>
        ))}
        <p className='text-xs text-tenue'>Cada partida genera rivales y colonias distintas. Los rivales deciden cada lunes según dónde ganas tú.</p>
      </Card>

      {confirm && (
        <Modal title='Confirmar apertura' onClose={() => setConfirm(null)}>
          <p className='text-sm'>{formatOf(confirm).name} en <b>{col.name}</b>. Estos son todos los costos, sin letras chiquitas:</p>
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
          <p className='text-xs text-tenue'>Pronóstico con {Math.max(2, Math.ceil(formatOf(confirm).maxCashiers * 0.6))} cajeros de 2 ★, los precios típicos del formato y la competencia actual ({Math.round(comp * 100)} %). Tu efectivo: {fmt(game.cash)}.</p>
          <Btn onClick={open} disabled={game.cash < est.openingCost}>{game.cash < est.openingCost ? 'No alcanza el efectivo' : `Abrir por ${fmt(est.openingCost)}`}</Btn>
        </Modal>
      )}
    </div>
  )
}
function Row ({ k, v, bold, tone = '' }: { k: string; v: string; bold?: boolean; tone?: string }) {
  return <div className={`flex justify-between gap-3 ${bold ? 'font-bold' : ''} ${tone}`}><span>{k}</span><span>{v}</span></div>
}
