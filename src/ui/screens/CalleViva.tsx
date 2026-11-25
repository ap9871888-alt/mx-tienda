import { useEffect, useRef, useState } from 'react'
import { Store as StoreIcon } from 'lucide-react'
import { StreetScene } from '../../renderer/scene'
import { bus } from '../../state/bus'
import { useApp, fmt } from '../../state/store'
import * as E from '../../engine'
import { Btn, Kpi, Stars, Bar } from '../components/kit'
import { colonyOf, colonyById, cityOf } from '../../data/cities'
import LOTS from '../../data/cityLots.json'
import { assetUrl } from '../../renderer/assets'
import { ColonyTraffic } from '../ColonyTraffic'

export function Calle ({ bare }: { bare?: boolean } = {}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const storeId = useApp(s => s.storeId)
  const store = game.stores.find(s => s.id === storeId) ?? game.stores[0]
  useEffect(() => { if (store && store.id !== storeId) useApp.getState().selectStore(store.id) }, [store, storeId])

  useEffect(() => {
    if (!canvas.current) return
    const scene = new StreetScene(canvas.current, {
      game: () => useApp.getState().game,
      storeId: () => useApp.getState().storeId,
      speed: () => useApp.getState().speed
    })
    const off = bus.on(e => scene.onEvents(e))
    scene.start()
    return () => { off(); scene.destroy() }
  }, [])

  const t = store?.today
  return (
    <div className='flex flex-col gap-3'>
      {game.stores.length > 1 && (
        <div className='flex gap-2 overflow-x-auto pb-1'>
          {game.stores.map(s => (
            <button key={s.id} onClick={() => useApp.getState().selectStore(s.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold border ${s.id === store?.id ? 'bg-urbano text-white border-urbano' : 'bg-white border-borde'}`}>
              {colonyOf(s.cityId, s.colonyId).name}
            </button>
          ))}
        </div>
      )}
      <div className='relative rounded-2xl overflow-hidden border border-borde shadow-card bg-[#CFC9BD]'>
        <canvas ref={canvas} className='block w-full aspect-[4/3.4] sm:aspect-[16/11]' aria-label='Calle viva: vista animada de tu tienda y su esquina' role='img' />
        {!bare && <button onClick={() => useApp.getState().setTab('banco')} className='absolute left-2 top-2 bg-corp text-white rounded-full px-3 min-h-[36px] text-[12.5px] font-bold shadow flex items-center gap-1'>🏦 Banco</button>}
        {store && (
          <div className='absolute left-2 right-2 bottom-2 bg-white/95 rounded-xl px-3 py-2 flex items-center gap-3 text-[12.5px] font-semibold'>
            <span>Fila y satisfacción</span>
            <span aria-hidden>{store.satisfaction >= 70 ? '😄' : store.satisfaction >= 50 ? '🙂' : '😟'}</span>
            <div className='flex-1'><Bar value={store.satisfaction / 100} color={store.satisfaction >= 70 ? '#2E7D5B' : store.satisfaction >= 50 ? '#F2B705' : '#D63B2F'} /></div>
            <span className='num'>{store.queue.length} en fila</span>
          </div>
        )}
        {!store && (
          <div className='absolute inset-0 grid place-items-center bg-urbano/35 p-6'>
            <div className='bg-white rounded-2xl p-4 max-w-xs text-center flex flex-col gap-3 shadow-card'>
              <b className='font-display uppercase text-lg'>Tu esquina te espera</b>
              <p className='text-sm text-tenue'>Elige colonia en el mapa y abre tu Tiendita de Esquina. Verás aquí a cada cliente entrar, hacer fila y salir con su bolsa.</p>
              <Btn onClick={() => useApp.getState().setTab('mapa')}><StoreIcon size={16} /> Abrir mi primera tienda</Btn>
            </div>
          </div>
        )}
      </div>
      {store && t && !bare && (
        <>
          <div className='grid grid-cols-3 gap-2'>
            <Kpi label='Ventas hoy' value={fmt(t.sales + t.commissions)} />
            <Kpi label='Tickets' value={t.tickets} />
            <Kpi label='Ticket prom.' value={t.tickets ? fmt((t.sales + t.commissions) / t.tickets) : '—'} />
            <Kpi label='Espera prom.' value={t.tickets ? `${(t.waitSum / t.tickets).toFixed(1)} min` : '—'} tone={t.tickets && t.waitSum / t.tickets > 4 ? 'bad' : undefined} />
            <Kpi label='Se fueron' value={t.abandoned} tone={t.abandoned > 5 ? 'bad' : undefined} />
            <Kpi label='Reputación' value={<Stars n={store.reputation} />} />
          </div>
          <p className='text-xs text-tenue'>{E.storeName(store)} · {store.cashiers.length} cajero{store.cashiers.length === 1 ? '' : 's'}{store.selfCheckouts ? ` + ${store.selfCheckouts} autocobro` : ''} · capacidad {Math.round(E.serviceRate(store))} clientes/hora</p>
        </>
      )}
    </div>
  )
}

// ---------- vista principal: tu colonia desde arriba, estilo mapa de ciudad ----------
type Kind = 'popular' | 'oficinas' | 'media' | 'puerto' | 'colonial' | 'playa' | 'acueducto' | 'arco'
const kindOf = (id: string, wealth: number): Kind => ['santafe', 'polanco'].includes(id) || wealth >= 1.25 ? 'oficinas' : wealth < 0.95 ? 'popular' : 'media'
const DECOR = ['depas', 'oficinas', 'depas', 'mercado', 'plaza', 'torre']

function Colonia ({ onStreet }: { onStreet: () => void }) {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const storeId = useApp(s => s.storeId)
  const store = game.stores.find(s => s.id === storeId) ?? game.stores[0]
  const [colId, setColId] = useState<string>(store?.colonyId ?? (game.here && game.here !== 'cdmx' ? cityOf(game.here).colonies[0].id : 'roma'))
  const { city, colony } = colonyById(colId)
  const kind = (city.mapKind ?? kindOf(colony.id, E.effectiveWealth(game, city.id, colony.id))) as Kind
  const map = (LOTS as unknown as Record<Kind, { lots: number[][]; n: number; ny: number; road: string; side: string }>)[kind]
  const lots = map.lots
  const myColor = game.profile?.color ?? '#D63B2F'; const myIcon = game.profile?.icon ?? 'carrito'
  const night = E.daylight(game.minute) < 0.5
  const tod = night ? 'noche' : 'dia'
  const mine = game.stores.filter(s => s.colonyId === colony.id)
  const rivals = game.market?.rivals.flatMap(r => Array.from({ length: r.stores[colony.id] || 0 }, () => r)) ?? []
  const free = Math.max(0, colony.slots - mine.length)
  // reparte los lotes: banco, tus tiendas, rivales, locales en renta y el resto, edificios
  type Lot = { x: number; y: number; ed?: string; pin?: string; label?: string; go?: () => void; color?: string; tag?: string; mine?: boolean }
  const items: Lot[] = lots.map(([x, y]) => ({ x, y }))
  let i = 0
  const put = (l: Omit<Lot, 'x' | 'y'>) => { if (i < items.length) Object.assign(items[i++], l) }
  put({ ed: `city/ed-banco-${tod}.webp`, pin: 'banco', label: 'Banco', go: () => useApp.getState().setTab('banco') })
  const officeCol = ['', 'roma', 'polanco', 'santafe'][game.office ?? 0]
  if (officeCol === colony.id) put({ ed: `city/ed-${(game.office ?? 0) >= 3 ? 'torre' : 'oficinas'}-${tod}.webp`, pin: 'oficina', label: 'Tu sede', go: () => useApp.getState().setTab('banco') })
  if (game.cedis && colony.id === 'iztapalapa') put({ ed: `city/ed-mercado-${tod}.webp`, pin: 'cedis', label: 'Tu CEDIS', go: () => useApp.getState().setTab('logistica') })
  for (const s of mine) put({ ed: `sprites/tienda-${assetUrl(`sprites/tienda-${s.formatId}-dia.webp`) ? s.formatId : 'tiendita'}-${E.isOpen(s, E.hourOf(game.minute)) ? (night ? 'noche' : 'dia') : 'cerrada'}.webp`, pin: 'mine', color: myColor, tag: 'TU TIENDA', mine: true, label: E.storeShort(s), go: () => { useApp.getState().selectStore(s.id); onStreet() } })
  for (const r of rivals.slice(0, Math.max(0, items.length - i - 2))) put({ ed: `city/ed-plaza-${tod}.webp`, pin: 'rival', color: r.color, tag: r.name.split(' ')[0], label: r.name, go: () => useApp.getState().say(`${r.name}: ${r.style === 'precio' ? 'baja precios donde ganas' : r.style === 'premium' ? 'busca clientes con dinero' : r.style === 'barrio' ? 'tienditas de barrio' : 'abre por todos lados'}`) })
  for (let k = 0; k < Math.min(2, free) && i < items.length; k++) put({ pin: 'renta', label: 'Se renta', go: () => useApp.getState().focusColony(colony.id) })
  let d = 0
  while (i < items.length) put({ ed: `city/ed-${DECOR[(d++ + colony.id.length) % DECOR.length]}-${tod}.webp` })
  const coloniesHere = [...new Set([colId, ...game.stores.map(s => s.colonyId)])]

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {coloniesHere.map(id => (
          <button key={id} onClick={() => setColId(id)} className={`whitespace-nowrap px-3 min-h-[36px] rounded-full text-sm font-semibold border ${id === colId ? 'bg-urbano text-white border-urbano' : 'bg-white border-borde'}`}>{colonyById(id).colony.name}</button>
        ))}
      </div>
      <div className='relative rounded-2xl overflow-hidden border border-borde shadow-card'>
        <div className='relative w-full isolate' style={{ aspectRatio: '572 / 1024' }}>
          <img src={assetUrl(`city/${kind}.webp`)} alt={`Mapa de ${colony.name}`} className='absolute inset-0 w-full h-full' draggable={false} style={{ filter: night ? 'brightness(.55) saturate(.8) hue-rotate(10deg)' : undefined }} />
          <ColonyTraffic grid={map} night={night} />
          {[...items].sort((a, b) => a.y - b.y).map((l, k) => (
            // la base del edificio (punta inferior del rombo) cae justo en la punta inferior del lote
            <button key={k} onClick={l.go} disabled={!l.go} aria-label={l.label} className='absolute' style={{ left: `${l.x}%`, top: `${l.y + 2.6}%`, width: '21%', transform: 'translate(-50%, -100%)', zIndex: Math.round(l.y * 10) }}>
              {l.ed ? <img src={assetUrl(l.ed)} alt='' className='w-full drop-shadow' draggable={false} /> : <div className='w-full aspect-[2/1]' />}
              {l.pin && <span className='absolute left-1/2 -translate-x-1/2 bottom-[82%] flex flex-col items-center animate-[bounce_2.4s_ease-in-out_infinite]'>
                {l.tag && <span className='text-[9px] font-black text-white rounded-md px-1.5 py-0.5 mb-0.5 whitespace-nowrap shadow' style={{ background: l.mine ? myColor : '#2B2D33' }}>{l.tag}</span>}
                {l.color ? <Pin color={l.color}>{l.mine ? <img src={assetUrl(`ui/logo-${myIcon}.webp`)} alt='' className='w-[62%] rounded-full bg-white p-0.5' /> : <span className='text-white font-black text-sm'>{(l.tag ?? '?')[0]}</span>}</Pin>
                  : <img src={assetUrl(`city/pin-${l.pin}.webp`)} alt='' draggable={false} className='w-9' />}
              </span>}
            </button>
          ))}
        </div>
        <div className='absolute left-2 right-2 top-2 flex justify-between gap-2 pointer-events-none'>
          <span className='bg-urbano/85 text-white rounded-xl px-3 py-1.5 text-[12.5px] font-bold'>{colony.name} · {city.name}</span>
          <span className='bg-urbano/85 text-white rounded-xl px-3 py-1.5 text-[12.5px] font-bold num'>{mine.length} tuyas · {rivals.length} rivales</span>
        </div>
      </div>
      <p className='text-xs text-tenue px-1'>Toca tu tienda para ver la calle, el banco para créditos o un letrero de SE RENTA para abrir otra.</p>
    </div>
  )
}

export function CalleViva () {
  const [view, setView] = useState<'colonia' | 'calle'>('colonia')
  const hasStore = useApp(s => !!s.game?.stores.length)
  const v = hasStore ? view : 'colonia'
  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-2 bg-white border border-borde rounded-full p-1'>
        {(['colonia', 'calle'] as const).map(k => (
          <button key={k} disabled={k === 'calle' && !hasStore} onClick={() => setView(k)} className={`min-h-[36px] rounded-full text-sm font-bold ${v === k ? 'bg-rojo text-white' : 'text-tenue'}`}>{k === 'colonia' ? '🏙️ Colonia' : '🚶 Calle'}</button>
        ))}
      </div>
      {v === 'colonia' ? <Colonia onStreet={() => setView('calle')} /> : <Calle />}
    </div>
  )
}

// pin de mapa en el color de tu empresa (o del rival)
function Pin ({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className='relative w-10 h-10 grid place-items-center'>
      <span className='absolute inset-0 rounded-[50%_50%_50%_0] -rotate-45 border-2 border-urbano shadow-lg' style={{ background: color }} />
      <span className='relative grid place-items-center w-full h-full -translate-y-0.5'>{children}</span>
    </span>
  )
}
