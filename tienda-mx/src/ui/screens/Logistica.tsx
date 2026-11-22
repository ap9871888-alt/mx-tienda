import { Truck, Lock, Package } from 'lucide-react'
import * as E from '../../engine'
import { PRODUCT_CATEGORIES } from '../../data/categories'
import { ECONOMY } from '../../data/economy'
import { colonyOf } from '../../data/cities'
import { useApp, fmt } from '../../state/store'
import { Card, Btn, Bar, Pill } from '../components/kit'
import { NoStore } from './Tienda'

export function Logistica () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  if (!game.stores.length) return <NoStore />
  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Logística y marca</h1>
      <Card title='Fase 1 · compra a mayoristas'>
        <p className='text-sm text-tenue'>El mayorista surte en 6 horas y cobra {fmt(ECONOMY.restockFee)} de flete por pedido, al costo de lista (1.00×). Con el pedido automático se resurte solo cuando una categoría baja de {ECONOMY.reorderThreshold * 100} %.</p>
      </Card>
      {game.stores.map(st => {
        const cap = E.shelfCapacity(st); const q = E.orderQuote(st)
        const eta = st.orders[0] ? Math.max(0, st.orders[0].arrivesAt - game.minute) : 0
        return (
          <Card key={st.id} title={colonyOf(st.cityId, st.colonyId).name} right={st.orders.length ? <Pill tone='blue'><Truck size={12} /> llega en {Math.floor(eta / 60)} h {eta % 60} min</Pill> : undefined}>
            {PRODUCT_CATEGORIES.map(c => {
              const v = st.inventory[c.id] / cap
              return (
                <div key={c.id} className='flex flex-col gap-1'>
                  <div className='flex justify-between text-sm'><span>{c.name}</span><span className={`num font-semibold ${v < 0.15 ? 'text-rojo' : ''}`}>{Math.floor(st.inventory[c.id])} / {cap}{E.pendingUnits(st, c.id) ? ` (+${E.pendingUnits(st, c.id)})` : ''}</span></div>
                  <Bar value={v} color={v < 0.15 ? '#D63B2F' : v < 0.35 ? '#F2B705' : '#2E7D5B'} />
                </div>
              )
            })}
            <div className='flex flex-wrap items-center gap-2'>
              <Btn small kind='blue' disabled={!Object.keys(q.items).length || game.cash < q.cost + q.fee} onClick={() => run(g => E.placeOrder(g, st.id))}><Package size={14} /> Pedir ya · {fmt(q.cost + q.fee)}</Btn>
              <Btn small kind={st.autoReorder ? 'green' : 'ghost'} onClick={() => run(g => E.toggleAutoReorder(g, st.id))}>Pedido automático {st.autoReorder ? 'activo' : 'apagado'}</Btn>
            </div>
          </Card>
        )
      })}
      <Card title='Próximos desbloqueos'>
        {[['CEDIS propio', 'Al superar 10 tiendas o $12 M: inventario 22–30 % más barato, flotilla propia y nuevas ciudades.', 'Hito 2'],
          ['Flotilla de reparto', 'Camiones propios que despachan desde el CEDIS; si faltan, hay desabasto.', 'Hito 2'],
          ['Marca Propia', 'Agua, botanas, lácteos, limpieza y pan con +12 a +18 % de margen neto.', 'Hito 2']].map(([n, d, h]) => (
          <div key={n} className='flex items-start gap-3 py-1.5 border-t border-borde first:border-t-0'>
            <Lock size={18} className='text-tenue mt-0.5 shrink-0' /><div className='flex-1'><b className='text-sm'>{n}</b><p className='text-xs text-tenue'>{d}</p></div><Pill>{h}</Pill>
          </div>
        ))}
      </Card>
    </div>
  )
}
