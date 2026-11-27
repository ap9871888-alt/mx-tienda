// Guía tutorial: un asesor en la esquina que dice qué sigue y te lleva al menú correcto.
import { useState } from 'react'
import { useApp, type Tab } from '../state/store'
import { assetUrl } from '../renderer/assets'
import { createPortal } from 'react-dom'
import { whatToDo } from '../engine'
import * as E from '../engine'
import type { GameState } from '../engine/types'

interface Step { text: string; tab?: Tab; done: (g: GameState) => boolean }
const STEPS: Step[] = [
  { text: 'Abre tu primera tienda: entra a Mapa, toca una colonia y pulsa Abrir.', tab: 'mapa', done: g => g.stores.length > 0 },
  { text: 'Contrata a tu primer cajero en Tienda → Personal. Sin cajero nadie te puede pagar.', tab: 'tienda', done: g => g.stores.some(s => s.cashiers.length > 0 || s.selfCheckouts > 0 || s.formatId === 'ambulante') },
  { text: 'Pulsa ▶ arriba para que corra el tiempo y mira a tus clientes en la Calle.', tab: 'calle', done: g => g.reports.length > 0 },
  { text: 'Revisa tu primer corte en Corporativo: cuánto vendiste y cuánto gastaste.', tab: 'corporativo', done: g => g.reports.length > 2 },
  { text: 'Abre una segunda tienda. Tip: lejos de la primera para que no se roben clientes.', tab: 'mapa', done: g => g.stores.length >= 2 },
  { text: 'Llega a 4 tiendas para poder viajar y expandirte a otras ciudades.', tab: 'mapa', done: g => g.stores.length >= 4 },
  { text: 'Construye tu CEDIS en Logística: la mercancía te sale más barata.', tab: 'logistica', done: g => !!g.cedis },
  { text: 'Viaja a otra ciudad (Mapa → México) en autobús o avión y ábrela.', tab: 'mapa', done: g => g.cities.length >= 2 },
  { text: 'Muda tu oficina en el Banco: más crédito y mejor tasa.', tab: 'banco', done: g => (g.office ?? 0) >= 1 }
]
const WHERE: [string, Tab, string][] = [
  ['ic-mapa', 'mapa', 'Abrir tiendas y ver colonias'], ['ic-viajar', 'mapa', 'Viajar a otra ciudad'], ['ic-personal', 'tienda', 'Contratar cajeros'],
  ['ic-precios', 'tienda', 'Cambiar precios'], ['ic-tiendas', 'tienda', 'Pedir mercancía'], ['ic-logistica', 'logistica', 'CEDIS y camiones'],
  ['ic-precios', 'productos', 'Crear productos de tu marca'], ['ic-trato', 'inversion', 'Inversionistas'], ['ic-bolsa', 'bolsa', 'Bolsa MX'], ['ic-premium', 'estilo', 'Estilo de vida'], ['ic-banco', 'banco', 'Préstamos, inversiones y oficinas'], ['ic-ventas', 'corporativo', 'Ganancias y cortes']
]
export function currentStep (g: GameState) { return STEPS.findIndex(s => !s.done(g)) }

// Don Chema es el único asesor del juego: un solo botón con tres pestañas
// (qué hacer ahora, la guía paso a paso y dónde está cada cosa). Para agregar consejos nuevos
// basta con sumar reglas en engine/advisor.ts o pasos en STEPS.
export function GuiaButton () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'ahora' | 'guia' | 'donde'>('ahora')
  const i = currentStep(game)
  const todos = whatToDo(game)
  const urgent = todos.some(t => t.prio >= 75)
  const go = (t: Tab, storeId?: number) => { if (storeId != null) useApp.getState().selectStore(storeId); useApp.getState().setTab(t); setOpen(false) }
  const face = game.cash < 0 ? 'preocupado' : urgent ? 'senala' : i < 0 ? 'festeja' : 'guino'
  return (
    <>
      <button onClick={() => { setTab(i >= 0 && game.stores.length === 0 ? 'guia' : 'ahora'); setOpen(true) }} aria-label='Don Chema, tu asesor' className={`relative w-10 h-10 rounded-full bg-white border-2 shrink-0 ${urgent ? 'border-oferta animate-pulse' : 'border-white'}`}>
        <span className='block w-full h-full rounded-full overflow-hidden'><img src={assetUrl('ui/chema-guino.webp')} alt='' className='w-full h-full object-cover object-top scale-[1.9] origin-top' /></span>
        {todos.length > 0 && <span className='absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-oferta text-urbano text-[10px] font-black grid place-items-center border-2 border-white'>{todos.length}</span>}
      </button>
      {open && createPortal(
        <div className='fixed inset-0 z-50 bg-black/40 grid place-items-end text-urbano' onClick={() => setOpen(false)}>
          <div className='w-full max-w-[620px] mx-auto bg-arena rounded-t-3xl p-4 pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-2.5 max-h-[88dvh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <div className='flex items-center gap-3'>
              <img src={assetUrl(`ui/chema-${face}.webp`)} alt='' className='w-16 h-16 object-contain' />
              <div className='flex-1'><b className='font-display text-xl uppercase block leading-none'>Don Chema</b><span className='text-xs text-tenue'>Tu asesor de negocios</span></div>
              <button onClick={() => setOpen(false)} aria-label='Cerrar' className='w-10 h-10 rounded-full bg-white border border-borde'>✕</button>
            </div>
            <div className='grid grid-cols-3 bg-white rounded-xl p-1 gap-1' role='tablist'>
              {([['ahora', `Ahora${todos.length ? ` (${todos.length})` : ''}`], ['guia', i >= 0 ? `Guía ${i + 1}/${STEPS.length}` : 'Guía ✓'], ['donde', '¿Dónde está?']] as const).map(([k, l]) => (
                <button key={k} role='tab' aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-[13px] font-bold ${tab === k ? 'bg-rojo text-white' : ''}`}>{l}</button>))}
            </div>
            {tab === 'ahora' && game.mission && (() => { const m = game.mission; const p = E.missionProgress(game, m); const day = Math.floor(game.minute / 1440)
              return <div className='rounded-2xl bg-urbano text-white p-3'>
                <div className='flex items-center gap-2'><img src={assetUrl('ui/pi-trofeo_dorado.webp')} alt='' className='w-8 h-8' /><b className='flex-1 text-sm'>Misión de la semana: {m.text}</b><span className='text-xs opacity-80'>{Math.max(0, m.until - day)} d</span></div>
                <div className='h-2 bg-white/20 rounded-full mt-2 overflow-hidden'><div className='h-full bg-oferta' style={{ width: `${Math.min(100, p / m.target * 100)}%` }} /></div>
                <span className='text-[11px] opacity-85'>{m.kind === 'ventas' ? `${Math.round(p).toLocaleString('es-MX')} de ${m.target.toLocaleString('es-MX')}` : `${Math.round(p)} de ${m.target}`} · premio ${m.reward.toLocaleString('es-MX')}</span>
              </div> })()}
            {tab === 'ahora' && (todos.length ? todos.map((t, n) => (
              <button key={n} onClick={() => go(t.tab as Tab, t.storeId)} className='bg-white border border-borde rounded-2xl p-3 flex items-center gap-3 text-left active:bg-borde/40'>
                <img src={assetUrl(`ui/${t.icon}.webp`)} alt='' className='w-10 h-10 object-contain shrink-0' />
                <span className='flex-1 text-[15px] font-semibold'>{t.text}</span><span className='text-tenue text-xl'>›</span>
              </button>)) : <p className='text-sm font-semibold bg-white rounded-2xl p-3'>¡Todo en orden, jefe! Sigue creciendo a tu ritmo.</p>)}
            {tab === 'guia' && <>
              {i >= 0 ? (
                <div className='rounded-2xl bg-oferta/20 border border-oferta p-3'>
                  <span className='text-[11px] uppercase font-bold text-tenue'>Paso {i + 1} de {STEPS.length}</span>
                  <p className='text-[15px] font-semibold'>{STEPS[i].text}</p>
                  {STEPS[i].tab && <button onClick={() => go(STEPS[i].tab!)} className='mt-2 bg-rojo text-white rounded-xl px-4 min-h-[40px] font-bold'>Llévame ahí →</button>}
                </div>
              ) : <p className='text-sm font-semibold bg-white rounded-2xl p-3'>¡Ya dominas lo básico! Ahora crece tu imperio a tu manera.</p>}
              <div className='flex gap-1'>{STEPS.map((st, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${st.done(game) ? 'bg-ahorro' : 'bg-borde'}`} />)}</div>
            </>}
            {tab === 'donde' && WHERE.map(([ic, t, l]) => (
              <button key={l} onClick={() => go(t)} className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[44px] text-left'>
                <img src={assetUrl(`ui/${ic}.webp`)} alt='' className='w-7 h-7 object-contain' /><span className='flex-1 text-sm font-semibold'>{l}</span><span className='text-tenue'>›</span>
              </button>))}
          </div>
        </div>, document.body)}
    </>
  )
}
