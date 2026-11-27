import { setMood, unlockMusic, duckMusic } from './music'
import { cityAmbience, sfx } from './sound'
import { assetUrl } from '../renderer/assets'
import { SEASON_ICON } from '../data/empire'
import { Portada, Ajustes } from './screens/Portada'
import { GuiaButton } from './Guia'
import { useEffect, useState } from 'react'
import type { GameState } from '../engine/types'
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

const SPEEDS: [Speed, typeof Play, string][] = [[0, Pause, 'Pausa'], [1, Play, '1x'], [2, FastForward, '2x'], [4, ChevronsRight, '4x'], [8, ChevronsRight, '8x']]

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
          <div className='text-[11px] opacity-85 truncate'>{season ? <><img src={assetUrl(`ui/temp-${SEASON_ICON[season.id]}.webp`)} alt='' className='inline h-3.5 -mt-0.5 mr-0.5' />{season.name}</> : <>{d.weekday}{tags.length ? ` · ${tags.join(' · ')}` : ''}</>}{E.rainToday(E.dayOf(game.minute)) ? ' · lluvia por la tarde' : ''}</div>
        </div>
        <div className='flex bg-black/15 rounded-xl p-0.5' role='group' aria-label='Velocidad'>
          {SPEEDS.map(([v, Icon, l]) => (
            <button key={v} aria-label={l} aria-pressed={speed === v} onClick={() => useApp.getState().setSpeed(v)}
              className={`w-7 h-8 rounded-lg grid place-items-center text-[10px] font-bold ${speed === v ? 'bg-white text-rojo' : ''}`}>
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
  const modal = !!(g?.dilemma || g?.weekly || g?.milestone != null)
  duckMusic(modal)
  cityAmbience(hasGame && !title && tab === 'calle')
  useEffect(() => { if (g?.dilemma) sfx.news() }, [g?.dilemma?.id])
  useEffect(() => { if (g?.milestone != null) sfx.milestone() }, [g?.milestone])
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
              <Speaker tab={tab} />
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
// quién te atiende en cada módulo: un retrato y una frase, como un encargado real.
// Para un módulo nuevo basta con sumar una línea aquí.
const SPEAKERS: Partial<Record<Tab, [string, string, (g: GameState) => string]>> = {
  banco: ['banquera', 'Lic. Mariana · Banco', g => g.cash < 0 ? 'Estás en números rojos. Hablemos de un crédito o de recortar gastos.' : 'Bienvenido. ¿Pedimos un crédito, invertimos o mudamos tu oficina?'],
  bolsa: ['agente_bolsa', 'Rodrigo · Casa de bolsa', () => 'El mercado se mueve cada día. Compra barato, vende caro… y ojo con los escándalos.'],
  inversion: ['inversionista_angel', 'Don Ernesto · Inversionista', g => g.stores.length < 3 ? 'Me interesan las cadenas. Cuando tengas 3 tiendas, platicamos.' : 'Tengo capital para crecer. ¿Cuánto vale tu empresa hoy?'],
  mundo: ['reportero', 'Iván · Reportero', () => 'Esto es lo que pasa en el país: gobierno, elecciones, obras y escándalos.'],
  laboratorio: ['ingeniero_laboratorio', 'Ing. Luis · Laboratorio', () => 'Invierte en inventos: tecnología que te da ventaja sobre la competencia.'],
  logistica: ['repartidor', 'Toño · Reparto', g => g.cedis ? 'El CEDIS ya surte tus tiendas. Revisa camiones y repartidores.' : 'Sin CEDIS la mercancía sale cara. Cuando puedas, constrúyelo.'],
  corporativo: ['contadora', 'C.P. Laura · Contabilidad', () => 'Aquí están tus números: ventas, gastos y utilidad de cada corte.'],
  tienda: ['gerente_tienda', 'Don Pepe · Gerente', () => 'Precios, personal y anaquel: lo que hace que un cliente vuelva.'],
  directivos: ['abogado', 'Lic. Andrés · Dirección', () => 'Delega en directores, cuida a tu gente y apoya a la comunidad.'],
  productos: ['directora_startup', 'Sofía · Marca propia', () => 'Crea productos con tu marca: más margen y clientes leales.'],
  mapa: ['vendedora_mercado', 'Doña Lupe · Bienes raíces', () => 'Cada colonia tiene su gente: elige bien dónde abrir.'],
  calendario: ['funcionaria_gobierno', 'Lic. Teresa · Calendario', () => 'Las fiestas mueven las ventas. Prepárate antes de cada temporada.'],
  estilo: ['asesor_negocios', 'Mauricio · Estilo de vida', () => 'El estatus abre puertas con los inversionistas.']
}
function Speaker ({ tab }: { tab: Tab }) {
  const game = useApp(s => s.game)!
  const sp = SPEAKERS[tab]; if (!sp) return null
  return (
    <div className='-mx-4 bg-urbano text-white flex items-end gap-2 pl-4 overflow-hidden min-h-[88px]'>
      <div className='flex-1 py-3'><b className='text-[11px] uppercase tracking-wider opacity-70 block'>{sp[1]}</b><p className='text-[14px] leading-snug'>{sp[2](game)}</p></div>
      <img src={assetUrl(`ui/ret-${sp[0]}.webp`)} alt='' className='w-24 h-24 object-contain object-bottom shrink-0' />
    </div>
  )
}

function MasMenu ({ onClose }: { onClose: () => void }) {
  const [aj, setAj] = useState(false)
  if (aj) return <Ajustes onClose={() => { setAj(false); onClose() }} />
  const go = (t: Tab) => { useApp.getState().setTab(t); window.scrollTo(0, 0); onClose() }
  const items: [string, string, string, () => void][] = [
    ['pi-matraz_laboratorio', 'Laboratorio', 'Inventa productos y tecnología', () => go('laboratorio')],
    ['pi-periodico_doblado', 'Noticias', 'Elecciones, impuestos, obras y escándalos', () => go('mundo')],
    ['ic-personal', 'Directivos', 'Delega, metas y programas sociales', () => go('directivos')],
    ['ic-tiendas', 'Mis tiendas', 'Precios, personal e interior', () => go('tienda')],
    ['ic-mapa', 'Abrir tienda', 'Elige colonia y formato', () => go('mapa')],
    ['pi-camion_reparto', 'Logística', 'Pedidos, CEDIS y camiones', () => go('logistica')],
    ['ic-banco', 'Banco', 'Préstamos, inversiones y oficinas', () => go('banco')],
    ['ic-ventas', 'Corporativo', 'Ganancias, cortes y partida', () => go('corporativo')],
    ['ic-precios', 'Marca propia', 'Crea tus productos', () => go('productos')],
    ['pi-maletin_inversionista', 'Inversionistas', 'Ofertas por tu empresa', () => go('inversion')],
    ['pi-certificado_acciones', 'Bolsa MX', 'Acciones, tu empresa y conglomerado', () => go('bolsa')],
    ['pi-calendario_fiesta', 'Calendario', 'Temporadas y fiestas por ciudad', () => go('calendario')],
    ['ic-premium', 'Estilo', 'Compras de estatus', () => go('estilo')],
    ['pi-globo_avion', 'Viajar', 'Otros estados', () => useApp.getState().openStates()],
    ['pi-trofeo_dorado', 'Logros', 'Tus medallas', () => { useApp.getState().setTitle(true); onClose() }],
    ['pi-engrane_ajustes', 'Ajustes', 'Sonido, tráfico y vista del mapa', () => setAj(true)],
    ['pi-casa_menu', 'Inicio', 'Partidas y nueva empresa', () => { useApp.getState().setTitle(true); onClose() }]
  ]
  return (
    <div className='fixed inset-0 z-50' onClick={onClose}>
      <div className='absolute inset-0 bg-black/30' />
      <div className='absolute inset-x-0 mx-auto max-w-[620px] bottom-0 pb-[calc(16px+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto bg-arena rounded-t-3xl p-4 grid grid-cols-4 gap-2 shadow-2xl' onClick={e => e.stopPropagation()}>
        <span className='col-span-4 mx-auto w-12 h-1.5 rounded-full bg-borde mb-1' />
        {items.map(([ic, t, d, f]) => (
          <button key={t} onClick={f} title={d} aria-label={`${t}: ${d}`} className='bg-white border border-borde rounded-2xl p-1.5 pt-2 flex flex-col items-center gap-1 text-center active:bg-borde/40'>
            {/^(ic|pi)-/.test(ic) ? <img src={assetUrl(`ui/${ic}.webp`)} alt='' className='w-10 h-10 object-contain' /> : <span className='text-3xl'>{ic}</span>}<b className='text-[11.5px] leading-tight'>{t}</b>
          </button>
        ))}
      </div>
    </div>
  )
}
