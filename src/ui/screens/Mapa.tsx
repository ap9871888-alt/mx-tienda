import { useEffect, useMemo, useState } from 'react'
import { CITIES, HOUR_PROFILE, cityOf, colonyById, STATES, NATIONAL_MAP, CITY_STATE, stateAt } from '../../data/cities'
import { FORMATS, formatOf, type FormatId } from '../../data/formats'
import { RIVAL_STYLES } from '../../data/market'
import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { sfx } from '../sound'
import { Card, Btn, Pill, Modal, Kpi, BarChart, Icon, AnalystCard } from '../components/kit'

// qué colonia hay en un punto del mapa (usa la máscara de colores de tu lámina)

// colonia elegida desde el mapa de la ciudad (ficha de colonia → «Abrir tienda aquí»)
export let pendingColony: { city: string; colony: string } | null = null
export const pickColony = (city: string, colony: string) => { pendingColony = { city, colony } }

export function Mapa () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [cityId, setCityId] = useState(game.here ?? 'cdmx')
  const [national, setNational] = useState(useApp.getState().mapMode === 'nacional')
  const [unlock, setUnlock] = useState<string | null>(null)
  const CITY = cityOf(cityId)
  const [selBy, setSelBy] = useState<Record<string, string>>(() => { const p = pendingColony; pendingColony = null; return p ? { [p.city]: p.colony, cdmx: p.city === 'cdmx' ? p.colony : 'roma' } : { cdmx: 'roma' } })
  const sel = selBy[cityId] ?? CITY.colonies[0].id
  const setSel = (id: string) => setSelBy(m => ({ ...m, [cityId]: id }))
  // al llegar desde un letrero de SE RENTA, abre directo esa colonia
  const focus = useApp(s => s.mapFocus)
  useEffect(() => {
    if (!focus) return
    const c = colonyById(focus).city.id
    setCityId(c); setNational(false); setSelBy(m => ({ ...m, [c]: focus })); useApp.setState({ mapFocus: null })
  }, [focus])
  const here = game.here ?? 'cdmx'
  const [confirm, setConfirm] = useState<FormatId | null>(null)
  const col = CITY.colonies.find(c => c.id === sel) ?? CITY.colonies[0]
  const used = E.usedSpace(game, col.id)
  const day = E.dayOf(game.minute)
  const estimates = useMemo(() => Object.fromEntries(FORMATS.filter(f => f.available).map(f => [f.id, E.estimateStore(CITY.id, col.id, f.id, game)])) as Record<FormatId, E.Estimate>,
    // se recalcula al cambiar de colonia, de día o de número de tiendas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [col.id, cityId, day, game.stores.length, !!game.cedis, game.labels.length])
  const insights = useMemo(() => E.analyzeMarket(game).filter(i => i.kind !== 'precio'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, game.stores.length, Math.floor(game.cash / 250000)])
  const est = estimates[confirm ?? 'tiendita']
  const traffic = Math.round(E.effectiveTraffic(game, CITY.id, col.id))
  const wealth = E.effectiveWealth(game, CITY.id, col.id)
  const comp = E.effectiveCompetition(game, CITY.id, col.id)
  const cm = game.market?.colonies[col.id]

  const open = () => {
    const fid = confirm!
    const r = useApp.getState().run(g => E.openStore(g, CITY.id, col.id, fid))
    setConfirm(null)
    if (r?.ok && r.data) { useApp.getState().selectStore(r.data.id); useApp.getState().setTab('tienda') }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1'>
        <button onClick={() => setNational(true)} className={`shrink-0 px-3 min-h-[36px] rounded-full text-sm font-semibold border ${national ? 'bg-corp text-white border-corp' : 'bg-white border-borde'}`}>🇲🇽 México</button>
        {CITIES.filter(c => game.cities.includes(c.id)).map(c => (
          <button key={c.id} onClick={() => { setCityId(c.id); setNational(false) }} className={`shrink-0 px-3 min-h-[36px] rounded-full text-sm font-semibold border ${!national && c.id === cityId ? 'bg-corp text-white border-corp' : 'bg-white border-borde'}`}>
            {c.id === here ? '📍 ' : ''}{c.name} <span className='opacity-70'>· {game.stores.filter(s => s.cityId === c.id).length}</span></button>))}
      </div>
      {game.trip && <TripBanner />}
      {!national && cityId !== here && !game.trip && <Travel to={cityId} />}
      {national ? <Nacional onCity={id => { if (game.cities.includes(id)) useApp.getState().setViewCity(id); else setUnlock(id) }} /> : <>
      {/* la colonia se elige en el mapa de la ciudad; aquí solo un selector rápido */}
      <div className='-mx-4 px-4 flex gap-2 overflow-x-auto [scrollbar-width:none]'>
        {CITY.colonies.map(c => (
          <button key={c.id} onClick={() => setSel(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold border ${c.id === col.id ? 'bg-corp text-white border-corp' : 'bg-white border-borde'}`}>
            {c.name} <span className='opacity-70 num'>{E.usedSpace(game, c.id)}/{c.slots}</span>
          </button>))}
      </div>
      <Card title={col.name} right={<Pill tone={used >= col.slots ? 'bad' : used ? 'good' : undefined}>Locales {used}/{col.slots}</Pill>}>
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
        {[...FORMATS].sort((a, b) => (a.id === 'ambulante' ? (game.founder?.street ? -1 : 1) : 0) - (b.id === 'ambulante' ? (game.founder?.street ? -1 : 1) : 0)).map(f => {
          const e = f.available ? estimates[f.id] : null
          const full = used + E.spaceOf(f.id) > col.slots
          const here = game.stores.filter(s => s.colonyId === col.id && s.formatId === f.id).length
          return (
            <div key={f.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
              <Icon name={f.id} size={40} className={f.available ? '' : 'grayscale opacity-50'} />
              <div className='flex-1 min-w-0'>
                <b className='block'>{f.name}</b>
                <span className='text-xs text-tenue'>Ocupa {E.spaceOf(f.id)} local{E.spaceOf(f.id) > 1 ? 'es' : ''} · CAPEX {fmtK(f.capex)} · renta base {fmtK(f.rent)}/mes · margen {Math.round(f.grossMargin * 100)} %{f.available ? '' : ` · ${f.unlockNote}`}</span>
                {e && <span className={`block text-xs font-semibold ${e.profitMonth > 0 ? 'text-ahorro' : 'text-rojo'}`}>≈ {e.customersDay} clientes/día · utilidad ≈ {fmtK(e.profitMonth)}/mes · retorno {e.paybackMonths ?? '—'} meses</span>}
              </div>
              {f.available ? <Btn small disabled={full} onClick={() => setConfirm(f.id)}>{full ? 'Lleno' : here ? `Otra (${here})` : 'Abrir'}</Btn> : <Pill>{f.unlockNote}</Pill>}
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

      </>}
      {unlock && <UnlockModal id={unlock} onClose={() => setUnlock(null)} onDone={id => { setUnlock(null); setCityId(id); setNational(false) }} />}
      {confirm && !national && (
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

function Nacional ({ onCity }: { onCity: (id: string) => void }) {
  const game = useApp(s => s.game)!
  const [st, setSt] = useState<string>('cdmx')
  const state = STATES.find(x => x.id === st)!
  const citiesHere = CITIES.filter(c => CITY_STATE[c.id] === st)
  const onMap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const s2 = stateAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
    if (s2) { sfx.click(); setSt(s2.id) }
  }
  return (
    <div className='flex flex-col gap-3'>
      <div onClick={onMap} className='relative rounded-2xl overflow-hidden border border-borde shadow-card bg-[#B9D7EE] select-none' style={{ aspectRatio: `${NATIONAL_MAP.aspect}` }} role='img' aria-label='Mapa de México por estados'>
        <img src={assetUrl('map/estados.webp')} alt='' className='absolute inset-0 w-full h-full' draggable={false} />
        <span className='absolute w-4 h-4 rounded-full bg-rojo border-2 border-white shadow animate-ping pointer-events-none' style={{ left: `${state.x}%`, top: `${state.y}%`, transform: 'translate(-50%,-50%)' }} />
        {CITIES.map(c => {
          const on = game.cities.includes(c.id); const n = game.stores.filter(s => s.cityId === c.id).length
          return <span key={c.id} className='absolute pointer-events-none flex flex-col items-center' style={{ left: `${c.nx}%`, top: `${c.ny}%`, transform: 'translate(-50%,-100%)' }}>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow whitespace-nowrap ${on ? 'bg-corp text-white' : 'bg-white/95 text-urbano'}`}>{(game.here ?? 'cdmx') === c.id ? '📍' : on ? '' : '🔒'}{c.name}{on ? ` · ${n}` : ''}</span>
          </span>
        })}
      </div>
      <Card title={state.name}>
        {citiesHere.length ? citiesHere.map(c => {
          const on = game.cities.includes(c.id)
          return <div key={c.id} className='flex items-center gap-3'>
            <div className='flex-1 min-w-0'><b className='text-sm'>{c.name}</b> <span className='text-xs text-tenue'>{c.colonies.length} zonas{c.cedisRadius ? ' · cerca de tu CEDIS' : ''}</span></div>
            {on ? <Btn small onClick={() => onCity(c.id)}>Ver ciudad</Btn> : <Btn small onClick={() => onCity(c.id)}>Expandirme · {fmtK(c.unlock)}</Btn>}
          </div>
        }) : <p className='text-sm text-tenue'>Todavía no hay plaza disponible en {state.name}. Llegará en una próxima actualización.</p>}
      </Card>
      <Card title='Expansión nacional'>
        {CITIES.map(c => {
          const on = game.cities.includes(c.id)
          return <div key={c.id} className='flex items-center gap-3 py-1.5 border-t border-borde first:border-t-0'>
            <div className='flex-1 min-w-0'><b className='text-sm'>{c.name}</b> <span className='text-xs text-tenue'>{c.state} · {c.colonies.length} zonas</span></div>
            {on ? <Pill tone='good'>{game.stores.filter(s => s.cityId === c.id).length} tiendas</Pill> : <Btn small onClick={() => onCity(c.id)}>{fmtK(c.unlock)}</Btn>}
          </div>
        })}
        <p className='text-xs text-tenue'>Toca un estado del mapa. Para abrir una ciudad nueva necesitas 4 tiendas y viajar hasta allá.</p>
      </Card>
    </div>
  )
}
function UnlockModal ({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: (id: string) => void }) {
  const game = useApp(s => s.game)!
  const c = cityOf(id)
  const can = E.canExpand(game)
  const go = () => { const r = useApp.getState().run(g => E.unlockCity(g, id)); if (r?.ok) onDone(id) }
  return (
    <Modal title={`Expandirte a ${c.name}`} onClose={onClose}>
      <p className='text-sm'>Permisos, estudio de mercado y bodega regional en {c.state}. Después abres tiendas en sus {c.colonies.length} zonas.</p>
      {(game.here ?? 'cdmx') !== id && (game.trip ? <p className='text-sm font-semibold'>Vas en camino…</p> : <><p className='text-sm font-semibold'>Primero tienes que ir a {c.name} a conocer la plaza:</p><Travel to={id} /></>)}
      {!c.cedisRadius && <p className='text-xs text-tenue'>Tu CEDIS del Valle de México no llega hasta aquí: compras al mayorista local sin el descuento del CEDIS.</p>}
      <Btn onClick={go} disabled={!can || game.cash < c.unlock || (game.here ?? 'cdmx') !== id}>{!can ? 'Necesitas 4 tiendas' : (game.here ?? 'cdmx') !== id ? 'Viaja primero' : game.cash < c.unlock ? 'No alcanza el efectivo' : `Desbloquear por ${fmt(c.unlock)}`}</Btn>
    </Modal>
  )
}

function Travel ({ to }: { to: string }) {
  const game = useApp(s => s.game)!
  const q = E.tripQuote(game, to)
  const go = (m: 'bus' | 'avion') => { const r = useApp.getState().run(g => E.travel(g, to, m)); if (r?.ok) { if (m === 'avion') sfx.plane(); else sfx.bus() } }
  return (
    <div className='rounded-xl border border-borde bg-white p-3 flex flex-col gap-2'>
      <span className='text-sm'>Estás en <b>{cityOf(game.here ?? 'cdmx').name}</b>. {cityOf(to).name} está a {q.km.toLocaleString('es-MX')} km. Para abrir tiendas ahí tienes que viajar:</span>
      <div className='grid grid-cols-2 gap-2'>
        <button onClick={() => go('bus')} className='rounded-xl border border-borde bg-arena p-2.5 text-left min-h-[56px]'><img src={assetUrl('ui/autobus-0.webp')} alt='' className='h-10' /><b className='block'>Autobús</b><span className='text-xs text-tenue num'>{q.bus.hours} h · {fmt(q.bus.cost)}</span></button>
        <button onClick={() => go('avion')} className='rounded-xl border border-corp bg-corp text-white p-2.5 text-left min-h-[56px]'><img src={assetUrl('ui/avion-1.webp')} alt='' className='h-10' /><b className='block'>Avión</b><span className='text-xs opacity-85 num'>{q.avion.hours} h · {fmt(q.avion.cost)}</span></button>
      </div>
    </div>
  )
}

// viaje en curso: el avión despega cuadro por cuadro o el autobús avanza por la carretera
function TripBanner () {
  const game = useApp(s => s.game)!
  const trip = game.trip!
  const q = E.tripQuote(game, trip.to)
  const total = (trip.mode === 'avion' ? q.avion.hours : q.bus.hours) * 60
  const left = Math.max(0, trip.arrive - game.minute); const prog = Math.min(1, 1 - left / total)
  const frame = trip.mode === 'avion' ? `ui/avion-${Math.min(3, Math.floor(prog * 4))}.webp` : 'ui/autobus-1.webp'
  return (
    <div className='rounded-2xl bg-gradient-to-r from-corp to-[#4F8FD0] text-white p-3 overflow-hidden'>
      <div className='flex items-center gap-2 text-sm font-semibold'>
        <img src={assetUrl(`city/pin-${trip.mode === 'avion' ? 'aeropuerto' : 'central'}.webp`)} alt='' className='h-8' />
        <span className='flex-1'>Rumbo a {cityOf(trip.to).name} · llegas en {Math.ceil(left / 60)} h</span>
      </div>
      <div className='relative h-16 mt-1'>
        <div className='absolute bottom-2 inset-x-0 h-1 rounded-full bg-white/30' />
        <img src={assetUrl(frame)} alt='' className='absolute bottom-1 h-14 transition-[left] duration-500' style={{ left: `calc(${prog * 100}% - ${prog * 90}px)` }} />
      </div>
    </div>
  )
}
