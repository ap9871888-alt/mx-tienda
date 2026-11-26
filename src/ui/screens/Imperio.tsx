import { useState } from 'react'
import * as E from '../../engine'
import { useApp, fmt, fmtK } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Card, Btn, Bar, Kpi, Modal } from '../components/kit'
import { MILESTONES, DIRECTORS, SOCIAL_PROGRAMS, DILEMMAS, INVESTORS, STATUS_ITEMS, STOCKS, STOCK_FEE, IPO } from '../../data/empire'
import { cityOf } from '../../data/cities'
import { Spark } from './Corporativo'
import { Avatar } from '../Avatar'
import { sfx } from '../sound'

// ---------- inversionistas ----------
export function Inversion () {
  const [tab, setTab] = useState<'proyectos' | 'socios'>('proyectos')
  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-2 bg-white border border-borde rounded-full p-1'>
        {([['proyectos', 'Proyectos para invertir'], ['socios', 'Socios de tu empresa']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`min-h-[40px] rounded-full text-[13px] font-bold ${tab === k ? 'bg-corp text-white' : 'text-tenue'}`}>{l}</button>)}
      </div>
      {tab === 'proyectos' ? <Proyectos /> : <Socios />}
    </div>
  )
}

// inversión ángel: proyectos que inventa la IA del mundo
// evaluación del proyecto (0–1 en 5 ejes); sale del riesgo y de su nombre para que sea estable
const dealScores = (d: E.AngelDeal) => {
  const h = [...d.id + d.name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7)
  const r = (k: number) => ((h * (k + 3)) % 100) / 100
  const base = 1 - d.risk
  return [0.25 + base * 0.5 + r(1) * 0.25, 0.15 + d.stage * 0.18, 0.3 + r(2) * 0.6, 0.2 + r(3) * 0.6, 0.2 + base * 0.6 + r(4) * 0.2].map(v => Math.min(1, v))
}
// gráfica de pentágono (radar)
export function Radar ({ values, labels }: { values: number[]; labels: string[] }) {
  const n = values.length; const R = 70; const c = 110
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] }
  const poly = (v: (i: number) => number) => values.map((_, i) => pt(i, v(i)).join(',')).join(' ')
  return (
    <svg viewBox='0 0 220 220' className='w-full max-w-[260px] mx-auto' role='img' aria-label='Evaluación del proyecto'>
      {[0.25, 0.5, 0.75, 1].map(k => <polygon key={k} points={poly(() => k)} fill='none' stroke='#D9D2C4' strokeDasharray='3 3' />)}
      {values.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke='#D9D2C4' /> })}
      <polygon points={poly(i => values[i])} fill='rgba(0,180,190,.25)' stroke='#00A7B5' strokeWidth='2.5' />
      {labels.map((l, i) => { const [x, y] = pt(i, 1.32); return <text key={l} x={x} y={y} textAnchor='middle' dominantBaseline='middle' fontSize='11' fontWeight='600' fill='#2B2D33'>{l}</text> })}
    </svg>
  )
}
function Proyectos () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const day = E.dayOf(game.minute)
  const deals = game.world?.deals ?? []
  const open = deals.filter(d => !d.invested && d.result == null)
  const mine = deals.filter(d => d.invested)
  return (
    <>
      <Card>
        <div className='flex items-center gap-3'><img src={assetUrl('ui/ic-dinero.webp')} alt='' className='w-14 h-14 object-contain' />
          <p className='text-sm'>Emprendedores te buscan para financiar sus ideas. Algunos multiplican tu dinero varias veces; otros lo pierden todo. Cada semana aparecen nuevas.</p></div>
      </Card>
      {open.map(d => {
        const sc = dealScores(d); const pre = Math.round(d.ask / (d.pct / 100) - d.ask)
        return (
          <Card key={d.id}>
            <div className='flex items-start gap-3'>
              <img src={assetUrl('ui/pi-cohete_startup.webp')} alt='' className='w-12 h-12 object-contain shrink-0' />
              <div className='flex-1 min-w-0'><b className='block text-lg leading-tight'>{d.name}</b><span className='text-sm'>{d.founder} quiere crear {d.idea}.</span></div>
              <img src={assetUrl(`ui/ret-${/a$/.test(d.founder.split(' ')[0]) ? 'directora_startup' : 'inversionista_angel'}.webp`)} alt='' className='w-14 h-14 object-contain shrink-0' />
            </div>
            <div className='grid grid-cols-2 gap-2'>
              <Kpi label='Valoración pre-dinero' value={fmtK(pre)} />
              <Kpi label={`Piden por el ${d.pct} %`} value={fmtK(d.ask)} />
            </div>
            <Radar values={sc} labels={['Gestión', 'Madurez', 'Mercado', 'Competencia', 'Finanzas']} />
            <span className='text-xs text-tenue text-center'>Riesgo {d.risk < 0.45 ? 'bajo' : d.risk < 0.65 ? 'medio' : 'alto'} · etapa {E.DEAL_STAGES[d.stage]} · quedan {Math.max(0, d.expires - day)} días</span>
            <Btn small disabled={game.cash < d.ask} onClick={() => run(g => E.investDeal(g, d.id))}>Invertir {fmtK(d.ask)}</Btn>
          </Card>)
      })}
      {!open.length && <Card><p className='text-sm text-tenue'>No hay propuestas nuevas por ahora. Vuelve en unos días.</p></Card>}
      {mine.length > 0 && (
        <Card title='Tus inversiones'>
          {mine.map(d => (
            <div key={d.id} className='py-2 border-t border-borde first:border-t-0'>
              <div className='flex justify-between text-sm'><b>{d.name}</b><span className='num'>{fmtK(d.ask)}</span></div>
              <div className='flex gap-1 mt-1'>{E.DEAL_STAGES.map((n, k) => <span key={n} className={`flex-1 text-[10px] text-center font-bold rounded py-0.5 ${k <= d.stage ? 'bg-oferta' : 'bg-borde text-tenue'}`}>{n}</span>)}</div>
              {d.result != null && <span className={`text-xs font-bold ${d.result >= 1 ? 'text-ahorro' : 'text-rojo'}`}>{d.result >= 1 ? `Éxito: ×${d.result} (${fmtK(d.ask * d.result)})` : d.result === 0 ? 'Cerró: perdiste la inversión' : `Recuperaste ${Math.round(d.result * 100)} %`}</span>}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

function Socios () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const o = game.offer; const inv = o ? INVESTORS[o.who] : null
  const conf = E.confidence(game); const equity = game.equity ?? 1
  const worth = E.netWorth(game)
  return (
    <div className='flex flex-col gap-3'>
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
  const [tab, setTab] = useState<'mercado' | 'empresa' | 'grupo'>('mercado')
  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-3 bg-white border border-borde rounded-full p-1'>
        {([['mercado', '📈 Mercado'], ['empresa', '🔔 Tu empresa'], ['grupo', '🏢 Conglomerado']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`min-h-[40px] rounded-full text-[13px] font-bold ${tab === k ? 'bg-corp text-white' : 'text-tenue'}`}>{l}</button>)}
      </div>
      {tab === 'mercado' ? <Mercado /> : tab === 'empresa' ? <TuEmpresa /> : <Conglomerado />}
    </div>
  )
}

function Mercado () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const st = game.stocks ?? {}
  const [sel, setSel] = useState<string | null>(null)
  const list = [...STOCKS.map(k => ({ id: k.id, name: k.name, sector: k.sector, img: `ui/emp-${k.id}.webp`, isNew: false })),
    ...(game.world?.companies ?? []).map(c => ({ id: c.id, name: `${c.name} · ${c.ticker}`, sector: c.sector, img: '', isNew: E.dayOf(game.minute) - c.day < 7 }))]
  const d = list.find(x => x.id === sel); const x = sel ? st[sel] : null
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-3'><img src={assetUrl('ui/bolsa.webp')} alt='Bolsa MX' className='w-16 h-16' /><div><h1 className='font-display text-2xl uppercase leading-none'>Bolsa MX</h1><span className='text-xs text-tenue'>Tu portafolio: <b className='num'>{fmt(E.portfolioValue(game))}</b></span></div></div>
      {!game.stocks && <Card><p className='text-sm'>La bolsa abre mañana en cuanto pase el primer corte.</p></Card>}
      {list.map(k => {
        const s = st[k.id]; if (!s) return null
        const h = s.hist; const ch = h.length > 7 ? s.price / h[h.length - 8] - 1 : 0
        return (
          <button key={k.id} onClick={() => setSel(k.id)} className='rounded-2xl border border-borde bg-white p-2.5 flex items-center gap-3 text-left'>
            {k.img ? <img src={assetUrl(k.img)} alt='' className='w-11 h-11 shrink-0' /> : <span className='w-11 h-11 shrink-0 rounded-full bg-corp text-white grid place-items-center text-[11px] font-black'>{k.name.split('· ')[1]}</span>}
            <div className='flex-1 min-w-0'><b className='text-sm block truncate'>{k.isNew && <span className='text-[10px] bg-oferta rounded px-1 mr-1'>NUEVA</span>}{k.name}</b><span className='text-[11px] text-tenue'>{k.sector}{s.shares ? ` · tienes ${s.shares}` : ''}</span></div>
            <div className='w-20'><Spark values={h.slice(-30)} color={ch >= 0 ? '#2E7D5B' : '#D63B2F'} /></div>
            <div className='text-right'><b className='num text-sm block'>{fmt(s.price)}</b><span className={`num text-[11px] font-semibold ${ch >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)} %</span></div>
          </button>
        )
      })}
      {d && x && (
        <Modal title={d.name} onClose={() => setSel(null)}>
          <div className='flex items-center gap-3'>{d.img && <img src={assetUrl(d.img)} alt='' className='w-14 h-14' />}<div><b className='num text-xl'>{fmt(x.price)}</b><span className='block text-xs text-tenue'>{d.sector} · comisión {(STOCK_FEE * 100).toFixed(2)} %</span></div></div>
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

// ---------- tu empresa en la Bolsa ----------
function TuEmpresa () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const worth = E.netWorth(game)
  const p = game.ipo
  if (!p) {
    const reasons = E.ipoCheck(game, worth); const val = E.companyValuation(game, worth)
    return (
      <Card title='Salir a la Bolsa MX'>
        <p className='text-sm'>Vende el {Math.round(IPO.float * 100)} % de {game.company} al público y recibe dinero fresco para crecer. Tu empresa tendrá precio de acción todos los días.</p>
        <div className='grid grid-cols-2 gap-2'><Kpi label='Valor estimado' value={fmtK(val)} /><Kpi label='Recaudarías' value={fmtK(val * IPO.float * (1 - IPO.fee))} tone='good' /></div>
        {reasons.length ? <div className='flex flex-col gap-1'>{reasons.map(r => <span key={r} className='text-sm'>⬜ {r}</span>)}</div> : <p className='text-sm font-semibold text-ahorro'>✅ Cumples todos los requisitos</p>}
        <Btn disabled={reasons.length > 0} onClick={() => { const r = run(g => E.goPublic(g, E.netWorth(g))); if (r?.ok) sfx.bell() }}>🔔 Tocar la campana</Btn>
      </Card>
    )
  }
  const ch = p.price / p.price0 - 1; const cap = p.price * IPO.shares
  return (
    <>
      <Card title={`${game.company} · TMX`}>
        <div className='flex items-end justify-between'><b className='font-display text-3xl num'>{fmt(p.price)}</b><span className={`num font-bold ${ch >= 0 ? 'text-ahorro' : 'text-rojo'}`}>{ch >= 0 ? '+' : ''}{(ch * 100).toFixed(1)} % desde la salida</span></div>
        <Spark values={p.hist} color={ch >= 0 ? '#2E7D5B' : '#D63B2F'} />
        <div className='grid grid-cols-2 gap-2'><Kpi label='Valor de mercado' value={fmtK(cap)} /><Kpi label='Tu parte' value={`${Math.round(p.own * 100)} %`} /></div>
        <p className='text-xs text-tenue'>El precio sigue tus utilidades: si ganas más, tu acción sube.</p>
      </Card>
      <Card title='Mover tu participación'>
        <div className='grid grid-cols-2 gap-2'>
          <Btn kind='green' small disabled={game.cash < IPO.shares * 0.05 * p.price} onClick={() => run(g => E.tradeOwn(g, 0.05))}>Recomprar 5 % · {fmtK(IPO.shares * 0.05 * p.price)}</Btn>
          <Btn kind='ghost' small onClick={() => run(g => E.tradeOwn(g, -0.05))}>Vender 5 % · {fmtK(IPO.shares * 0.05 * p.price)}</Btn>
        </div>
      </Card>
    </>
  )
}

// ---------- conglomerado: comprar cadenas rivales ----------
function Conglomerado () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const subs = game.subsidiaries ?? []
  const nSub = subs.reduce((a, x) => a + x.stores, 0)
  return (
    <>
      <Card title='Tu grupo'>
        <div className='grid grid-cols-3 gap-2'><Kpi label='Tiendas propias' value={game.stores.length} /><Kpi label='De tu grupo' value={nSub} /><Kpi label='Valor' value={fmtK(E.subsidiaryValue(game))} /></div>
        {subs.map((x, i) => <div key={i} className='flex items-center gap-2 text-sm border-t border-borde pt-1.5'><span className='w-3 h-3 rounded-full' style={{ background: x.color }} /><b className='flex-1'>{x.name}</b><span className='text-tenue'>{x.stores} tiendas</span></div>)}
        {!subs.length && <p className='text-xs text-tenue'>Compra cadenas rivales: dejan de competirte y sus tiendas te dan utilidades cada día.</p>}
      </Card>
      <Card title='Cadenas en venta'>
        {(game.market?.rivals ?? []).map((r, i) => {
          const n = E.rivalTotal(game, i); const c = E.buyoutCost(game, i)
          return <div key={r.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
            <span className='w-10 h-10 rounded-full grid place-items-center text-white font-black text-lg shrink-0' style={{ background: r.color }}>{r.name[0]}</span>
            <div className='flex-1 min-w-0'><b className='text-sm block'>{r.name}</b><span className='text-xs text-tenue'>{n} tiendas · deja ~{fmtK(n * 1400 * 30)}/mes</span></div>
            <Btn small disabled={game.cash < c || game.stores.length < 6} onClick={() => run(g => E.buyRival(g, i))}>{fmtK(c)}</Btn>
          </div>
        })}
        {game.stores.length < 6 && <p className='text-xs text-tenue'>Necesitas 6 tiendas propias para comprar una cadena.</p>}
      </Card>
    </>
  )
}

// ---------- calendario de temporadas y fiestas por ciudad ----------
export function Calendario () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const today = E.dateOfDay(E.dayOf(game.minute))
  const now = [...E.seasonsAt(today).map(s => ({ name: s.name, tip: s.tip, mult: s.mult, city: undefined as string | undefined })), ...E.cityEventsAt(today).map(e => ({ name: e.name, tip: e.tip, mult: e.mult, city: e.city }))]
  const next = E.upcomingEvents(new Date(today.getTime() + 864e5), 120)
  const mine = new Set(game.stores.map(s => s.cityId))
  const Row = ({ name, tip, mult, city, when }: { name: string; tip: string; mult: number; city?: string; when?: string }) => (
    <div className={`flex items-center gap-3 py-2 border-t border-borde first:border-t-0 ${city && !mine.has(city) ? 'opacity-60' : ''}`}>
      <span className={`w-12 text-center text-xs font-black rounded-lg py-1 ${mult >= 0 ? 'bg-ahorro/15 text-ahorro' : 'bg-rojo/15 text-rojo'}`}>{mult >= 0 ? '+' : ''}{Math.round(mult * 100)} %</span>
      <div className='flex-1 min-w-0'><b className='text-sm block'>{name}{city ? ` · ${cityOf(city).name}` : ''}</b><span className='text-xs text-tenue'>{when ? `${when} · ` : ''}{tip}</span></div>
    </div>
  )
  return (
    <div className='flex flex-col gap-3'>
      <Card title='Hoy'>{now.length ? now.map((e, i) => <Row key={i} {...e} />) : <p className='text-sm text-tenue'>Día normal: sin temporada especial.</p>}</Card>
      <Card title='Próximos 4 meses'>{next.map(e => <Row key={e.id} {...e} when={E.dateLabel(Math.round((e.date.getTime() - today.getTime()) / 864e5) + E.dayOf(game.minute)).date.slice(0, 6)} />)}</Card>
      <p className='text-xs text-tenue px-1'>Las fiestas de ciudades donde no tienes tiendas salen en gris: abre ahí para aprovecharlas.</p>
    </div>
  )
}

// ---------- reporte semanal ----------
// reporte semanal con forma de periódico: secciones que se deslizan, como un diario de negocios
export function WeeklyModal () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)
  const [sec, setSec] = useState(0)
  const r = game?.weekly
  if (!game || !r || game.dilemma) return null
  const close = () => { setSec(0); useApp.getState().run(g => { g.weekly = null; return { ok: true, msg: '' } }) }
  const ch = r.prevProfit != null && r.prevProfit !== 0 ? (r.profit - r.prevProfit) / Math.abs(r.prevProfit) : null
  const day = E.dayOf(game.minute)
  const news = (game.world?.news ?? []).filter(n => n.day > day - 8)
  const politics = news.filter(n => /elecci|impuest|gobierno|salario|candidat|obra/i.test(n.text))
  const market = news.filter(n => !politics.includes(n))
  const SECS = ['Portada', 'Negocio', 'Mercado', 'Política']
  const Story = ({ icon, title, text, tone }: { icon: string; title: string; text: string; tone?: 'good' | 'bad' }) => (
    <article className='py-3 border-b border-[#2B2D33]/20 flex gap-3'>
      <img src={assetUrl(`ui/${icon}.webp`)} alt='' className='w-12 h-12 object-contain shrink-0' />
      <div><h3 className={`font-bold text-[17px] leading-tight font-serif ${tone === 'bad' ? 'text-rojo' : ''}`}>{title}</h3><p className='text-[13px] leading-snug mt-0.5 font-serif'>{text}</p></div>
    </article>)
  return (
    <div className='fixed inset-0 z-50 bg-black/60 grid place-items-center p-3'>
      <div className='w-full max-w-[440px] max-h-[92dvh] flex flex-col rounded-lg bg-[#EFEBE2] shadow-2xl text-[#1E1F22]'>
        <header className='px-4 pt-4 text-center'>
          <h2 className='font-serif font-black text-[30px] leading-none tracking-tight uppercase' style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>El Diario del Tendero</h2>
          <div className='flex justify-between text-[11px] font-serif mt-1 border-y-2 border-[#1E1F22] py-0.5'><span>Semana {r.week}</span><span>{E.dateLabel(day).date}</span><span>$5.00</span></div>
          <nav className='flex gap-4 text-[15px] font-serif py-2 overflow-x-auto border-b border-[#1E1F22]'>{SECS.map((s, k) => <button key={s} onClick={() => setSec(k)} className={k === sec ? 'font-black underline underline-offset-4' : 'opacity-70'}>{s}</button>)}</nav>
        </header>
        <div className='flex-1 overflow-y-auto px-4 font-serif' style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {sec === 0 && <>
            <Story icon='pi-periodico_doblado' title={`${game.company} ${r.profit >= 0 ? 'gana' : 'pierde'} ${fmtK(Math.abs(r.profit))} en la semana`} text={`Vendió ${fmtK(r.sales)} a ${r.tickets.toLocaleString('es-MX')} clientes${r.abandoned ? `; ${r.abandoned} se fueron sin comprar` : ''}.${ch != null ? ` La utilidad ${ch >= 0 ? 'sube' : 'baja'} ${Math.abs(Math.round(ch * 100))} % contra la semana anterior.` : ''}`} tone={r.profit < 0 ? 'bad' : undefined} />
            {r.best && <Story icon='pi-trofeo_dorado' title={`La estrella: ${r.best.name}`} text={`Fue la tienda más rentable con ${fmt(r.best.profit)}.`} />}
            {r.worst && <Story icon='pi-lupa' title={`En la mira: ${r.worst.name}`} text={`Dejó ${fmt(r.worst.profit)}. Revisa precios, personal y surtido.`} tone={r.worst.profit < 0 ? 'bad' : undefined} />}
            <div className='grid grid-cols-2 gap-2 py-3'><Kpi label='Efectivo' value={fmtK(r.cash)} /><Kpi label='Patrimonio' value={fmtK(r.worth)} /></div>
          </>}
          {sec === 1 && (r.tips.length ? r.tips.map((t, k) => <Story key={k} icon='pi-libreta_tareas' title='Don Chema opina' text={t} />) : <p className='py-4 text-sm'>Semana tranquila para el negocio.</p>)}
          {sec === 2 && (market.length ? market.map((n, k) => <Story key={k} icon={n.kind === 'bad' ? 'pi-campana_notificacion' : 'pi-certificado_acciones'} title={n.text.split(/[.:]/)[0]} text={n.text} tone={n.kind === 'bad' ? 'bad' : undefined} />) : <p className='py-4 text-sm'>Sin movimientos importantes en el mercado.</p>)}
          {sec === 3 && <>
            {game.world?.election && <Story icon='pi-urna_votacion' title={`Elecciones en ${game.world.election.day - day} días`} text={game.world.election.candidates.map(c => `${c.name} ${Math.round(c.poll)} %`).join(' · ')} />}
            {politics.map((n, k) => <Story key={k} icon='pi-urna_votacion' title={n.text.split(/[.:]/)[0]} text={n.text} tone={n.kind === 'bad' ? 'bad' : undefined} />)}
            {!politics.length && !game.world?.election && <p className='py-4 text-sm'>El gobierno no movió nada esta semana.</p>}
          </>}
        </div>
        <div className='p-3 flex gap-2'>
          {sec < SECS.length - 1 && <Btn kind='ghost' onClick={() => setSec(sec + 1)}>Siguiente sección</Btn>}
          <Btn onClick={close}>Seguir jugando →</Btn>
        </div>
      </div>
    </div>
  )
}

// ---------- meta alcanzada: celebración ----------
export function MilestoneModal () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)
  const i = game?.milestone
  if (i == null || game?.dilemma) return null
  const m = MILESTONES[i]
  const close = () => useApp.getState().run(g => { g.milestone = null; return { ok: true, msg: '' } })
  return (
    <div className='fixed inset-0 z-[60] bg-black/60 grid place-items-center p-4'>
      <div className='w-full max-w-[400px] rounded-3xl overflow-hidden bg-gradient-to-b from-oferta to-[#E0A100] text-urbano shadow-2xl text-center'>
        <div className='p-5 flex flex-col items-center gap-2'>
          <img src={assetUrl('ui/ic-dinero.webp')} alt='' className='w-28 h-28 object-contain animate-[bounce_1.6s_ease-in-out_infinite]' />
          <span className='text-[11px] font-black tracking-widest'>🎉 META ALCANZADA 🎉</span>
          <h2 className='font-display text-3xl uppercase leading-tight'>{m.title}</h2>
          <p className='bg-white/80 rounded-2xl px-3 py-2 text-[15px] font-semibold'>{m.unlock}</p>
          <div className='flex gap-2 w-full mt-1'>
            <Btn kind='ghost' className='flex-1' onClick={close}>Seguir</Btn>
            <Btn className='flex-1' onClick={() => { close(); useApp.getState().setTab('directivos') }}>Ver directivos</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- directivos y comunidad ----------
export function Directivos () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const reached = E.reachedWorth(game)
  const next = MILESTONES[game.milestonesHit ?? 0]
  const mine = game.equity != null ? E.netWorth(game) * game.equity : E.netWorth(game)
  const morale = game.morale ?? 70
  return (
    <div className='flex flex-col gap-3'>
      <Card title='Tus metas'>
        <div className='flex gap-1'>{MILESTONES.map((_, k) => <span key={k} className={`h-2 flex-1 rounded-full ${k < (game.milestonesHit ?? 0) ? 'bg-oferta' : 'bg-borde'}`} />)}</div>
        {next ? <><div className='flex justify-between text-sm'><span>Siguiente: <b>{fmtK(next.amount)}</b></span><span className='num'>{fmtK(mine)}</span></div><Bar value={Math.min(1, mine / next.amount)} color='#F2B705' /></> : <p className='text-sm font-bold'>¡Completaste todas las metas!</p>}
      </Card>
      <Card title={`Ánimo del personal · ${Math.round(morale)} / 100`}>
        <Bar value={morale / 100} color={morale >= 60 ? '#2E7D5B' : morale >= 35 ? '#F2B705' : '#D63B2F'} />
        <p className='text-xs text-tenue'>Sube cuando tratas bien a tu equipo y con programas sociales. Si baja de 35, el servicio empeora en todas tus tiendas.</p>
      </Card>
      <Card title='Directivos: delega y que la cadena funcione sola'>
        {DIRECTORS.map(d => {
          const on = !!game.directors?.[d.id]; const locked = reached < d.minWorth
          return <div key={d.id} className={`flex items-center gap-3 py-2 border-t border-borde first:border-t-0 ${locked ? 'opacity-55' : ''}`}>
            <img src={assetUrl(`ui/dir-${d.id}.webp`)} alt='' className={`w-14 h-14 object-contain rounded-full bg-arena shrink-0 ${locked ? 'grayscale' : ''}`} />
            <div className='flex-1 min-w-0'><b className='text-sm block'>{d.name} · {d.who}</b><span className='text-xs text-tenue'>{d.desc} {fmtK(d.salary)}/mes</span></div>
            {locked ? <span className='text-xs font-bold'>🔒 {fmtK(d.minWorth)}</span> : <Btn small kind={on ? 'green' : 'ghost'} onClick={() => run(g => E.hireDirector(g, d.id))}>{on ? 'Trabajando' : 'Contratar'}</Btn>}
          </div>
        })}
        {game.directors?.dg && <label className='flex items-center justify-between bg-arena rounded-xl px-3 min-h-[44px] text-sm font-semibold'>Autorizar que abra tiendas con mi dinero
          <input type='checkbox' checked={!!game.dgBudget} onChange={e => run(g => { g.dgBudget = e.target.checked; return { ok: true, msg: e.target.checked ? 'Lic. Valeria abrirá tiendas cuando tengas más de $3 M' : 'Ya no abrirá tiendas' } })} className='w-6 h-6 accent-rojo' /></label>}
        <p className='text-xs text-tenue'>Tú sigues decidiendo: los problemas grandes (demandas, sindicatos, asaltos) siempre te llegan a ti.</p>
      </Card>
      <Card title='Programas sociales'>
        {SOCIAL_PROGRAMS.map(p => {
          const on = game.social?.includes(p.id)
          return <div key={p.id} className='flex items-center gap-3 py-2 border-t border-borde first:border-t-0'>
            <img src={assetUrl(`ui/soc-${p.id}.webp`)} alt='' className='w-12 h-12 object-contain shrink-0' />
            <div className='flex-1 min-w-0'><b className='text-sm block'>{p.name}</b><span className='text-xs text-tenue'>{p.desc} {p.cost ? `${fmtK(p.cost)} + ${fmtK(p.monthly)}/mes` : 'Gratis'}</span></div>
            <Btn small kind={on ? 'green' : 'ghost'} disabled={!on && game.cash < p.cost} onClick={() => run(g => E.toggleSocial(g, p.id))}>{on ? 'Activo' : 'Iniciar'}</Btn>
          </div>
        })}
        <p className='text-xs text-tenue'>Mejoran tu reputación, el ánimo de tu equipo y atraen clientes del barrio.</p>
      </Card>
    </div>
  )
}

// ---------- noticias, gobierno y obras ----------
// ficha de candidato: retrato, posturas políticas en barras y botón para donar
const posture = (c: E.PoliticalCandidate) => {
  const h = [...c.name].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const clamp = (v: number) => Math.max(0.08, Math.min(0.92, v))
  return [
    ['Socialismo', 'Capitalismo', clamp(0.55 - c.tax * 12)],
    ['Gobierno grande', 'Gobierno pequeño', clamp(1 - (c.wage - 1) * 5 - c.tax * 6)],
    ['Ambientalismo', 'Libertad económica', clamp(0.5 - c.tax * 8 + ((h % 7) - 3) * 0.04)],
    ['Igualdad', 'Tradición', clamp(0.3 + (h % 11) / 20)]
  ] as const
}
function Candidate ({ c, i, donated, canPay, onDonate }: { c: E.PoliticalCandidate; i: number; donated: number | null; canPay: boolean; onDonate: () => void }) {
  const female = /^(Dra\.|Lic\. [A-Z][a-z]+a |Mtra\.)|a$/.test(c.name.split(' ').slice(0, 2).join(' ')) || /Patricia|María|Ana|Laura|Sofía|Teresa/.test(c.name)
  return (
    <div className='py-3 border-t border-borde first:border-t-0 flex flex-col gap-2'>
      <div className='flex items-center gap-3'>
        <img src={assetUrl(`ui/ret-${female ? 'candidata_politica' : 'candidato_politico'}.webp`)} alt='' className='w-16 h-16 object-contain rounded-2xl shrink-0' style={{ background: `${c.color}22` }} />
        <div className='flex-1 min-w-0'><b className='block leading-tight'>{c.name}</b><span className='text-xs font-semibold' style={{ color: c.color }}>{c.party}</span>
          <div className='flex items-center gap-2 mt-1'><div className='flex-1'><Bar value={c.poll / 60} color={c.color} /></div><span className='text-xs font-bold num'>{Math.round(c.poll)} %</span></div></div>
      </div>
      <p className='text-xs text-tenue'>{c.desc}</p>
      {posture(c).map(([a, b, v]) => (
        <div key={a} className='grid grid-cols-[1fr_auto] gap-x-2 items-center'>
          <div className='flex justify-between text-[11px] font-semibold text-tenue'><span>{a}</span><span>{b}</span></div><span />
          <div className='relative h-2 rounded-full bg-borde'><span className='absolute top-1/2 w-4 h-4 -mt-2 -ml-2 rounded-full border-2 border-white shadow' style={{ left: `${v * 100}%`, background: c.color }} /></div><span />
        </div>))}
      <Btn small kind={donated === i ? 'primary' : 'ghost'} disabled={donated != null || !canPay} onClick={onDonate}>{donated === i ? 'Donaste ✓' : 'Donar $500 k a su campaña'}</Btn>
    </div>
  )
}

export function Mundo () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const w = game.world
  const day = E.dayOf(game.minute)
  if (!w) return <Card><p className='text-sm'>El mundo despierta mañana, después del primer corte.</p></Card>
  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-3 gap-2'>
        <Kpi label='Impuesto especial' value={`${Math.round(w.taxRate * 100)} %`} tone={w.taxRate > 0 ? 'bad' : undefined} />
        <Kpi label='Opinión pública' value={`${Math.round(w.approval)}`} tone={w.approval >= 60 ? 'good' : w.approval < 35 ? 'bad' : undefined} />
        <Kpi label='Salario mínimo' value={`×${w.wageMult.toFixed(2)}`} />
      </div>
      {w.election && (
        <Card title={`Elecciones en ${w.election.day - day} días`}>
          {w.election.candidates.map((c, i) => <Candidate key={i} c={c} i={i} donated={w.election!.donated} canPay={game.cash >= 500000} onDonate={() => run(g => E.donate(g, i))} />)}
          <p className='text-xs text-tenue'>Donar sube al candidato en las encuestas, pero si se descubre es un escándalo para tu marca.</p>
        </Card>
      )}
      {w.works.length > 0 && (
        <Card title='Obras en tus ciudades'>
          {w.works.map(o => {
            const col = cityOf(o.city).colonies.find(c => c.id === o.colony)
            return <div key={o.id} className='py-2 border-t border-borde first:border-t-0'>
              <b className='text-sm block'>🚧 {o.name} · {col?.name}</b>
              <div className='flex gap-1 mt-1'>{o.stages.map((st, k) => <span key={k} className={`flex-1 text-[10px] text-center font-bold rounded py-0.5 ${k <= o.stage ? 'bg-oferta text-urbano' : 'bg-borde text-tenue'}`}>{st}</span>)}</div>
              {o.stage < o.stages.length - 1 && <span className='text-[11px] text-tenue'>Siguiente etapa en {Math.max(0, o.next - day)} días</span>}
            </div>
          })}
        </Card>
      )}
      <Card title='Noticias MX'>
        {w.news.length ? w.news.map((n, i) => <p key={i} className={`text-sm py-1.5 border-t border-borde first:border-t-0 ${n.kind === 'bad' ? 'text-rojo' : n.kind === 'good' ? 'text-ahorro' : ''}`}><span className='text-[11px] text-tenue num'>{E.dateLabel(n.day).date.slice(0, 6)} · </span>{n.text}</p>) : <p className='text-sm text-tenue'>Sin noticias todavía.</p>}
      </Card>
    </div>
  )
}

// ---------- laboratorio de inventos ----------
export function Laboratorio () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const L = game.lab ?? { active: null, done: [], failed: [] }
  const day = E.dayOf(game.minute)
  const act = L.active ? E.INVENTIONS.find(x => x.id === L.active!.id) : null
  return (
    <div className='flex flex-col gap-3'>
      <Card>
        <p className='text-sm'>Invierte en ideas propias. Cada invento tarda unos días y puede salir bien (te da una ventaja para siempre) o fallar (pierdes lo invertido y puedes reintentar).</p>
        {act && <div className='rounded-xl bg-oferta/25 border border-oferta p-3'>
          <b className='text-sm'>🔬 Desarrollando: {act.name}</b>
          <Bar value={1 - Math.max(0, L.active!.end - day) / act.days} color='#F2B705' />
          <span className='text-xs text-tenue'>Listo en {Math.max(0, L.active!.end - day)} días · probabilidad de éxito {Math.round(act.chance * 100)} %</span>
        </div>}
      </Card>
      {E.INVENTIONS.map(d => {
        const done = L.done.includes(d.id); const failed = L.failed.filter(x => x === d.id).length
        return <div key={d.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${done ? 'bg-ahorro/10 border-ahorro' : 'bg-white border-borde'}`}>
          <img src={assetUrl(`ui/${d.icon}.webp`)} alt='' className='w-12 h-12 object-contain shrink-0' />
          <div className='flex-1 min-w-0'><b className='text-sm block'>{d.name}</b><span className='text-xs text-tenue block'>{d.desc}</span>
            <span className='text-xs font-semibold block'>{d.effect}</span>
            {!done && <span className='text-[11px] text-tenue'>{d.days} días · éxito {Math.round(d.chance * 100)} %{failed ? ` · falló ${failed} vez` : ''}</span>}</div>
          {done ? <span className='text-xs font-bold text-ahorro'>Inventado</span> : <Btn small disabled={!!L.active || game.cash < d.cost} onClick={() => run(g => E.startInvention(g, d.id))}>{fmtK(d.cost)}</Btn>}
        </div>
      })}
    </div>
  )
}

// ---------- reparto a domicilio de una tienda ----------
export function Reparto ({ storeId }: { storeId: number }) {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const run = useApp(s => s.run)
  const st = game.stores.find(x => x.id === storeId)!
  const drones = game.lab?.done.includes('drones')
  return (
    <Card title='Reparto a domicilio'>
      <div className='grid grid-cols-2 gap-2'><Kpi label='Repartidores' value={`${st.riders ?? 0} / 4`} /><Kpi label='Pedidos hoy' value={st.deliveries ?? 0} /></div>
      <div className='flex gap-2'>{Array.from({ length: st.riders ?? 0 }, (_, i) => <img key={i} src={assetUrl(drones ? 'sprites/veh-ev-dron-0.webp' : 'sprites/veh-moto-0.webp')} alt='' className='w-14 h-14 object-contain' />)}</div>
      <Btn disabled={(st.riders ?? 0) >= 4 || game.cash < E.RIDER_COST} onClick={() => run(g => E.hireRider(g, st.id))}>+ Repartidor en moto · {fmtK(E.RIDER_COST)}</Btn>
      <p className='text-xs text-tenue'>Cada repartidor entrega 14 a 24 pedidos al día (cobra {fmtK(E.RIDER_MONTHLY)}/mes). La App de pedidos y los drones del Laboratorio los multiplican.</p>
    </Card>
  )
}
