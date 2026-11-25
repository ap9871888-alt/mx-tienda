import { assetUrl } from '../renderer/assets'
import { SEASON_ICON } from '../data/empire'
import { Portada } from './screens/Portada'
import { GuiaButton } from './Guia'
import { useEffect, useState } from 'react'
import { Footprints, Map, Store, Truck, Menu, Pause, Play, FastForward, ChevronsRight } from 'lucide-react'
import { useApp, startLoop, fmt, type Tab, type Speed, setPriceLevel } from '../state/store'
import * as E from '../engine'
import { Toast } from './components/kit'
import { CalleViva } from './screens/CalleViva'
import { Mapa } from './screens/Mapa'
import { Tienda } from './screens/Tienda'
import { Logistica } from './screens/Logistica'
import { Corporativo } from './screens/Corporativo'
import { Banco } from './screens/Banco'
import { Productos } from './screens/Productos'
import { Inversion, Estilo, Bolsa, DilemmaModal } from './screens/Imperio'

const TABS: [Tab, string, typeof Map][] = [['calle', 'Calle Viva', Footprints], ['mapa', 'Mapa', Map], ['tienda', 'Tienda', Store], ['logistica', 'Logística', Truck]]
const SPEEDS: [Speed, typeof Play, string][] = [[0, Pause, 'Pausa'], [1, Play, '1x'], [2, FastForward, '2x'], [4, ChevronsRight, '4x']]

function TopBar () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const speed = useApp(s => s.speed)
  const d = E.dateLabel(E.dayOf(game.minute))
  const { tags } = E.dayMultiplier(E.dayOf(game.minute))
  const season = E.seasonsAt(E.dateOfDay(E.dayOf(game.minute)))[0]
  return (
    <header style={{ background: game.profile?.color ?? '#D63B2F' }} className='sticky top-0 z-30 text-white pt-[calc(8px+env(safe-area-inset-top))] pb-2 px-3 flex flex-col gap-1.5 shadow-md'>
      <div className='flex items-center gap-2'>
        <GuiaButton />
        <button onClick={() => useApp.getState().setTab('banco')} aria-label='Abrir banco' className={`num font-bold text-[17px] px-3 py-1 rounded-full border-[1.5px] border-oferta whitespace-nowrap min-w-[118px] text-center ${game.cash < 0 ? 'bg-urbano' : 'bg-black/15'}`}>{fmt(game.cash)}<small className='text-[11px] opacity-80 ml-1'>MXN</small></button>
        <div className='flex-1 min-w-0 text-right leading-tight h-[30px] overflow-hidden'>
          <div className='text-[12px] font-semibold num whitespace-nowrap'>{d.date.replace(/ \d{4}$/, '')} · {E.clockLabel(game.minute)}</div>
          <div className='text-[11px] opacity-85 truncate'>{season ? <><img src={assetUrl(`ui/temp-${SEASON_ICON[season.id]}.webp`)} alt='' className='inline h-3.5 -mt-0.5 mr-0.5' />{season.name}</> : <>{d.weekday}{tags.length ? ` · ${tags.join(' · ')}` : ''}</>}</div>
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
  const [more, setMore] = useState(false)
  if (!hasGame || title) return <><Portada /><Toast /></>
  const Screen = { calle: CalleViva, mapa: Mapa, tienda: Tienda, logistica: Logistica, corporativo: Corporativo, banco: Banco, productos: Productos, inversion: Inversion, estilo: Estilo, bolsa: Bolsa }[tab]
  return (
    <div className='max-w-[620px] mx-auto min-h-full flex flex-col'>
      <TopBar />
      <main className='flex-1 px-4 pt-3 pb-[calc(92px+env(safe-area-inset-bottom))]'><Screen /></main>
      <nav aria-label='Secciones' className='fixed bottom-0 inset-x-0 mx-auto w-full max-w-[620px] z-30 [transform:translateZ(0)] bg-white border-t border-borde grid grid-cols-5 px-1 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))]'>
        {TABS.map(([t, l, Icon]) => (
          <button key={t} onClick={() => { setMore(false); useApp.getState().setTab(t); window.scrollTo(0, 0) }} aria-current={tab === t && !more ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10.5px] font-semibold ${tab === t && !more ? 'text-rojo bg-rojo/5' : 'text-tenue'}`}>
            <Icon size={22} />{l}
          </button>
        ))}
        <button onClick={() => setMore(m => !m)} aria-expanded={more} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10.5px] font-semibold ${more || ['corporativo', 'banco', 'productos', 'inversion', 'estilo', 'bolsa'].includes(tab) ? 'text-rojo bg-rojo/5' : 'text-tenue'}`}>
          <span className='relative'><Menu size={22} />{g?.offer && <span className='absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-oferta border-2 border-white animate-pulse' />}</span>Más
        </button>
      </nav>
      {more && <MasMenu onClose={() => setMore(false)} />}
      <DilemmaModal />
      <Toast />
    </div>
  )
}

// menú "Más": todas las demás secciones en una cuadrícula grande, fácil de encontrar
function MasMenu ({ onClose }: { onClose: () => void }) {
  const go = (t: Tab) => { useApp.getState().setTab(t); window.scrollTo(0, 0); onClose() }
  const items: [string, string, string, () => void][] = [
    ['🏦', 'Banco', 'Préstamos, inversiones y oficinas', () => go('banco')],
    ['📊', 'Corporativo', 'Ganancias, cortes y partida', () => go('corporativo')],
    ['🏷️', 'Marca propia', 'Crea tus productos', () => go('productos')],
    ['🤝', 'Inversionistas', 'Ofertas por tu empresa', () => go('inversion')],
    ['📈', 'Bolsa MX', 'Compra acciones', () => go('bolsa')],
    ['🕶️', 'Estilo de vida', 'Compras de estatus', () => go('estilo')],
    ['🗺️', 'Viajar', 'Otras ciudades y estados', () => go('mapa')],
    ['🏆', 'Logros', 'Tus medallas', () => { useApp.getState().setTitle(true); onClose() }],
    ['🏠', 'Menú principal', 'Partidas y ajustes', () => { useApp.getState().setTitle(true); onClose() }]
  ]
  return (
    <div className='fixed inset-0 z-20' onClick={onClose}>
      <div className='absolute inset-0 bg-black/30' />
      <div className='absolute inset-x-0 mx-auto max-w-[620px] bottom-[calc(64px+env(safe-area-inset-bottom))] bg-arena rounded-t-3xl p-4 grid grid-cols-2 gap-2.5 shadow-2xl' onClick={e => e.stopPropagation()}>
        {items.map(([ic, t, d, f]) => (
          <button key={t} onClick={f} className='bg-white border border-borde rounded-2xl p-3 text-left min-h-[76px] active:bg-borde/40'>
            <span className='text-2xl'>{ic}</span><b className='block text-[15px] leading-tight'>{t}</b><span className='text-[11.5px] text-tenue leading-tight'>{d}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
