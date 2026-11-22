import { useEffect, useRef } from 'react'
import { Store as StoreIcon } from 'lucide-react'
import { StreetScene } from '../../renderer/scene'
import { bus } from '../../state/bus'
import { useApp, fmt } from '../../state/store'
import * as E from '../../engine'
import { Btn, Kpi, Stars, Bar } from '../components/kit'
import { colonyOf } from '../../data/cities'

export function CalleViva () {
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
        <button onClick={() => useApp.getState().setTab('banco')} className='absolute left-2 top-2 bg-corp text-white rounded-full px-3 min-h-[36px] text-[12.5px] font-bold shadow flex items-center gap-1'>🏦 Banco</button>
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
      {store && t && (
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
