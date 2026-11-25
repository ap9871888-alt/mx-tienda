import { setMood, unlockMusic } from './music'
import { assetUrl } from '../renderer/assets'
import { SEASON_ICON } from '../data/empire'
import { Portada } from './screens/Portada'
import { GuiaButton } from './Guia'
import { useEffect } from 'react'
import { Pause, Play, FastForward, ChevronsRight } from 'lucide-react'
import { useApp, startLoop, fmt, type Tab, type Speed, setPriceLevel } from '../state/store'
import * as E from '../engine'
import { Toast } from './components/kit'
import { CalleViva, Calle } from './screens/CalleViva'
import { CityView } from './CityView'
import { Mapa } from './screens/Mapa'
import { Tienda } from './screens/Tienda'
import { Logistica } from './screens/Logistica'
import { Corporativo } from './screens/Corporativo'
import { Banco } from './screens/Banco'
import { Productos } from './screens/Productos'
import { Inversion, Estilo, Bolsa, DilemmaModal, Calendario, WeeklyModal, MilestoneModal, Directivos, Mundo, Laboratorio } from './screens/Imperio'

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
  useEffect(() => { const u = () => unlockMusic(); window.addEventListener('pointerdown', u, { once: true }); window.addEventListener('keydown', u, { once: true }) }, [])
  // música según el momento: menú, bolsa, fiesta, día o noche
  const festive = g ? E.seasonsAt(E.dateOfDay(E.dayOf(g.minute))).some(x => ['navidad', 'guadalupe', 'patrias', 'buenfin', 'mundial', 'reyes'].includes(x.id)) : false
  const night = g ? E.daylight(g.minute) < 0.5 : false
  setMood(!hasGame || title ? 'menu' : ['bolsa', 'inversion', 'banco'].includes(tab) ? 'bolsa' : festive ? 'fiesta' : night ? 'noche' : 'dia')
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea') || e.key !== ' ') return
      e.preventDefault(); const s = useApp.getState(); s.setSpeed(s.speed ? 0 : 1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  const more = useApp(s => s.more)
  if (!hasGame || title) return <><Portada /><Toast /></>
  const Screen = { calle: CalleViva, mapa: Mapa, tienda: Tienda, logistica: Logistica, corporativo: Corporativo, banco: Banco, productos: Productos, inversion: Inversion, estilo: Estilo, bolsa: Bolsa, calendario: Calendario, directivos: Directivos, mundo: Mundo, laboratorio: Laboratorio }[tab]
  const TITLES: Record<string, string> = { mapa: 'Abrir y expandir', tienda: 'Mis tiendas', logistica: 'Logística', corporativo: 'Corporativo', banco: 'Banco', productos: 'Marca propia', inversion: 'Inversionistas', estilo: 'Estilo de vida', bolsa: 'Bolsa MX', calendario: 'Calendario', directivos: 'Directivos y comunidad', mundo: 'Noticias y gobierno', laboratorio: 'Laboratorio de inventos' }
  return (
    <div className='max-w-[620px] mx-auto h-[100dvh] flex flex-col overflow-hidden'>
      <TopBar />
      <CityView />
      {tab !== 'calle' && (
        // cada edificio abre su módulo en una hoja que sube desde abajo; la ciudad sigue viva detrás
        <div className='fixed inset-0 z-40 flex flex-col justify-end' onClick={() => useApp.getState().setTab('calle')}>
          <div className='absolute inset-0 bg-black/35' />
          <div className='relative mx-auto w-full max-w-[620px] h-[88dvh] bg-arena rounded-t-3xl shadow-2xl flex flex-col' onClick={e => e.stopPropagation()}>
            <div className='flex items-center gap-2 px-4 pt-2 pb-1'>
              <span className='absolute left-1/2 -translate-x-1/2 top-1.5 w-12 h-1.5 rounded-full bg-borde' />
              <b className='flex-1 font-display uppercase text-lg mt-2'>{TITLES[tab]}</b>
              <button onClick={() => useApp.getState().setTab('calle')} aria-label='Cerrar' className='mt-2 w-10 h-10 rounded-full bg-white border border-borde text-xl'>✕</button>
            </div>
            <div className='flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom))] flex flex-col gap-3'>
              {tab === 'tienda' && <Calle bare />}
              <Screen />
            </div>
          </div>
        </div>
      )}
      {more && <MasMenu onClose={() => useApp.getState().setMore(false)} />}
      <DilemmaModal />
      <WeeklyModal />
      <MilestoneModal />
      <Toast />
    </div>
  )
}

// menú "Más": todas las demás secciones en una cuadrícula grande, fácil de encontrar
function MasMenu ({ onClose }: { onClose: () => void }) {
  const go = (t: Tab) => { useApp.getState().setTab(t); window.scrollTo(0, 0); onClose() }
  const items: [string, string, string, () => void][] = [
    ['ic-interior', 'Laboratorio', 'Inventa productos y tecnología', () => go('laboratorio')],
    ['ic-calendario', 'Noticias y gobierno', 'Elecciones, impuestos, obras y escándalos', () => go('mundo')],
    ['ic-personal', 'Directivos y comunidad', 'Delega, metas y programas sociales', () => go('directivos')],
    ['ic-tiendas', 'Mis tiendas', 'Precios, personal e interior', () => go('tienda')],
    ['ic-mapa', 'Abrir tienda', 'Elige colonia y formato', () => go('mapa')],
    ['ic-logistica', 'Logística', 'Pedidos, CEDIS y camiones', () => go('logistica')],
    ['ic-banco', 'Banco', 'Préstamos, inversiones y oficinas', () => go('banco')],
    ['ic-ventas', 'Corporativo', 'Ganancias, cortes y partida', () => go('corporativo')],
    ['ic-precios', 'Marca propia', 'Crea tus productos', () => go('productos')],
    ['ic-trato', 'Inversionistas', 'Ofertas por tu empresa', () => go('inversion')],
    ['ic-bolsa', 'Bolsa MX', 'Acciones, tu empresa y conglomerado', () => go('bolsa')],
    ['ic-calendario', 'Calendario', 'Temporadas y fiestas por ciudad', () => go('calendario')],
    ['ic-premium', 'Estilo de vida', 'Compras de estatus', () => go('estilo')],
    ['ic-viajar', 'Viajar', 'Otros estados', () => useApp.getState().openStates()],
    ['ic-logros', 'Logros', 'Tus medallas', () => { useApp.getState().setTitle(true); onClose() }],
    ['ic-ajustes', 'Menú principal', 'Partidas y ajustes', () => { useApp.getState().setTitle(true); onClose() }]
  ]
  return (
    <div className='fixed inset-0 z-50' onClick={onClose}>
      <div className='absolute inset-0 bg-black/30' />
      <div className='absolute inset-x-0 mx-auto max-w-[620px] bottom-0 pb-[calc(16px+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto bg-arena rounded-t-3xl p-4 grid grid-cols-2 gap-2.5 shadow-2xl' onClick={e => e.stopPropagation()}>
        {items.map(([ic, t, d, f]) => (
          <button key={t} onClick={f} className='bg-white border border-borde rounded-2xl p-3 text-left min-h-[76px] active:bg-borde/40'>
            {ic.startsWith('ic-') ? <img src={assetUrl(`ui/${ic}.webp`)} alt='' className='w-11 h-11 object-contain mb-1' /> : <span className='text-3xl leading-[44px]'>{ic}</span>}<b className='block text-[15px] leading-tight'>{t}</b><span className='text-[11.5px] text-tenue leading-tight'>{d}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
