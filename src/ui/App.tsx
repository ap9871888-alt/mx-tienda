import { Portada } from './screens/Portada'
import { GuiaButton } from './Guia'
import { useEffect } from 'react'
import { Footprints, Map, Store, Truck, Building2, Pause, Play, FastForward, ChevronsRight } from 'lucide-react'
import { useApp, startLoop, fmt, type Tab, type Speed, setPriceLevel } from '../state/store'
import * as E from '../engine'
import { Toast } from './components/kit'
import { CalleViva } from './screens/CalleViva'
import { Mapa } from './screens/Mapa'
import { Tienda } from './screens/Tienda'
import { Logistica } from './screens/Logistica'
import { Corporativo } from './screens/Corporativo'
import { Banco } from './screens/Banco'

const TABS: [Tab, string, typeof Map][] = [['calle', 'Calle Viva', Footprints], ['mapa', 'Mapa', Map], ['tienda', 'Tienda', Store], ['logistica', 'Logística', Truck], ['corporativo', 'Corporativo', Building2]]
const SPEEDS: [Speed, typeof Play, string][] = [[0, Pause, 'Pausa'], [1, Play, '1x'], [2, FastForward, '2x'], [4, ChevronsRight, '4x']]

function TopBar () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const speed = useApp(s => s.speed)
  const d = E.dateLabel(E.dayOf(game.minute))
  const { tags } = E.dayMultiplier(E.dayOf(game.minute))
  return (
    <header style={{ background: game.profile?.color ?? '#D63B2F' }} className='sticky top-0 z-30 text-white pt-[calc(8px+env(safe-area-inset-top))] pb-2 px-3 flex flex-col gap-1.5 shadow-md'>
      <div className='flex items-center gap-2'>
        <GuiaButton />
        <button onClick={() => useApp.getState().setTab('banco')} aria-label='Abrir banco' className={`num font-bold text-[17px] px-3 py-1 rounded-full border-[1.5px] border-oferta whitespace-nowrap min-w-[118px] text-center ${game.cash < 0 ? 'bg-urbano' : 'bg-black/15'}`}>{fmt(game.cash)}<small className='text-[11px] opacity-80 ml-1'>MXN</small></button>
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

export function App () {
  const hasGame = useApp(s => !!s.game)
  useApp(s => s.rev)
  const g = useApp.getState().game
  if (g) { E.setEpoch(g.startYear ?? 2027); setPriceLevel(E.priceLevel(g)) }
  const tab = useApp(s => s.tab)
  const title = useApp(s => s.title)
  useEffect(() => { startLoop() }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea') || e.key !== ' ') return
      e.preventDefault(); const s = useApp.getState(); s.setSpeed(s.speed ? 0 : 1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  if (!hasGame || title) return <><Portada /><Toast /></>
  const Screen = { calle: CalleViva, mapa: Mapa, tienda: Tienda, logistica: Logistica, corporativo: Corporativo, banco: Banco }[tab]
  return (
    <div className='max-w-[620px] mx-auto min-h-full flex flex-col'>
      <TopBar />
      <main className='flex-1 px-4 pt-3 pb-[calc(92px+env(safe-area-inset-bottom))]'><Screen /></main>
      <nav aria-label='Secciones' className='fixed bottom-0 inset-x-0 mx-auto w-full max-w-[620px] z-30 [transform:translateZ(0)] bg-white border-t border-borde grid grid-cols-5 px-1 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))]'>
        {TABS.map(([t, l, Icon]) => (
          <button key={t} onClick={() => { useApp.getState().setTab(t); window.scrollTo(0, 0) }} aria-current={tab === t || (tab === 'banco' && t === 'corporativo') ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10.5px] font-semibold ${tab === t || (tab === 'banco' && t === 'corporativo') ? 'text-rojo bg-rojo/5' : 'text-tenue'}`}>
            <Icon size={22} />{l}
          </button>
        ))}
      </nav>
      <Toast />
    </div>
  )
}
