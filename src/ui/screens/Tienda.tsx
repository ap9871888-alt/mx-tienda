import { useState } from 'react'
import { UserPlus, GraduationCap, UserMinus, ScanLine, Camera, Sparkles, Award } from 'lucide-react'
import * as E from '../../engine'
import { CATEGORIES, PRODUCT_CATEGORIES } from '../../data/categories'
import { ECONOMY } from '../../data/economy'
import { formatOf, catLabel, REMODEL } from '../../data/formats'
import { assetUrl } from '../../renderer/assets'
import { equipFor } from '../../data/products'
import type { Store } from '../../engine/types'
import { Reparto } from './Imperio'
import { useApp, fmt, fmtK } from '../../state/store'
import { Card, Btn, Kpi, Pill, Stars, BarChart, Modal, AnalystCard, Advisor } from '../components/kit'
import { useMemo } from 'react'

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
  const [sub, setSub] = useState<'resumen' | 'precios' | 'personal' | 'interior' | 'reparto' | 'ventas'>('resumen')
  const [fireId, setFireId] = useState<number | null>(null)
  const st = game.stores.find(s => s.id === storeId) ?? game.stores[0]
  if (!st) return <NoStore />
  const f = formatOf(st.formatId); const t = st.today
  const day = E.dayOf(game.minute)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const insights = useMemo(() => E.analyzeMarket(game).filter(i => i.storeId === st.id), [day, st.id, JSON.stringify(st.margins), st.cashiers.length])
  const hist = st.history.slice(-14)

  return (
    <div className='flex flex-col gap-3'>
      <div><h1 className='font-display text-2xl uppercase leading-tight'>{E.storeName(st)}</h1>
        <p className='text-xs text-tenue'>Abierta de {f.hours[0]}:00 a {f.hours[1]}:00 · renta {fmt(E.monthlyRent(st))}/mes</p></div>
      {!st.cashiers.length && !f.ownerSells && <Pill tone='bad'>Sin cajeros nadie puede cobrar: contrata al menos uno</Pill>}
      <div className='grid grid-cols-2 gap-2'>
        <Kpi label='Ventas hoy' value={fmt(t.sales + t.commissions)} />
        <Kpi label='Clientes atendidos' value={`${t.tickets} / ${t.arrivals}`} />
        <Kpi label='Satisfacción' value={`${Math.round(st.satisfaction)} / 100`} tone={st.satisfaction >= 70 ? 'good' : st.satisfaction >= 50 ? 'warn' : 'bad'} />
        <Kpi label='Reputación' value={<Stars n={st.reputation} />} />
      </div>
      <div className='flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 sticky -top-1 z-10 bg-arena/95 backdrop-blur py-1'>
        {([['resumen', 'Resumen', 'ic-tiendas'], ['precios', 'Precios', 'ic-precios'], ['personal', 'Personal', 'ic-personal'], ['interior', 'Interior', 'ic-interior'], ['reparto', 'Reparto', 'ic-logistica'], ['ventas', 'Ventas', 'ic-ventas']] as const).map(([k, l, ic]) => (
          <button key={k} onClick={() => setSub(k)} className={`shrink-0 px-3.5 min-h-[40px] rounded-full text-sm font-bold border ${sub === k ? 'bg-urbano text-white border-urbano' : 'bg-white border-borde'}`}><img src={assetUrl(`ui/${ic}.webp`)} alt='' className='inline w-6 h-6 mr-1 -mt-0.5 object-contain' />{l}</button>))}
      </div>

      {sub === 'resumen' && <Gerente st={st} go={setSub} />}
      {sub === 'resumen' && (insights.length ? <AnalystCard insights={insights} onApply={i => { if (i.cat && i.margin != null) run(g => { const r = E.setMargin(g, st.id, i.cat!, i.margin!); return { ...r, msg: 'Margen ajustado' } }) }} />
        : <Advisor who='encargado'>Todo en orden en esta tienda. Revisa la fila en las horas pico y que no falte mercancía.</Advisor>)}
      {sub === 'precios' && <PriceWheel st={st} />}


      {sub === 'personal' && <Card title={`Cajeros · ${st.cashiers.length}/${f.maxCashiers}`} right={<span className='text-xs text-tenue num'>{Math.round(E.serviceRate(st))} clientes/h</span>}>
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
      </Card>}

      {sub === 'interior' && <Interior st={st} />}
      {sub === 'reparto' && <Reparto storeId={st.id} />}
      {sub === 'interior' && <Card title='Mantenimiento'>
        {E.isSealed(game, st) && <div className='bg-rojo text-white rounded-xl p-2.5 text-sm font-bold flex items-center gap-2'><img src={assetUrl('ui/px-candado.webp')} alt='' className='w-6 h-6' />Clausurada por el inspector hasta el día {st.sealedUntil}. Tramita los permisos que faltan.</div>}
        {([['Limpieza', st.dirt ?? 0, 'px-brillos_nuevo', 'Limpiar a fondo', E.cleanCost(st), () => run(g => E.deepClean(g, st.id)), 'Sube con cada cliente; baja con tu nivel de limpieza diaria.'], ['Pintura y fachada', st.wear ?? 0, 'px-cono_obra', 'Pintar', E.paintCost(st), () => run(g => E.paintStore(g, st.id)), 'Se desgasta con el tiempo. Una fachada vieja aleja clientes.']] as const).map(([n, v, ic, b, c, go, d]) => (
          <div key={n} className='flex items-center gap-3 py-1.5'>
            <img src={assetUrl(`ui/${ic}.webp`)} alt='' className='w-9 h-9 object-contain' />
            <div className='flex-1 min-w-0'><div className='flex justify-between text-sm font-semibold'><span>{n}</span><span className={v > 60 ? 'text-rojo' : v > 35 ? 'text-oferta' : 'text-ahorro'}>{v > 60 ? 'Mal' : v > 35 ? 'Regular' : 'Bien'}</span></div>
              <div className='h-2 bg-borde rounded-full mt-1 overflow-hidden'><div className={`h-full ${v > 60 ? 'bg-rojo' : v > 35 ? 'bg-oferta' : 'bg-ahorro'}`} style={{ width: `${100 - v}%` }} /></div>
              <span className='text-[11px] text-tenue'>{d}</span></div>
            <Btn small kind={v > 50 ? 'primary' : 'ghost'} disabled={game.cash < c} onClick={go}>{b} {fmtK(c)}</Btn>
          </div>))}
      </Card>}
      {sub === 'interior' && !f.ownerSells && <Card title='Permisos'>
        {E.PERMITS.map(p => { const v = st.permits?.[p.id]; const done = E.permitDone(game, st, p.id); const day = E.dayOf(game.minute)
          return <div key={p.id} className='flex items-center gap-3 py-1.5 border-t border-borde first:border-t-0'>
            <img src={assetUrl(done ? 'ui/pi-libreta_tareas.webp' : 'ui/px-candado.webp')} alt='' className={`w-8 h-8 object-contain ${done ? '' : 'opacity-70'}`} />
            <div className='flex-1 min-w-0'><b className='text-sm block'>{p.name}</b><span className='text-[11px] text-tenue'>{p.desc}</span></div>
            {done ? <Pill tone='good'>Listo</Pill> : v != null ? <Pill>En trámite · {v - day} d</Pill> : <Btn small disabled={game.cash < E.permitCost(st, p.id)} onClick={() => run(g => E.requestPermit(g, st.id, p.id))}>Tramitar {fmtK(E.permitCost(st, p.id))}</Btn>}
          </div> })}
        <p className='text-[11px] text-tenue'>Una semana después de abrir pueden llegar inspectores. Si falta algún permiso ponen sellos de clausura: multa y 3 días cerrada.</p>
      </Card>}
      {sub === 'interior' && <Card title='Mejoras de operación'>
        <Upgrade icon={<ScanLine size={18} />} name={`Caja de autocobro (${st.selfCheckouts}/${f.selfCheckoutSlots})`} desc={`+${ECONOMY.selfCheckoutRate} clientes/h sin sueldo`}
          action={<Btn small kind='blue' disabled={st.selfCheckouts >= f.selfCheckoutSlots || game.cash < ECONOMY.selfCheckoutCost} onClick={() => run(g => E.buySelfCheckout(g, st.id))}>{st.selfCheckouts >= f.selfCheckoutSlots ? 'Lleno' : fmtK(ECONOMY.selfCheckoutCost)}</Btn>} />
        <Upgrade icon={<Camera size={18} />} name={`Seguridad · nivel ${st.security}`} desc={`Merma y robo hormiga: ${(ECONOMY.shrinkBySecurity[st.security] * 100).toFixed(1)} % de ventas${st.security < 2 ? ` → ${(ECONOMY.shrinkBySecurity[st.security + 1] * 100).toFixed(1)} %` : ''}`}
          action={st.security < 2 ? <Btn small kind='blue' disabled={game.cash < ECONOMY.securityCost[st.security + 1]} onClick={() => run(g => E.upgradeSecurity(g, st.id))}>{fmtK(ECONOMY.securityCost[st.security + 1])}</Btn> : <Pill tone='good'>Máximo</Pill>} />
        <Upgrade icon={<Sparkles size={18} />} name='Limpieza' desc={`${fmt(ECONOMY.cleaningMonthly[st.cleaning])}/mes · +${ECONOMY.cleaningSatisfaction[st.cleaning]} satisfacción`}
          action={<div className='flex gap-1'>{[0, 1, 2].map(l => <button key={l} onClick={() => run(g => E.setCleaning(g, st.id, l))} className={`w-8 h-8 rounded-lg text-sm font-bold border ${st.cleaning === l ? 'bg-ahorro text-white border-ahorro' : 'bg-white border-borde'}`}>{l}</button>)}</div>} />
      </Card>}

      {sub === 'ventas' && <Card title='Ventas diarias · últimos 14 días'>
        <BarChart values={hist.map(h => Math.round(h.sales + h.commissions))} labels={hist.map(h => E.dateLabel(h.day).date.slice(0, 6))} />
        {hist.length > 0 && <span className='text-xs text-tenue'>Utilidad de ayer: <b className={hist[hist.length - 1].profit >= 0 ? 'text-ahorro' : 'text-rojo'}>{fmt(hist[hist.length - 1].profit)}</b></span>}
      </Card>}

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

// Ruleta de precios: una categoría a la vez, se desliza de lado y se ajusta con botones grandes
function PriceWheel ({ st }: { st: Store }) {
  const run = useApp(s => s.run)
  const cats = CATEGORIES.filter(c => !(c.service && formatOf(st.formatId).noServices))
  const [i, setI] = useState(0)
  const c = cats[Math.min(i, cats.length - 1)]
  const name = catLabel(st.formatId, c.id, c.name)
  const m = Math.round((st.margins[c.id] ?? 0) * 100)
  const pi = E.priceIndex(st, c.id); const diff = Math.round((pi - 1) * 100)
  const set = (v: number) => run(g => E.setMargin(g, st.id, c.id, Math.max(5, Math.min(50, v)) / 100))
  const move = (d: number) => setI((i + d + cats.length) % cats.length)
  let x0 = 0
  return (
    <Card>
      <div className='flex items-center gap-2' onTouchStart={e => { x0 = e.touches[0].clientX }} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1) }}>
        <button onClick={() => move(-1)} aria-label='Anterior' className='w-11 h-11 rounded-full bg-arena border border-borde text-xl font-bold shrink-0'>‹</button>
        <div className='flex-1 text-center rounded-2xl py-4 px-2 text-white' style={{ background: c.color }}>
          <span className='text-[12px] uppercase tracking-wider font-bold opacity-90'>{i + 1} / {cats.length}</span>
          <b className='block text-2xl leading-tight'>{name}</b>
          <span className='font-display text-4xl num block mt-1'>{fmt(E.unitPrice(st, c.id))}</span>
          {!c.service && <span className='text-xs font-semibold bg-black/20 rounded-full px-2 py-0.5'>{diff === 0 ? 'igual al mercado' : `${diff > 0 ? '+' : ''}${diff} % vs mercado`}</span>}
        </div>
        <button onClick={() => move(1)} aria-label='Siguiente' className='w-11 h-11 rounded-full bg-arena border border-borde text-xl font-bold shrink-0'>›</button>
      </div>
      <div className='flex justify-center gap-1.5'>{cats.map((k, j) => <button key={k.id} aria-label={k.name} onClick={() => setI(j)} className={`h-2.5 rounded-full transition-all ${j === i ? 'w-6' : 'w-2.5 opacity-40'}`} style={{ background: k.color }} />)}</div>
      {c.service ? <p className='text-sm text-center text-tenue'>Comisión fija por recarga o pago de servicio. No ocupa anaquel.</p> : <>
        <div className='grid grid-cols-[auto_1fr_auto] items-center gap-3'>
          <button onClick={() => set(m - 1)} aria-label='Bajar margen' className='w-14 h-14 rounded-2xl bg-ahorro text-white text-3xl font-bold'>−</button>
          <div className='text-center'><span className='text-[11px] uppercase text-tenue font-bold'>Margen</span><b className='block text-3xl num'>{m} %</b></div>
          <button onClick={() => set(m + 1)} aria-label='Subir margen' className='w-14 h-14 rounded-2xl bg-rojo text-white text-3xl font-bold'>+</button>
        </div>
        <input type='range' min={5} max={50} value={m} onChange={e => set(+e.target.value)} aria-label={`Margen de ${name}`} className='w-full' />
        <p className='text-xs text-tenue text-center'>Costo {fmt(E.unitCost(c.id))} · {st.today.catUnits[c.id] || 0} vendidas hoy. Más margen = más ganancia por pieza, pero menos compradores.</p>
      </>}
    </Card>
  )
}

// Interior: lo que hay dentro de tu tienda y su remodelación
function Interior ({ st }: { st: Store }) {
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const lvl = st.remodel ?? 0; const next = REMODEL[lvl + 1]
  const f = formatOf(st.formatId)
  const floor = ['#E7DFD0', '#EDE6DA', '#F4EFE6', '#FFFFFF'][lvl]
  const group = { tiendita: 'tiendita', conveniencia: 'conveniencia', hardDiscount: 'bodega', bodega: 'bodega', taqueria: 'taqueria', paleteria: 'paleteria' }[st.formatId as string]
  const art = group ? assetUrl(`ui/interior-${group}-${Math.min(2, lvl)}.webp`) : ''
  const things: [string, number][] = art ? [] : [['anaquel', f.food ? 2 : 4], ['caja', Math.max(1, st.cashiers.length)], ['autocobro', st.selfCheckouts], ['camara', st.security], ['limpieza', st.cleaning]]
  return (
    <Card title={`Interior · ${REMODEL[lvl].name}`}>
      {art && <div className='relative'><img src={art} alt={`Interior ${REMODEL[lvl].name}`} className='w-full rounded-2xl bg-white' />{lvl >= 1 && <span className='absolute top-2 left-2 bg-oferta text-urbano text-[10px] font-black rounded-full px-2 py-0.5'>{REMODEL[lvl].name.toUpperCase()}</span>}</div>}
      <div className={`relative rounded-2xl ${art ? 'p-1 grid grid-cols-6 gap-1.5' : 'border-4 border-urbano/80 p-3 grid grid-cols-4 gap-2 min-h-[170px]'}`} style={art ? undefined : { background: `repeating-linear-gradient(45deg, ${floor} 0 14px, ${lvl >= 2 ? '#E9E2D6' : '#DCD3C2'} 14px 28px)` }}>
        {things.flatMap(([n, k]) => Array.from({ length: k }, (_, j) => (
          <div key={n + j} className='bg-white/80 rounded-xl grid place-items-center p-1.5 shadow-sm'>{assetUrl(`ui/${n}.webp`) ? <img src={assetUrl(`ui/${n}.webp`)} alt={n} className='w-full aspect-square object-contain' /> : <span className='text-2xl'>📦</span>}</div>
        )))}
        {lvl >= 1 && !art && <span className='absolute -top-3 left-3 bg-oferta text-urbano text-[10px] font-black rounded-full px-2'>{REMODEL[lvl].name.toUpperCase()}</span>}
      </div>
      <p className='text-xs text-tenue'>Cada remodelación atrae +8 % de clientes y sube la satisfacción. El equipo empuja las ventas de su línea.</p>
      <h3 className='font-bold text-sm'>Equipo</h3>
      <div className='grid grid-cols-2 gap-2'>
        {equipFor(st.formatId).map(e => { const has = st.equipment?.includes(e.id); return (
          <div key={e.id} className={`rounded-xl border p-2 flex flex-col items-center text-center gap-1 ${has ? 'bg-ahorro/10 border-ahorro' : 'bg-white border-borde'}`}>
            <img src={assetUrl(`ui/eq-${e.id}.webp`)} alt='' className='h-16 object-contain' />
            <b className='text-[12px] leading-tight'>{e.name}</b><span className='text-[10.5px] text-tenue leading-tight'>{e.desc}</span>
            {has ? <span className='text-xs font-bold text-ahorro'>Instalado</span> : <Btn small disabled={game.cash < e.cost} onClick={() => run(g => E.buyEquipment(g, st.id, e.id))}>{fmtK(e.cost)}</Btn>}
          </div>) })}
      </div>
      {st.works ? <div className='rounded-xl bg-oferta/25 border border-oferta p-3 flex flex-col gap-1.5'>
        <b className='text-sm flex items-center gap-1.5'><img src={assetUrl('kit/vida/trabajador_obra_0.webp')} alt='' className='h-6' />En obra: «{REMODEL[st.works.to].name}»</b>
        <div className='flex gap-1'>{['Demolición', 'Construcción', 'Acabados'].map((n, k) => { const prog = (E.dayOf(game.minute) - st.works!.start) / (st.works!.end - st.works!.start); return <span key={n} className={`flex-1 text-[10px] text-center font-bold rounded py-0.5 ${prog >= k / 3 ? 'bg-oferta' : 'bg-borde text-tenue'}`}>{n}</span> })}</div>
        <span className='text-xs text-tenue'>Reinauguración en {Math.max(0, st.works.end - E.dayOf(game.minute))} días. Mientras tanto entra 40 % menos gente.</span>
      </div> : next ? <div className='rounded-xl border border-dashed border-borde p-3 flex items-center gap-3'>
        <div className='flex-1'><b className='text-sm'>Remodelar a «{next.name}»</b><p className='text-xs text-tenue'>{next.desc}</p></div>
        <Btn small disabled={game.cash < E.remodelCost(st)} onClick={() => run(g => E.remodelStore(g, st.id))}>{fmtK(E.remodelCost(st))}</Btn>
      </div> : <Pill tone='good'>Tienda insignia: remodelación máxima</Pill>}
    </Card>
  )
}

// hablar con el gerente: su cara cambia según cómo va la tienda y te propone qué hacer
const MANAGERS = ['Don Ramiro', 'Lupita', 'Kevin', 'Doña Carmen']
function Gerente ({ st, go }: { st: Store; go: (s: 'precios' | 'personal' | 'interior') => void }) {
  const game = useApp(s => s.game)!
  const f = formatOf(st.formatId)
  const low = PRODUCT_CATEGORIES.some(c => st.inventory[c.id] < E.shelfCapacity(st) * 0.2)
  const noStaff = !st.cashiers.length && !f.ownerSells
  const queue = st.queue.length > 5
  const mood = noStaff || low || st.satisfaction < 50 ? 1 : st.satisfaction >= 70 ? 0 : 2
  const k = st.id % 4
  const msg = noStaff ? 'Patrón, no tengo quién cobre. ¡Contrata un cajero!' : low ? 'Se nos está acabando la mercancía, hay que pedir ya.' : queue ? 'La fila está larga, la gente se desespera. ¿Otro cajero?' : st.satisfaction >= 70 ? '¡Todo va de maravilla! Los clientes están contentos.' : 'Vamos bien, pero creo que podemos ajustar precios.'
  return (
    <Card>
      <div className='flex gap-3 items-start'>
        <img src={assetUrl(`ui/gerente-${k}-${mood}.webp`)} alt='' className='w-20 h-20 object-contain shrink-0' />
        <div className='flex-1'>
          <span className='text-[11px] uppercase font-bold text-tenue'>{MANAGERS[k]} · gerente</span>
          <p className='bg-arena rounded-2xl rounded-tl-none px-3 py-2 text-[15px] font-semibold'>{msg}</p>
        </div>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        <Btn small kind={noStaff || queue ? 'primary' : 'ghost'} onClick={() => go('personal')}><img src={assetUrl('ui/ic-personal.webp')} alt='' className='w-5 h-5 inline object-contain' /> Personal</Btn>
        <Btn small kind={low ? 'primary' : 'ghost'} disabled={game.cash < 1000} onClick={() => useApp.getState().run(g => E.placeOrder(g, st.id))}><img src={assetUrl('ui/px-caja_mercancia.webp')} alt='' className='w-5 h-5 inline object-contain' /> Pedir</Btn>
        <Btn small kind='ghost' onClick={() => go('precios')}><img src={assetUrl('ui/ic-precios.webp')} alt='' className='w-5 h-5 inline object-contain' /> Precios</Btn>
      </div>
    </Card>
  )
}
