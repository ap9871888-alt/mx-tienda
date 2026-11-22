// Guía tutorial: un asesor en la esquina que dice qué sigue y te lleva al menú correcto.
import { useState } from 'react'
import { useApp, type Tab } from '../state/store'
import { assetUrl } from '../renderer/assets'
import { Modal } from './components/kit'
import type { GameState } from '../engine/types'

interface Step { text: string; tab?: Tab; done: (g: GameState) => boolean }
const STEPS: Step[] = [
  { text: 'Abre tu primera tienda: entra a Mapa, toca una colonia y pulsa Abrir.', tab: 'mapa', done: g => g.stores.length > 0 },
  { text: 'Contrata a tu primer cajero en Tienda → Personal. Sin cajero nadie te puede pagar.', tab: 'tienda', done: g => g.stores.some(s => s.cashiers.length > 0 || s.selfCheckouts > 0) },
  { text: 'Pulsa ▶ arriba para que corra el tiempo y mira a tus clientes en la Calle.', tab: 'calle', done: g => g.reports.length > 0 },
  { text: 'Revisa tu primer corte en Corporativo: cuánto vendiste y cuánto gastaste.', tab: 'corporativo', done: g => g.reports.length > 2 },
  { text: 'Abre una segunda tienda. Tip: lejos de la primera para que no se roben clientes.', tab: 'mapa', done: g => g.stores.length >= 2 },
  { text: 'Llega a 4 tiendas para poder viajar y expandirte a otras ciudades.', tab: 'mapa', done: g => g.stores.length >= 4 },
  { text: 'Construye tu CEDIS en Logística: la mercancía te sale más barata.', tab: 'logistica', done: g => !!g.cedis },
  { text: 'Viaja a otra ciudad (Mapa → México) en autobús o avión y ábrela.', tab: 'mapa', done: g => g.cities.length >= 2 },
  { text: 'Muda tu oficina en el Banco: más crédito y mejor tasa.', tab: 'banco', done: g => (g.office ?? 0) >= 1 }
]
const WHERE: [string, Tab, string][] = [
  ['🏪', 'mapa', 'Abrir tiendas y ver colonias'], ['✈️', 'mapa', 'Viajar a otra ciudad'], ['👥', 'tienda', 'Contratar cajeros'],
  ['🏷️', 'tienda', 'Cambiar precios'], ['📦', 'tienda', 'Pedir mercancía'], ['🚚', 'logistica', 'CEDIS y camiones'],
  ['🏦', 'banco', 'Préstamos e inversiones'], ['🏢', 'banco', 'Oficinas corporativas'], ['📊', 'corporativo', 'Ganancias y cortes']
]
export function currentStep (g: GameState) { return STEPS.findIndex(s => !s.done(g)) }

export function GuiaButton () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [open, setOpen] = useState(false)
  const i = currentStep(game)
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label='Guía' className='relative w-10 h-10 rounded-full bg-white border-2 border-oferta shrink-0 overflow-hidden'>
        <img src={assetUrl('ui/chema-guino.webp')} alt='' className='w-full h-full object-cover object-top scale-[1.9] origin-top' />
        {i >= 0 && <span className='absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-oferta border-2 border-white animate-pulse' />}
      </button>
      {open && (<div className='text-urbano'>
        <Modal title='Guía · Don Chema' onClose={() => setOpen(false)}>
          {i >= 0 ? (
            <div className='rounded-2xl bg-oferta/20 border border-oferta p-3 flex gap-3 items-start'>
              <img src={assetUrl(`ui/chema-${game.cash < 0 ? 'preocupado' : i === 0 ? 'saluda' : STEPS[i].tab ? 'senala' : 'piensa'}.webp`)} alt='' className='w-20 shrink-0' />
              <div className='flex-1'><span className='text-[11px] uppercase font-bold text-tenue'>Paso {i + 1} de {STEPS.length}</span>
                <p className='text-[15px] font-semibold'>{STEPS[i].text}</p>
                {STEPS[i].tab && <button onClick={() => { useApp.getState().setTab(STEPS[i].tab!); setOpen(false) }} className='mt-2 bg-rojo text-white rounded-xl px-4 min-h-[40px] font-bold'>Llévame ahí →</button>}
              </div>
            </div>
          ) : <div className='flex items-center gap-3'><img src={assetUrl('ui/chema-festeja.webp')} alt='' className='w-20' /><p className='text-sm font-semibold'>¡Ya dominas lo básico! Ahora crece tu imperio a tu manera.</p></div>}
          <div className='flex gap-1'>{STEPS.map((s, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${s.done(game) ? 'bg-ahorro' : 'bg-borde'}`} />)}</div>
          <h3 className='font-bold text-sm mt-1'>¿Dónde está…?</h3>
          <div className='grid grid-cols-1 gap-1.5'>
            {WHERE.map(([ic, t, l]) => (
              <button key={l} onClick={() => { useApp.getState().setTab(t); setOpen(false) }} className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[44px] text-left'>
                <span className='text-xl'>{ic}</span><span className='flex-1 text-sm font-semibold'>{l}</span><span className='text-tenue'>›</span>
              </button>))}
          </div>
          <button onClick={() => { useApp.getState().setTitle(true); setOpen(false) }} className='text-sm text-tenue underline'>Ir al menú principal</button>
        </Modal></div>
      )}
    </>
  )
}
