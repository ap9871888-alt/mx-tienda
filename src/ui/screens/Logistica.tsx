import { Truck, Lock, Package, Warehouse, Tag, Plus, Minus } from 'lucide-react'
import * as E from '../../engine'
import { PRODUCT_CATEGORIES, categoryOf } from '../../data/categories'
import { ECONOMY } from '../../data/economy'
import { CEDIS, PRIVATE_LABELS, VOLUME_DISCOUNT } from '../../data/logistics'
import { colonyOf } from '../../data/cities'
import { formatOf } from '../../data/formats'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Bar, Pill, Kpi } from '../components/kit'
import { NoStore } from './Tienda'

export function Logistica () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  if (!game.stores.length) return <NoStore />
  const cap = E.tripCapacity(game)
  const sat = cap ? game.tripsToday / cap : 0
  const req = E.cedisRequirement(game)
  const discount = Math.round((1 - E.purchaseFactor(game, 'abarrotes')) * 100)
  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Logística y marca</h1>

      <div className='grid grid-cols-3 gap-2'>
        <Kpi label='Ahorro en compras' value={`${discount} %`} tone={discount ? 'good' : undefined} />
        <Kpi label='Abasto' value={game.cedis ? 'CEDIS' : 'Mayorista'} />
        <Kpi label='Logística/mes' value={fmtK(E.logisticsDaily(game) * 30)} />
      </div>

      {!game.cedis ? (
        <Card title='Compra a mayoristas'>
          <p className='text-sm text-tenue'>El mayorista surte en 6 horas y cobra {fmt(ECONOMY.restockFee)} de flete por pedido. {game.stores.length >= VOLUME_DISCOUNT.minStores ? 'Con 4 o más tiendas ya te da 8 % de descuento por volumen.' : `Con ${VOLUME_DISCOUNT.minStores} tiendas te da 8 % de descuento por volumen.`}</p>
          <div className='flex items-start gap-3 bg-arena border border-borde rounded-xl p-3'>
            <Warehouse className='text-corp shrink-0' size={28} />
            <div className='flex-1 min-w-0'>
              <b>{CEDIS.name}</b>
              <p className='text-xs text-tenue'>Inventario {Math.round(CEDIS.savings[0] * 100)}–{Math.round(CEDIS.savings[2] * 100)} % más barato, sin flete del mayorista, resurtido en 3 h con {CEDIS.startingTrucks} camiones propios y la puerta a la Marca Propia. Operación: {fmt(CEDIS.monthly)}/mes + {fmt(CEDIS.truckMonthly)}/mes por camión.</p>
              <p className='text-xs mt-1'>Requisito: {CEDIS.requiredStores} tiendas (tienes {req.stores}) o {fmtK(CEDIS.requiredNetWorth)} de patrimonio (tienes {fmtK(req.worth)}).</p>
              <div className='mt-2'><Bar value={Math.max(req.stores / CEDIS.requiredStores, req.worth / CEDIS.requiredNetWorth)} color='#1B4D8F' /></div>
            </div>
          </div>
          <Btn kind='blue' disabled={!req.ok || game.cash < CEDIS.cost} onClick={() => run(g => E.buildCedis(g))}>{req.ok ? `Construir CEDIS · ${fmtK(CEDIS.cost)}` : <><Lock size={14} /> Aún no cumples el requisito</>}</Btn>
        </Card>
      ) : (
        <Card title={`CEDIS · nivel ${game.cedis.level}`} right={<Pill tone='good'>−{Math.round(CEDIS.savings[game.cedis.level - 1] * 100)} %</Pill>}>
          <div className='flex justify-between text-sm'><span>Saturación de la flotilla hoy</span><b className={`num ${sat >= 1 ? 'text-rojo' : ''}`}>{game.tripsToday} / {cap} viajes</b></div>
          <Bar value={sat} color={sat >= 1 ? '#D63B2F' : sat > 0.75 ? '#F2B705' : '#1B4D8F'} />
          {sat >= 1 && <Pill tone='bad'>Flotilla llena: los pedidos nuevos salen mañana y habrá desabasto</Pill>}
          <div className='flex items-center gap-2'>
            <Truck size={18} className='text-corp' /><span className='flex-1 text-sm'><b>{game.cedis.trucks}</b> camiones · {CEDIS.tripsPerTruck} viajes c/u al día</span>
            <Btn small kind='ghost' disabled={game.cedis.trucks <= 1} onClick={() => run(g => E.sellTruck(g))} title='Vender camión'><Minus size={14} /></Btn>
            <Btn small kind='blue' disabled={game.cash < CEDIS.truckCost} onClick={() => run(g => E.buyTruck(g))}><Plus size={14} /> {fmtK(CEDIS.truckCost)}</Btn>
          </div>
          {game.cedis.level < CEDIS.savings.length
            ? <Btn small kind='ghost' disabled={game.cash < CEDIS.upgradeCost[game.cedis.level]} onClick={() => run(g => E.upgradeCedis(g))}>Ampliar a nivel {game.cedis.level + 1} (ahorro {Math.round(CEDIS.savings[game.cedis.level] * 100)} %) · {fmtK(CEDIS.upgradeCost[game.cedis.level])}</Btn>
            : <Pill tone='good'>CEDIS al máximo</Pill>}
        </Card>
      )}

      <Card title='Marca Propia' right={game.cedis ? <Pill tone='blue'>{game.labels.length}/{PRIVATE_LABELS.length} líneas</Pill> : <Pill><Lock size={11} /> Requiere CEDIS</Pill>}>
        {PRIVATE_LABELS.map(l => {
          const on = game.labels.includes(l.id)
          return (
            <div key={l.id} className='flex items-center gap-3 py-1.5 border-t border-borde first:border-t-0'>
              <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${on ? 'bg-oferta text-urbano' : 'bg-arena text-tenue'}`}><Tag size={17} /></div>
              <div className='flex-1 min-w-0'><b className='text-sm'>{l.name}</b><p className='text-xs text-tenue'>{l.desc} Costo de {categoryOf(l.cat).name} −15 %. Más lealtad, sobre todo en Hard Discount.</p></div>
              {on ? <Pill tone='good'>En anaquel</Pill> : <Btn small kind='gold' disabled={!game.cedis || game.cash < l.cost} onClick={() => run(g => E.launchLabel(g, l.id))}>{fmtK(l.cost)}</Btn>}
            </div>
          )
        })}
      </Card>

      {game.stores.map(st => {
        const cap2 = E.shelfCapacity(st); const q = E.orderQuote(st, game)
        const o = st.orders[0]; const eta = o ? Math.max(0, o.arrivesAt - game.minute) : 0
        return (
          <Card key={st.id} title={`${colonyOf(st.cityId, st.colonyId).name} · ${formatOf(st.formatId).name}`}
            right={o ? <Pill tone={o.delayed ? 'bad' : 'blue'}><Truck size={12} /> {o.delayed ? 'retrasado · ' : ''}{Math.floor(eta / 60)} h {eta % 60} min</Pill> : undefined}>
            {PRODUCT_CATEGORIES.map(c => {
              const v = st.inventory[c.id] / cap2
              return (
                <div key={c.id} className='flex flex-col gap-1'>
                  <div className='flex justify-between text-sm'><span>{c.name}</span><span className={`num font-semibold ${v < 0.15 ? 'text-rojo' : ''}`}>{Math.floor(st.inventory[c.id])} / {cap2}{E.pendingUnits(st, c.id) ? ` (+${E.pendingUnits(st, c.id)})` : ''}</span></div>
                  <Bar value={v} color={v < 0.15 ? '#D63B2F' : v < 0.35 ? '#F2B705' : '#2E7D5B'} />
                </div>
              )
            })}
            <div className='flex flex-wrap items-center gap-2'>
              <Btn small kind='blue' disabled={!Object.keys(q.items).length || game.cash < q.cost + q.fee} onClick={() => run(g => E.placeOrder(g, st.id))}><Package size={14} /> Pedir {q.via === 'cedis' ? 'al CEDIS' : 'al mayorista'} · {fmt(q.cost + q.fee)}</Btn>
              <Btn small kind={st.autoReorder ? 'green' : 'ghost'} onClick={() => run(g => E.toggleAutoReorder(g, st.id))}>Automático {st.autoReorder ? 'activo' : 'apagado'}</Btn>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
