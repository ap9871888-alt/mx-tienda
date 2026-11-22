import { useEffect, useState } from 'react'
import { Footprints, Map, Store, Truck, Building2, Pause, Play, FastForward, ChevronsRight } from 'lucide-react'
import { useApp, startLoop, fmt, type Tab, type Speed } from '../state/store'
import * as E from '../engine'
import { Toast, Btn } from './components/kit'
import { CalleViva } from './screens/CalleViva'
import { Mapa } from './screens/Mapa'
import { Tienda } from './screens/Tienda'
import { Logistica } from './screens/Logistica'
import { Corporativo } from './screens/Corporativo'

const TABS: [Tab, string, typeof Map][] = [['calle', 'Calle Viva', Footprints], ['mapa', 'Mapa', Map], ['tienda', 'Tienda', Store], ['logistica', 'Logística', Truck], ['corporativo', 'Corporativo', Building2]]
const SPEEDS: [Speed, typeof Play, string][] = [[0, Pause, 'Pausa'], [1, Play, '1x'], [2, FastForward, '2x'], [4, ChevronsRight, '4x']]

function TopBar () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const speed = useApp(s => s.speed)
  const d = E.dateLabel(E.dayOf(game.minute))
  const { tags } = E.dayMultiplier(E.dayOf(game.minute))
  return (
    <header className='sticky top-0 z-30 bg-rojo text-white pt-[calc(8px+env(safe-area-inset-top))] pb-2 px-3 flex flex-col gap-1.5 shadow-md'>
      <div className='flex items-center gap-2'>
        <div className={`num font-bold text-[17px] px-3 py-1 rounded-full border-[1.5px] border-oferta whitespace-nowrap min-w-[150px] text-center ${game.cash < 0 ? 'bg-urbano' : 'bg-black/15'}`}>{fmt(game.cash)}<small className='text-[11px] opacity-80 ml-1'>MXN</small></div>
        <div className='flex-1 min-w-0 text-right leading-tight h-[30px] overflow-hidden'>
          <div className='text-[12px] font-semibold num whitespace-nowrap'>{d.date.replace(/ \d{4}$/, '')} · {E.clockLabel(game.minute)}</div>
          <div className='text-[11px] opacity-85 truncate'>{d.weekday}{tags.length ? ` · ${tags.join(' · ')}` : ''}</div>
        </div>
        <div className='flex bg-black/15 rounded-xl p-0.5' role='group' aria-label='Velocidad'>
          {SPEEDS.map(([v, Icon, l]) => (
            <button key={v} aria-label={l} aria-pressed={speed === v} onClick={() => useApp.getState().setSpeed(v)}
              className={`w-8 h-8 rounded-lg grid place-items-center text-[10px] font-bold ${speed === v ? 'bg-white text-rojo' : ''}`}>
              {v === 0 || v === 1 ? <Icon size={15} /> : l}
            </button>
          ))}
        </div>
      </div>
      <div className='text-[12px] bg-black/15 rounded-lg px-2.5 py-1 truncate h-[26px]'>{game.log[0]?.text ?? ''}</div>
    </header>
  )
}

function Intro () {
  const [name, setName] = useState('Tienda MX Inc.')
  return (
    <div className='min-h-full max-w-[560px] mx-auto px-5 py-8 flex flex-col justify-center gap-5'>
      <div className='rounded-3xl bg-white border border-borde shadow-card p-5 flex flex-col gap-2'>
        <div className='flex gap-1.5'>{['#D63B2F', '#F2B705', '#1B4D8F', '#2E7D5B', '#2B2D33'].map(c => <span key={c} className='h-2 flex-1 rounded-full' style={{ background: c }} />)}</div>
        <h1 className='font-display text-[42px] leading-[.95] uppercase mt-2'>Tienda <span className='text-rojo'>MX</span> Inc.</h1>
        <p className='text-[16px]'>Del changarro al holding. Abre una tiendita de esquina en la Ciudad de México, cuida tu fila en caja, tus precios y tu anaquel, y crece hasta la Bolsa.</p>
      </div>
      <ul className='text-sm text-tenue flex flex-col gap-1 px-1'>
        <li>• Arrancas con <b className='text-urbano'>$500,000 MXN</b>.</li>
        <li>• 1 día de juego dura 1 minuto a velocidad 1x.</li>
        <li>• Cada persona que ves en la calle es un cliente real de la simulación.</li>
      </ul>
      <label className='flex flex-col gap-1.5'><span className='text-[11px] uppercase tracking-wider text-tenue font-semibold'>Nombre de tu empresa</span>
        <input value={name} maxLength={40} onChange={e => setName(e.target.value)} className='bg-white border border-borde rounded-xl px-3 py-2.5 min-h-[44px]' /></label>
      <Btn onClick={() => useApp.getState().newGame(name.trim() || 'Tienda MX Inc.')}>Fundar empresa</Btn>
    </div>
  )
}

export function App () {
  const hasGame = useApp(s => !!s.game)
  const tab = useApp(s => s.tab)
  useEffect(() => { startLoop() }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea') || e.key !== ' ') return
      e.preventDefault(); const s = useApp.getState(); s.setSpeed(s.speed ? 0 : 1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (!hasGame) return <><Intro /><Toast /></>
  const Screen = { calle: CalleViva, mapa: Mapa, tienda: Tienda, logistica: Logistica, corporativo: Corporativo }[tab]
  return (
    <div className='max-w-[620px] mx-auto min-h-full flex flex-col'>
      <TopBar />
      <main className='flex-1 px-4 pt-3 pb-[calc(92px+env(safe-area-inset-bottom))]'><Screen /></main>
      <nav aria-label='Secciones' className='fixed bottom-0 inset-x-0 mx-auto w-full max-w-[620px] z-30 [transform:translateZ(0)] bg-white border-t border-borde grid grid-cols-5 px-1 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))]'>
        {TABS.map(([t, l, Icon]) => (
          <button key={t} onClick={() => { useApp.getState().setTab(t); window.scrollTo(0, 0) }} aria-current={tab === t ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10.5px] font-semibold ${tab === t ? 'text-rojo bg-rojo/5' : 'text-tenue'}`}>
            <Icon size={22} />{l}
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  )
}
