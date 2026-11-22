import { useState } from 'react'
import { UserPlus, GraduationCap, UserMinus, ScanLine, Camera, Sparkles, Award } from 'lucide-react'
import * as E from '../../engine'
import { CATEGORIES } from '../../data/categories'
import { ECONOMY } from '../../data/economy'
import { formatOf } from '../../data/formats'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Kpi, Pill, Stars, BarChart, Modal } from '../components/kit'

export function NoStore () {
  return (
    <Card>
      <b>Todavía no tienes tiendas.</b>
      <p className='text-sm text-tenue'>Abre tu Tiendita de Esquina desde el mapa: verás el costo total y el retorno estimado antes de confirmar.</p>
      <Btn onClick={() => useApp.getState().setTab('mapa')}>Ir al mapa</Btn>
    </Card>
  )
}

export function Tienda () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const storeId = useApp(s => s.storeId)
  const run = useApp(s => s.run)
  const [hiring, setHiring] = useState(false)
  const [fireId, setFireId] = useState<number | null>(null)
  const st = game.stores.find(s => s.id === storeId) ?? game.stores[0]
  if (!st) return <NoStore />
  const f = formatOf(st.formatId); const t = st.today
  const hist = st.history.slice(-14)

  return (
    <div className='flex flex-col gap-3'>
      <div><h1 className='font-display text-2xl uppercase leading-tight'>{E.storeName(st)}</h1>
        <p className='text-xs text-tenue'>Abierta de {f.hours[0]}:00 a {f.hours[1]}:00 · renta {fmt(E.monthlyRent(st))}/mes</p></div>
      {!st.cashiers.length && <Pill tone='bad'>Sin cajeros nadie puede cobrar: contrata al menos uno</Pill>}
      <div className='grid grid-cols-2 gap-2'>
        <Kpi label='Ventas hoy' value={fmt(t.sales + t.commissions)} />
        <Kpi label='Clientes atendidos' value={`${t.tickets} / ${t.arrivals}`} />
        <Kpi label='Satisfacción' value={`${Math.round(st.satisfaction)} / 100`} tone={st.satisfaction >= 70 ? 'good' : st.satisfaction >= 50 ? 'warn' : 'bad'} />
        <Kpi label='Reputación' value={<Stars n={st.reputation} />} />
      </div>

      <Card title='Precio y margen por categoría'>
        {CATEGORIES.map(c => {
          const pi = E.priceIndex(st, c.id); const diff = Math.round((pi - 1) * 100)
          return (
            <div key={c.id} className='flex flex-col gap-1 py-1.5 border-t border-borde first:border-t-0'>
              <div className='flex items-center justify-between gap-2'>
                <span className='font-semibold flex items-center gap-2'><span className='w-2.5 h-2.5 rounded-full' style={{ background: c.color }} />{c.name}</span>
                <span className='num font-bold'>{fmt(E.unitPrice(st, c.id))}</span>
              </div>
              {c.service
                ? <span className='text-xs text-tenue'>Comisión fija de {fmt(c.price)} por recarga o pago de servicio. No ocupa anaquel.</span>
                : <>
                  <label className='sr-only' htmlFor={`m-${c.id}`}>Margen de {c.name}</label>
                  <input id={`m-${c.id}`} type='range' min={5} max={50} step={1} value={Math.round(st.margins[c.id] * 100)}
                    onChange={e => run(g => E.setMargin(g, st.id, c.id, +e.target.value / 100))} className='w-full' />
                  <div className='flex justify-between text-xs text-tenue'>
                    <span>Margen {Math.round(st.margins[c.id] * 100)} % · costo {fmt(E.unitCost(c.id))}</span>
                    <span className={diff > 8 ? 'text-rojo font-semibold' : diff < -5 ? 'text-ahorro font-semibold' : ''}>{diff === 0 ? 'igual al mercado' : `${diff > 0 ? '+' : ''}${diff} % vs mercado`} · {t.catUnits[c.id] || 0} vendidas hoy</span>
                  </div>
                </>}
            </div>
          )
        })}
        <p className='text-xs text-tenue'>Más margen deja más por pieza, pero menos gente compra; en Polanco aguantan precios más altos que en Iztapalapa.</p>
      </Card>

      <Card title={`Cajeros · ${st.cashiers.length}/${f.maxCashiers}`} right={<span className='text-xs text-tenue num'>{Math.round(E.serviceRate(st))} clientes/h</span>}>
        {st.cashiers.map(c => (
          <div key={c.id} className='flex items-center gap-2 py-1 border-t border-borde first:border-t-0'>
            <div className='flex-1 min-w-0'><b>{c.name}</b> <Stars n={c.stars} /><br /><span className='text-xs text-tenue'>{fmt(c.salary)}/mes · cobra ~{Math.round(E.cashierRate(c.stars, st.bonus))} clientes/h</span></div>
            {c.stars < 5 && <Btn small kind='gold' disabled={game.cash < E.trainCost(c.stars)} onClick={() => run(g => E.trainCashier(g, st.id, c.id))} title='Capacitar'><GraduationCap size={14} />{fmtK(E.trainCost(c.stars))}</Btn>}
            <Btn small kind='ghost' onClick={() => setFireId(c.id)} title='Despedir'><UserMinus size={14} /></Btn>
          </div>
        ))}
        <div className='flex flex-wrap gap-2'>
          <Btn kind='green' small disabled={st.cashiers.length >= f.maxCashiers} onClick={() => setHiring(true)}><UserPlus size={14} /> Contratar</Btn>
          <Btn kind={st.bonus ? 'blue' : 'ghost'} small onClick={() => run(g => E.toggleBonus(g, st.id))}><Award size={14} /> Bono de desempeño {st.bonus ? 'activo' : '+10 %'}</Btn>
        </div>
        <span className='text-xs text-tenue'>Con más de {ECONOMY.queueTolerance} personas en fila la gente se empieza a ir. El bono sube 10 % la rapidez y baja la rotación.</span>
      </Card>

      <Card title='Mejoras de operación'>
        <Upgrade icon={<ScanLine size={18} />} name={`Caja de autocobro (${st.selfCheckouts}/${f.selfCheckoutSlots})`} desc={`+${ECONOMY.selfCheckoutRate} clientes/h sin sueldo`}
          action={<Btn small kind='blue' disabled={st.selfCheckouts >= f.selfCheckoutSlots || game.cash < ECONOMY.selfCheckoutCost} onClick={() => run(g => E.buySelfCheckout(g, st.id))}>{st.selfCheckouts >= f.selfCheckoutSlots ? 'Lleno' : fmtK(ECONOMY.selfCheckoutCost)}</Btn>} />
        <Upgrade icon={<Camera size={18} />} name={`Seguridad · nivel ${st.security}`} desc={`Merma y robo hormiga: ${(ECONOMY.shrinkBySecurity[st.security] * 100).toFixed(1)} % de ventas${st.security < 2 ? ` → ${(ECONOMY.shrinkBySecurity[st.security + 1] * 100).toFixed(1)} %` : ''}`}
          action={st.security < 2 ? <Btn small kind='blue' disabled={game.cash < ECONOMY.securityCost[st.security + 1]} onClick={() => run(g => E.upgradeSecurity(g, st.id))}>{fmtK(ECONOMY.securityCost[st.security + 1])}</Btn> : <Pill tone='good'>Máximo</Pill>} />
        <Upgrade icon={<Sparkles size={18} />} name='Limpieza' desc={`${fmt(ECONOMY.cleaningMonthly[st.cleaning])}/mes · +${ECONOMY.cleaningSatisfaction[st.cleaning]} satisfacción`}
          action={<div className='flex gap-1'>{[0, 1, 2].map(l => <button key={l} onClick={() => run(g => E.setCleaning(g, st.id, l))} className={`w-8 h-8 rounded-lg text-sm font-bold border ${st.cleaning === l ? 'bg-ahorro text-white border-ahorro' : 'bg-white border-borde'}`}>{l}</button>)}</div>} />
      </Card>

      <Card title='Ventas diarias · últimos 14 días'>
        <BarChart values={hist.map(h => Math.round(h.sales + h.commissions))} labels={hist.map(h => E.dateLabel(h.day).date.slice(0, 6))} />
        {hist.length > 0 && <span className='text-xs text-tenue'>Utilidad de ayer: <b className={hist[hist.length - 1].profit >= 0 ? 'text-ahorro' : 'text-rojo'}>{fmt(hist[hist.length - 1].profit)}</b></span>}
      </Card>

      {hiring && (
        <Modal title='Contratar cajero' onClose={() => setHiring(false)}>
          <p className='text-sm text-tenue'>Más estrellas cobran más rápido. Llegan candidatos nuevos cada lunes.</p>
          {game.candidates.map((c, i) => (
            <div key={i} className='bg-white border border-borde rounded-xl p-3 flex items-center gap-3'>
              <div className='flex-1'><b>{c.name}</b> <Stars n={c.stars} /><br /><span className='text-xs text-tenue'>{fmt(c.salary)}/mes · ~{Math.round(E.cashierRate(c.stars, false))} clientes/h</span></div>
              <Btn small kind='green' disabled={st.cashiers.length >= f.maxCashiers} onClick={() => run(g => E.hireCashier(g, st.id, i))}>Contratar</Btn>
            </div>
          ))}
          {!game.candidates.length && <p className='text-sm'>Ya contrataste a todos. Vuelve el lunes.</p>}
        </Modal>
      )}
      {fireId != null && (
        <Modal title='Despedir' onClose={() => setFireId(null)}>
          <p className='text-sm'>Pagarás un finiquito de medio mes de sueldo. ¿Seguro?</p>
          <div className='flex gap-2'><Btn kind='ghost' onClick={() => setFireId(null)}>Cancelar</Btn><Btn onClick={() => { run(g => E.fireCashier(g, st.id, fireId)); setFireId(null) }}>Despedir</Btn></div>
        </Modal>
      )}
    </div>
  )
}
function Upgrade ({ icon, name, desc, action }: { icon: React.ReactNode; name: string; desc: string; action: React.ReactNode }) {
  return (
    <div className='flex items-center gap-3 py-1.5 border-t border-borde first:border-t-0'>
      <div className='w-9 h-9 rounded-xl bg-corp/10 text-corp grid place-items-center shrink-0'>{icon}</div>
      <div className='flex-1 min-w-0'><b className='block text-sm'>{name}</b><span className='text-xs text-tenue'>{desc}</span></div>
      {action}
    </div>
  )
}
