import { useState } from 'react'
import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Card, Btn, Bar, Kpi, Modal } from '../components/kit'
import { DILEMMAS, INVESTORS, STATUS_ITEMS, STOCKS, STOCK_FEE } from '../../data/empire'
import { Spark } from './Corporativo'
import { Avatar } from '../Avatar'

// ---------- inversionistas ----------
export function Inversion () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const o = game.offer; const inv = o ? INVESTORS[o.who] : null
  const conf = E.confidence(game); const equity = game.equity ?? 1
  const worth = E.netWorth(game)
  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Inversionistas</h1>
      {o && inv ? (
        <div className='rounded-2xl bg-urbano text-white p-4 flex flex-col gap-3 shadow-card'>
          <div className='flex items-start gap-3'>
            <img src={assetUrl(`ui/${inv.avatar}.webp`)} alt='' className='w-16 h-16 rounded-full bg-white shrink-0' />
            <div className='bg-white text-urbano rounded-2xl rounded-tl-none px-3 py-2 text-sm font-semibold'>
              Te ofrezco <b className='text-ahorro num'>{fmt(o.amount)}</b> por el <b>{Math.round(o.pct * 100)} %</b> de {game.company}.
              <span className='block text-[11px] text-tenue font-normal'>{inv.name} · {inv.kind}</span>
            </div>
          </div>
          <Btn kind='green' onClick={() => run(g => E.answerOffer(g, 'aceptar'))}>✓ Aceptar trato</Btn>
          <Btn kind='blue' onClick={() => run(g => E.answerOffer(g, 'negociar'))}>⇄ Negociar 5 % menos</Btn>
          <Btn onClick={() => run(g => E.answerOffer(g, 'rechazar'))}>✕ Rechazar</Btn>
          <p className='text-[11px] opacity-80'>Negociar puede salir bien o el inversionista puede irse. Tu estatus y tus utilidades ayudan.</p>
        </div>
      ) : <Card><p className='text-sm'>{game.stores.length < 3 ? 'Los inversionistas buscan cadenas: abre al menos 3 tiendas y te empezarán a buscar.' : 'Ningún inversionista te ha buscado esta semana. Mejora tus utilidades y tu estatus para atraerlos.'}</p></Card>}
      <Card title='Nivel de confianza'>
        <Bar value={conf} color='#2E7D5B' />
        <span className='text-xs text-tenue'>Sube con tus utilidades de los últimos 30 días, tus tiendas y tu estilo de vida.</span>
      </Card>
      <div className='grid grid-cols-2 gap-2'>
        <Kpi label='Tu parte' value={`${Math.round(equity * 100)} %`} />
        <Kpi label='Tu patrimonio' value={fmtK(worth * equity)} tone={worth * equity >= 10e6 ? 'good' : undefined} />
      </div>
      <Card title='Socios'>
        <div className='flex justify-between text-sm'><b>Tú (fundador)</b><span className='num'>{Math.round(equity * 100)} %</span></div>
        {(game.investors ?? []).map((x, i) => <div key={i} className='flex justify-between text-sm border-t border-borde pt-1'><span>{INVESTORS[x.who].name}</span><span className='num text-tenue'>{fmtK(x.amount)}</span></div>)}
        <p className='text-xs text-tenue'>Meta del juego: llegar a $10 M de patrimonio propio. Vender mucho de tu empresa te da dinero hoy, pero te deja menos mañana.</p>
      </Card>
    </div>
  )
}

// ---------- estilo de vida ----------
export function Estilo () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const f = game.founder
  const age = f ? f.age + Math.floor(E.dayOf(game.minute) / 365) : null
  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Estilo de vida</h1>
      <Card>
        <div className='flex items-center gap-3'>
          {f ? <Avatar skin={f.skin} age={age ?? 18} shirt={game.profile?.color} /> : <img src={assetUrl(`ui/fundador-${game.profile?.founder ?? 'm'}.webp`)} alt='' className='w-16 h-16 rounded-full' />}
          <div className='flex-1'><b>{game.company}</b>{age != null && <span className='block text-xs text-tenue'>{age} años</span>}
            <span className='block text-xs'>Estatus: <b className='text-ahorro'>+{Math.round(E.statusBonus(game) * 100)} %</b> al negociar</span></div>
        </div>
        <p className='text-xs text-tenue'>Estas compras no te dan ingresos: solo un poco de estatus ante inversionistas. Cuentan a medio valor en tu patrimonio.</p>
      </Card>
      {STATUS_ITEMS.map(it => { const has = game.lifestyle?.includes(it.id); return (
        <div key={it.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${has ? 'bg-ahorro/10 border-ahorro' : 'bg-white border-borde'}`}>
          <img src={assetUrl(`ui/vida-${it.id}.webp`)} alt='' className='w-16 h-16 object-contain' />
          <div className='flex-1'><b className='text-sm'>{it.name}</b><span className='block text-xs text-tenue'>{it.desc}</span></div>
          {has ? <span className='text-xs font-bold text-ahorro'>Tuyo</span> : <Btn small disabled={game.cash < it.cost} onClick={() => run(g => E.buyStatus(g, it.id))}>{fmtK(it.cost)}</Btn>}
        </div>) })}
    </div>
  )
}

// ---------- Bolsa MX ----------
export function Bolsa () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const st = game.stocks ?? {}
  const [sel, setSel] = useState<string | null>(null)
  const d = STOCKS.find(x => x.id === sel); const x = sel ? st[sel] : null
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-3'><img src={assetUrl('ui/bolsa.webp')} alt='Bolsa MX' className='w-16 h-16' /><div><h1 className='font-display text-2xl uppercase leading-none'>Bolsa MX</h1><span className='text-xs text-tenue'>Tu portafolio: <b className='num'>{fmt(E.portfolioValue(game))}</b></span></div></div>
      {!game.stocks && <Card><p className='text-sm'>La bolsa abre mañana en cuanto pase el primer corte.</p></Card>}
      {STOCKS.map(k => {
        const s = st[k.id]; if (!s) return null
        const h = s.hist; const ch = h.length > 7 ? s.price / h[h.length - 8] - 1 : 0
        return (
          <button key={k.id} onClick={() => setSel(k.id)} className='rounded-2xl border border-borde bg-white p-2.5 flex items-center gap-3 text-left'>
            <img src={assetUrl(`ui/emp-${k.id}.webp`)} alt='' className='w-11 h-11 shrink-0' />
            <div className='flex-1 min-w-0'><b className='text-sm block truncate'>{k.name}</b><span className='text-[11px] text-tenue'>{k.sector}{s.shares ? ` · tienes ${s.shares}` : ''}</span></div>
            <div className='w-20'><Spark values={h.slice(-30)} color={ch >= 0 ? '#2E7D5B' : '#D63B2F'} /></div>
            <div className='text-right'><b className='num text-sm block'>{fmt(s.price)}</b><span className={`num text-[11px] font-semibold ${ch >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)} %</span></div>
          </button>
        )
      })}
      {d && x && (
        <Modal title={d.name} onClose={() => setSel(null)}>
          <div className='flex items-center gap-3'><img src={assetUrl(`ui/emp-${d.id}.webp`)} alt='' className='w-14 h-14' /><div><b className='num text-xl'>{fmt(x.price)}</b><span className='block text-xs text-tenue'>{d.sector} · comisión {(STOCK_FEE * 100).toFixed(2)} %</span></div></div>
          <Spark values={x.hist} color='#1B4D8F' />
          {x.shares > 0 && <p className='text-sm'>Tienes {x.shares} acciones ({fmt(x.shares * x.price)}) · ganancia {fmt(x.shares * x.price - x.cost)}</p>}
          <div className='grid grid-cols-3 gap-2'>{[10, 100, 1000].map(n => <Btn key={n} small kind='green' disabled={game.cash < n * x.price} onClick={() => run(g => E.tradeStock(g, d.id, n))}>+{n}</Btn>)}</div>
          {x.shares > 0 && <Btn kind='ghost' onClick={() => run(g => E.tradeStock(g, d.id, -x.shares))}>Vender todo</Btn>}
        </Modal>
      )}
    </div>
  )
}

// ---------- dilema global: noticia de última hora ----------
export function DilemmaModal () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)
  const d = game?.dilemma ? DILEMMAS.find(x => x.id === game.dilemma!.id) : null
  if (!d) return null
  return (
    <div className='fixed inset-0 z-50 bg-black/50 grid place-items-center p-4'>
      <div className='w-full max-w-[420px] rounded-3xl overflow-hidden bg-white shadow-2xl'>
        <div className='bg-rojo text-white px-4 py-3'><span className='text-[11px] font-black tracking-wider'>⚠️ NOTICIAS MX · ÚLTIMA HORA</span><h2 className='font-display text-2xl uppercase leading-tight'>{d.title}</h2></div>
        <div className='p-4 flex flex-col gap-2.5'>
          <p className='text-[15px]'>{d.text}</p>
          {d.options.map((o, i) => (
            <button key={i} onClick={() => useApp.getState().run(g => E.resolveDilemma(g, i))} className='rounded-xl border border-borde bg-arena px-3 py-2.5 text-left min-h-[48px] active:bg-borde/50'>
              <b className='block text-sm'>{o.label}</b>
              <span className='text-xs text-tenue'>{o.cost ? `Cuesta ${fmtK(o.cost)}` : 'Sin costo'}{o.risk ? ` · riesgo ${Math.round(o.risk.p * 100)} %` : ''}</span>
            </button>
          ))}
          <span className='text-[11px] text-tenue text-center'>El juego está en pausa hasta que decidas.</span>
        </div>
      </div>
    </div>
  )
}
