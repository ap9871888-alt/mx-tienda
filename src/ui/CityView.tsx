// Vista principal estilo Coffee Inc: toda la pantalla es la ciudad. Se arrastra y se hace zoom con los dedos;
// cada edificio se toca y abre su módulo (tu tienda, banco, bolsa, inversionistas, plaza, mercado, aeropuerto…).
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as E from '../engine'
import { useApp, type Tab } from '../state/store'
import { assetUrl } from '../renderer/assets'
import { cityOf } from '../data/cities'
import LOTS from '../data/cityLots.json'
import { ColonyTraffic } from './ColonyTraffic'
import { ModularTraffic } from './ModularTraffic'
import { usePrefs } from './settings'
import ASPECT from '../data/sprite-aspect.json'
import { toTile, TW as MTW, TH as MTH, NX as MNX, NY as MNY, RES, CURVE_SPRITES, WATER, AREAS, KITS, W as MW, H as MH, NBX, NBY, blockRect, quarters, scenery, at, colonyCenters, drawGround, type CityKit } from './modular'
import { sprite } from '../renderer/assets'
import type { Colony } from '../data/cities'
import type { GameState } from '../engine/types'

type Kind = string
type MapData = { lots: number[][]; n: number; ny: number; road: string; side: string; w?: number; h?: number }
const MAPS = LOTS as unknown as Record<Kind, MapData>
const TW = 572; const TH = 1024 // tamaño de cada zona en el mundo
const kindOf = (id: string, wealth: number): Kind => ['santafe', 'polanco'].includes(id) || wealth >= 1.25 ? 'oficinas' : wealth < 0.95 ? 'popular' : 'media'
const DECOR = ['depas', 'oficinas', 'depas', 'mercado', 'plaza', 'torre']

interface Lot { x: number; y: number; w?: number; bottom?: number; icon?: string; alert?: boolean; ed?: string; pin?: string; pinImg?: string; color?: string; tag?: string; mine?: boolean; go?: () => void; label?: string; big?: boolean }
type Civic = Omit<Lot, 'x' | 'y'>
const open = (t: Tab) => () => useApp.getState().setTab(t)

// edificios de una zona: primero los cívicos de la ciudad, luego tus tiendas, rivales, locales en renta y relleno
function lotsFor (g: GameState, colony: Colony | null, kind: Kind, civic: Civic[], tod: string) {
  const items: Lot[] = MAPS[kind].lots.map(([x, y]) => ({ x, y }))
  let i = 0
  const put = (l: Omit<Lot, 'x' | 'y'>) => { if (i < items.length) Object.assign(items[i++], l) }
  for (const c of civic) put(c)
  if (colony) {
    const night = tod === 'noche'
    const myColor = g.profile?.color ?? '#D63B2F'
    for (const s of g.stores.filter(x => x.colonyId === colony.id)) {
      const fmt = assetUrl(`sprites/tienda-${s.formatId}-dia.webp`) ? s.formatId : 'tiendita'
      put({ ed: `sprites/tienda-${fmt}-${E.isOpen(s, E.hourOf(g.minute)) ? (night ? 'noche' : 'dia') : 'cerrada'}.webp`, pin: 'mine', color: myColor, alert: !!s.works, mine: true, label: E.storeShort(s), go: () => { useApp.getState().selectStore(s.id); useApp.getState().setTab('tienda') } })
    }
    const rivals = g.market?.rivals.flatMap(r => Array.from({ length: r.stores[colony.id] || 0 }, () => r)) ?? []
    for (const r of rivals.slice(0, Math.max(0, items.length - i - 2))) put({ ed: `city/ed-plaza-${tod}.webp`, pin: 'rival', color: r.color, tag: r.name.split(' ')[0], label: r.name, go: () => useApp.getState().say(`${r.name}: ${r.style === 'precio' ? 'baja precios donde tú ganas' : r.style === 'premium' ? 'busca clientes con dinero' : r.style === 'barrio' ? 'llena las colonias de tienditas' : 'abre por todos lados'}`) })
    const free = Math.max(0, colony.slots - E.usedSpace(g, colony.id))
    for (let k = 0; k < Math.min(2, free) && i < items.length; k++) put({ pin: 'renta', icon: 'renta', label: `Abrir en ${colony.name}`, go: () => useApp.getState().focusColony(colony.id) })
  }
  let d = 0
  while (i < items.length) put({ ed: `city/ed-${DECOR[(d++ + (colony?.id.length ?? 3)) % DECOR.length]}-${tod}.webp` })
  return items
}

export function CityView () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const viewCity = useApp(s => s.viewCity) ?? game.here ?? 'cdmx'
  const city = cityOf(viewCity)
  const night = E.daylight(game.minute) < 0.5
  const tod = night ? 'noche' : 'dia'
  // cuadrícula de zonas: 2 columnas, como un teléfono en vertical
  const cols = 2; const rows = Math.ceil(city.colonies.length / cols) + (city.colonies.length % 2 ? 0 : 0)
  const tiles = Array.from({ length: cols * rows }, (_, k) => city.colonies[k] ?? null)
  const prefs = usePrefs()
  const kit = KITS[city.id]
  const full = kit ? undefined : MAPS[`${city.id}-full`]
  const W = kit ? MW : full ? full.w! : cols * TW; const H = kit ? MH : full ? full.h! : rows * TH
  // edificios cívicos: se reparten en las primeras zonas
  const office = game.office ?? 0
  const civicBy: Civic[][] = tiles.map(() => [])
  civicBy[0].push({ ed: `city/ed-banco-${tod}.webp`, pin: 'banco', icon: 'ic-banco', label: 'Banco: créditos e inversiones', go: open('banco'), big: true })
  civicBy[Math.min(1, tiles.length - 1)].push({ ed: `city/ed-torre-${tod}.webp`, pinImg: 'ui/bolsa.webp', icon: 'ic-bolsa', label: 'Bolsa MX', go: open('bolsa'), big: true })
  civicBy[Math.min(1, tiles.length - 1)].push({ ed: `city/ed-oficinas-${tod}.webp`, pin: 'oficina', icon: 'ic-trato', alert: !!game.offer, label: 'Torre de inversionistas', go: open('inversion') })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: `city/ed-plaza-${tod}.webp`, pin: 'oficina', icon: 'ic-premium', label: 'Plaza comercial: estilo de vida', go: open('estilo') })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: `city/ed-mercado-${tod}.webp`, pin: 'cedis', icon: 'ic-logistica', label: 'Logística y mayoristas', go: open('logistica') })
  civicBy[Math.min(3, tiles.length - 1)].push({ ed: `city/ed-${office >= 3 ? 'torre' : 'oficinas'}-${tod}.webp`, pin: 'oficina', icon: 'ic-ventas', label: 'Corporativo: ganancias y cortes', go: open('corporativo') })
  civicBy[Math.min(3, tiles.length - 1)].push({ ed: 'city/ed-aeropuerto-dia.webp', pinImg: 'city/pin-aeropuerto.webp', icon: 'ic-viajar', label: 'Viajar en avión a otro estado', go: () => useApp.getState().openStates(), big: true })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: 'city/ed-central-dia.webp', pinImg: 'city/pin-central.webp', icon: 'ic-mapa', label: 'Viajar en autobús', go: () => useApp.getState().openStates(), big: true })

  // mapa completo de una sola pieza: los lotes se reparten entre las colonias por cercanía
  const fullItems = full ? fullLayout(game, city.colonies, full, civicBy.flat(), tod) : null
  // el acomodo del mapa solo se recalcula si cambia algo que se ve (tiendas, día, hora, ofertas),
  // no en cada tic del reloj: así el mapa no se traba
  const sig = kit ? `${city.id}|${tod}|${E.dayOf(game.minute)}|${game.offer ? 1 : 0}|${game.cash < 0 ? 1 : 0}|${game.stores.map(s => `${s.id}${s.colonyId}${s.formatId}${s.cityId}`).join(',')}` : ''
  const modItems = useMemo(() => kit ? modularLayout(game, city.colonies, kit, civicBy.flat(), tod) : null, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  // ---------- arrastrar y hacer zoom ----------
  const box = useRef<HTMLDivElement>(null); const world = useRef<HTMLDivElement>(null)
  const cam = useRef({ x: 0, y: 0, s: 1, init: '' })
  const [, force] = useState(0)
  const refresh = useRef<ReturnType<typeof setTimeout>>()
  const apply = () => {
    const c = cam.current; if (world.current) world.current.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.s})`
    // al mover la cámara, se vuelve a calcular qué edificios se ven (con un respiro para no recalcular en cada dedo)
    clearTimeout(refresh.current); refresh.current = setTimeout(() => force(n => n + 1), 120)
  }
  const clamp = () => {
    const el = box.current; if (!el) return
    const c = cam.current; const vw = el.clientWidth; const vh = el.clientHeight
    if (kit) {
      // mapa modular: no deja alejarse de más ni salirse de la ciudad
      // la pantalla nunca sale del rombo de la ciudad: se revisan sus 4 esquinas en coordenadas de calle
      const minS = Math.max(vw / (MW * 0.6), vh / (MH * 0.62)); c.s = Math.min(2.4, Math.max(minS, c.s))
      let wx = (vw / 2 - c.x) / c.s; let wy = (vh / 2 - c.y) / c.s
      const hw = vw / 2 / c.s; const hh = vh / 2 / c.s
      for (let it = 0; it < 8; it++) {
        let moved = false
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const { tx, ty } = toTile(wx + sx * hw, wy + sy * hh)
          // fuera por tx o ty: empujar el centro hacia adentro a lo largo de ese eje
          if (tx < 0.5) { wx += (0.5 - tx) * MTW / 2; wy += (0.5 - tx) * MTH / 2; moved = true }
          if (tx > MNX - 0.5) { wx -= (tx - MNX + 0.5) * MTW / 2; wy -= (tx - MNX + 0.5) * MTH / 2; moved = true }
          if (ty < 0.5) { wx -= (0.5 - ty) * MTW / 2; wy += (0.5 - ty) * MTH / 2; moved = true }
          if (ty > MNY - 0.5) { wx += (ty - MNY + 0.5) * MTW / 2; wy -= (ty - MNY + 0.5) * MTH / 2; moved = true }
        }
        if (!moved) break
      }
      c.x = vw / 2 - wx * c.s; c.y = vh / 2 - wy * c.s
      return
    }
    const minS = Math.max(vw / W, vh / H) * 0.98; c.s = Math.min(3.2, Math.max(minS * 0.85, c.s))
    c.x = Math.min(0, Math.max(vw - W * c.s, c.x)); c.y = Math.min(0, Math.max(vh - H * c.s, c.y))
  }
  useEffect(() => {
    const el = box.current; if (!el) return
    if (cam.current.init !== city.id) {
      const vw = el.clientWidth
      cam.current = { s: kit ? vw / (W * 0.55) : full ? vw / (W * 0.62) : vw / (TW * 0.95), x: 0, y: 0, init: city.id }
      // centra en tu primera tienda de esta ciudad, si hay
      const st = game.stores.find(s => s.cityId === city.id)
      const k = st ? city.colonies.findIndex(c => c.id === st.colonyId) : 0
      const c = cam.current
      clamp() // fija primero la escala permitida para centrar bien
      const lb = modItems?.labels ?? fullItems?.labels
      const fl = kit && !st ? blockRect(5, 7) : lb ? lb.find(l => l.id === (st?.colonyId ?? city.colonies[0].id)) : null
      if (fl) { c.x = -(fl.x / 100 * W) * c.s + vw / 2; c.y = -(fl.y / 100 * H) * c.s + el.clientHeight / 2 }
      else { c.x = -((k % cols) * TW + TW / 2) * c.s + vw / 2; c.y = -(Math.floor(k / cols) * TH + TH * 0.4) * c.s + el.clientHeight / 2 }
      clamp(); apply(); force(n => n + 1)
    }
  })
  useEffect(() => {
    const el = box.current; if (!el) return
    const pts = new Map<number, { x: number; y: number }>()
    let moved = 0; let pinch: { d: number; s: number; mx: number; my: number; cx: number; cy: number } | null = null
    const down = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) startPinch() }
    const startPinch = () => {
      const [a, b] = [...pts.values()]; const r = el.getBoundingClientRect()
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.current.s, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, cx: cam.current.x, cy: cam.current.y }
    }
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return
      const dx = e.clientX - p.x; const dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY
      const c = cam.current
      if (pts.size === 1) { c.x += dx; c.y += dy; moved += Math.abs(dx) + Math.abs(dy) }
      else if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()]; const ns = pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d
        c.x = pinch.mx - (pinch.mx - pinch.cx) * ns / pinch.s; c.y = pinch.my - (pinch.my - pinch.cy) * ns / pinch.s; c.s = ns; moved = 99
      }
      clamp(); apply()
    }
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null }
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); const r = el.getBoundingClientRect(); const c = cam.current
      const ns = c.s * (e.deltaY < 0 ? 1.12 : 0.89); const mx = e.clientX - r.left; const my = e.clientY - r.top
      c.x = mx - (mx - c.x) * ns / c.s; c.y = my - (my - c.y) * ns / c.s; c.s = ns; clamp(); apply()
    }
    // si arrastraste, el toque no cuenta como clic
    const click = (e: MouseEvent) => { if (moved > 10) { e.stopPropagation(); e.preventDefault() } }
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('click', click, true)
    const ro = new ResizeObserver(() => { clamp(); apply() }); ro.observe(el)
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); el.removeEventListener('click', click, true); ro.disconnect() }
  }, [W, H])
  const zoom = (f: number) => { const el = box.current!; const c = cam.current; const ns = c.s * f; const mx = el.clientWidth / 2; const my = el.clientHeight / 2; c.x = mx - (mx - c.x) * ns / c.s; c.y = my - (my - c.y) * ns / c.s; c.s = ns; clamp(); apply() }

  const myColor = game.profile?.color ?? '#D63B2F'; const myIcon = game.profile?.icon ?? 'carrito'
  // solo se montan los edificios cerca de la pantalla: el iPhone no aguanta cientos de imágenes grandes a la vez
  const vw0 = box.current?.clientWidth ?? innerWidth; const vh0 = box.current?.clientHeight ?? innerHeight; const cc = cam.current
  const vx0 = (-cc.x / cc.s) / W * 100; const vx1 = ((vw0 - cc.x) / cc.s) / W * 100; const vy0 = (-cc.y / cc.s) / H * 100; const vy1 = ((vh0 - cc.y) / cc.s) / H * 100
  const mg = prefs.lite ? 0.12 : 0.3; const mx = (vx1 - vx0) * mg; const my = (vy1 - vy0) * mg
  const near = (l: Lot) => l.x > vx0 - mx - (l.w ?? 10) && l.x < vx1 + mx + (l.w ?? 10) && (l.bottom ?? l.y) > vy0 - my && (l.bottom ?? l.y) < vy1 + my + 30
  return (
    <div ref={box} className={`relative flex-1 overflow-hidden ${kit ? 'bg-[#6E8F50]' : 'bg-[#8FA3B5]'} touch-none select-none`} style={{ overscrollBehavior: 'none' }}>
      <div ref={world} className={`absolute left-0 top-0 origin-top-left ${kit ? '' : 'will-change-transform'}`} style={{ width: W, height: H }}>
        {kit && modItems && (
          <div className='absolute inset-0 isolate'>
            <ModularGround kit={kit} night={night} />
            <ModularTraffic active={useApp.getState().tab === 'calle'} density={prefs.traffic} night={night} riders={game.stores.filter(s => s.cityId === city.id).reduce((a, s) => a + (s.riders ?? 0), 0)} />
            {prefs.labels && modItems.labels.map(l => <span key={l.id} className='absolute z-[2000] -translate-x-1/2 bg-urbano/80 text-white text-[15px] font-bold rounded-full px-3 py-0.5 pointer-events-none shadow-lg whitespace-nowrap' style={{ left: `${l.x}%`, top: `${l.y}%` }}>{l.name}{l.mine ? ` · ${l.mine} 🏪` : ''}</span>)}
            {modItems.items.map((l, j) => near(l) && <LotButton key={j} l={l} width='9%' big='9.6%' myColor={myColor} myIcon={myIcon} dy={0} ps={1.4} night={night} />)}
          </div>
        )}
        {full && fullItems && (
          <div className='absolute inset-0 isolate'>
            <img src={assetUrl(`city/${city.id}-full.webp`)} alt='' className='absolute inset-0 w-full h-full' draggable={false} style={{ filter: night ? 'brightness(.55) saturate(.8) hue-rotate(10deg)' : undefined }} />
            <ColonyTraffic grid={full} night={night} density={5} riders={game.stores.filter(s => s.cityId === city.id).reduce((a, s) => a + (s.riders ?? 0), 0)} drones={!!game.lab?.done.includes('drones')} />
            {fullItems.labels.map(l => <span key={l.id} className='absolute z-[2000] -translate-x-1/2 bg-urbano/85 text-white text-[17px] leading-tight font-bold rounded-full px-3 py-0.5 opacity-80 pointer-events-none shadow-lg whitespace-nowrap' style={{ left: `${l.x}%`, top: `${l.y - 5}%` }}>{l.name}{l.mine ? ` · ${l.mine} 🏪` : ''}</span>)}
            {fullItems.items.map((l, j) => <LotButton key={j} l={l} width='12.5%' big='14%' myColor={myColor} myIcon={myIcon} dy={2.2} ps={1.9} />)}
          </div>
        )}
        {!kit && !full && tiles.map((col, k) => {
          const kind = city.mapKind ?? (col ? kindOf(col.id, E.effectiveWealth(game, city.id, col.id)) : 'media')
          const map = MAPS[kind] ?? MAPS.media
          const items = lotsFor(game, col, kind, civicBy[k] ?? [], tod)
          return (
            <div key={k} className='absolute isolate' style={{ left: (k % cols) * TW, top: Math.floor(k / cols) * TH, width: TW, height: TH }}>
              <img src={assetUrl(`city/${kind}.webp`)} alt='' className='absolute inset-0 w-full h-full' draggable={false} style={{ filter: night ? 'brightness(.55) saturate(.8) hue-rotate(10deg)' : undefined }} />
              <ColonyTraffic grid={map} night={night} density={0.8} />
              {col && <span className='absolute left-4 top-4 z-[2000] bg-urbano/85 text-white text-2xl font-black rounded-2xl px-4 py-1.5 pointer-events-none shadow-lg'>{col.name}</span>}
              {[...items].sort((a, b) => a.y - b.y).map((l, j) => <LotButton key={j} l={l} width='21%' big='25%' myColor={myColor} myIcon={myIcon} dy={2.6} ps={1} />)}
            </div>
          )
        })}
      </div>
      {/* controles mínimos, como Coffee Inc */}
      <div className='absolute right-3 top-3 flex flex-col gap-2 z-10'>
        <button onClick={() => zoom(1.25)} aria-label='Acercar' className='w-11 h-11 rounded-full bg-urbano/85 text-white text-2xl font-bold shadow-lg'>+</button>
        <button onClick={() => zoom(0.8)} aria-label='Alejar' className='w-11 h-11 rounded-full bg-urbano/85 text-white text-2xl font-bold shadow-lg'>−</button>
      </div>
      <div className='absolute inset-x-0 bottom-[calc(14px+env(safe-area-inset-bottom))] flex items-center justify-center gap-3 px-3 z-10'>
        <button onClick={() => useApp.getState().setTab('tienda')} aria-label='Mis tiendas' className='w-14 h-14 rounded-2xl bg-urbano/90 text-white text-2xl shadow-lg grid place-items-center'><img src={assetUrl('ui/ic-tiendas.webp')} alt='' className='w-10 h-10 object-contain' /></button>
        <button onClick={() => useApp.getState().openStates()} className='flex-1 max-w-[260px] min-h-[56px] rounded-2xl bg-urbano/90 text-white font-bold shadow-lg flex items-center justify-center gap-2'>
          <span>{(game.here ?? 'cdmx') === city.id ? '📍' : '🗺️'}</span><span className='truncate'>{city.name} · {city.state}</span><span className='opacity-70'>▾</span>
        </button>
        <button onClick={() => useApp.getState().setMore(true)} aria-label='Menú' className='relative w-14 h-14 rounded-2xl bg-urbano/90 text-white text-2xl shadow-lg grid place-items-center'>☰{game.offer && <span className='absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-oferta animate-pulse' />}</button>
      </div>
    </div>
  )
}

// ---------- una sola escala para toda la ciudad ----------
// Cada tipo de construcción tiene su altura en pantalla (px del mundo); el ancho sale de la proporción real
// de su dibujo, sin pasarse del lote. Así una casa nunca es más alta que la Torre Latino.
const HEIGHTS: [RegExp, number][] = [
  [/torre_mayor|19_torre_reforma/, 470], [/torre_latino/, 410], [/helipuerto|torre_corporativa|colonia_polanco_torre|hotel_torre|ed-torre/, 330],
  [/monumento_angel|estela/, 270], [/catedral|bellas_artes|basilica|revolucion|senado|palacio|ed-banco/, 240],
  [/hotel_|edificio_5|narvarte_5p|edificio_mixto|deptos|condesa|porfiriano|hospital|auditorio|soumaya|antropologia|ed-oficinas|ed-depas/, 220],
  [/6_pisos|unidad_habitacional/, 215], [/4_pisos|estacionamiento/, 180], [/gasolinera/, 95],
  [/papeleria|tortilleria|lavanderia|ferreteria|cocina_economica|estetica|carniceria|cerrajeria|vulcanizadora|consultorio|gimnasio|local_comercial|oficina_gobierno|zaguan|3_pisos_tinaco/, 135],
  [/manzana_/, 230], [/tienda-(bodega|hardDiscount|supermercado|darkStore|hiper)/, 165],
  [/art_deco|vecindad|residencia|boutique|casona|casa|colonial|block|iztapalapa|bloque_3|tezontle|mercado|iglesia|escuela|garibaldi|hemiciclo|artesanias|arena|toros|frida|raza|ed-mercado|ed-plaza|ed-central|ed-aeropuerto/, 150],
  [/tienda-|tiendita|farmacia|panaderia|taqueria|cafe|metro|kiosco/, 115], [/puesto|mob_/, 80],
  [/jacaranda|veg_|ahuehuete|bugambilia/, 95]
]
const SMALL_FORMATS = new Set(['ambulante', 'paleteria', 'conveniencia', 'taqueria', 'tiendita'])
const aspectOf = (ed: string) => (ASPECT as Record<string, number>)[ed] ?? 0.75
function placeIn (r: { x: number; y: number; w: number; bottom: number }, ed?: string) {
  const maxW = r.w * MW / 100 * 0.95
  const wpx = ed ? Math.min(maxW, (HEIGHTS.find(([re]) => re.test(ed))?.[1] ?? 170) * aspectOf(ed)) : maxW * 0.8
  const f = Math.max(0.35, wpx / (r.w * MW / 100))
  return { ...r, w: wpx / MW * 100, bottom: r.y + (r.bottom - r.y) * Math.min(1, f) }
}
// manzana compuesta que le toca a cada colonia
const COMPOSITE: Record<string, string> = { polanco: 'manzana_polanco_lujo', santafe: 'manzana_polanco_lujo', centro: 'manzana_centro_historico', roma: 'manzana_roma_condesa', coyoacan: 'manzana_coyoacan_colonial', iztapalapa: 'manzana_iztapalapa_densa' }
// de noche, los edificios que tienen su versión nocturna dibujada la usan (ventanas reales encendidas)
const NIGHT: Record<string, string> = {
  '01_rascacielos_reforma': '01_rascacielos_cristal', '02_torre_helipuerto': '02_torre_helipuerto', '03_edificio_porfiriano': '03_edificio_porfiriano',
  '05_vecindad_patio': '04_vecindad', '06_deptos_condesa': '05_departamentos_condesa', '07_casa_art_deco_roma': '06_casa_art_deco',
  '08_edificio_narvarte_5p': '07_edificio_5_pisos', '09_casa_del_valle_2p': '08_casa_dos_pisos', '10_casona_coyoacan': '09_casona_colonial',
  '11_casa_block_iztapalapa': '10_casa_block', '12_tiendita_esquina': '11_tiendita_esquina', '13_farmacia_cruz_verde': '12_farmacia_luz_verde',
  '14_panaderia': '13_panaderia', '15_taqueria_trompo': '14_taqueria_foco', '16_mercado_techado': '15_mercado_techado',
  '17_iglesia_barrio': '16_iglesia_iluminada', hotel_clasico_reforma: '17_hotel_lujo', '18_hospital_grande': '18_hospital',
  '19_entrada_metro': '19_entrada_metro', monumento_angel: '20_angel_independencia'
}
const nightOf = (ed?: string) => { const k = ed?.split('/').pop()?.replace('.webp', ''); return k && NIGHT[k] ? `kit/noche/${NIGHT[k]}.webp` : null }
// ventanas encendidas de noche: puntitos cálidos fijos por edificio (sin imágenes extra)
const WINDOWS = Array.from({ length: 7 }, (_, i) => ({ x: 22 + ((i * 37) % 56), y: 28 + ((i * 23) % 44) }))
const lit = (ed?: string) => !!ed && !/jacaranda|veg_|deco_|estanque|chinampa|embarcadero|zocalo|chapultepec|angel|estela|puesto|mob_|kiosco/.test(ed)
const LotButton = memo(LotButtonRaw)
function LotButtonRaw ({ l, width, big, myColor, myIcon, dy, ps, night }: { l: Lot; width: string; big: string; myColor: string; myIcon: string; dy: number; ps: number; night?: boolean }) {
  // con medidas del lote: el edificio ocupa el rombo y su base cae en la punta inferior
  const w = l.w ? `${Math.min(l.w * 1.08, 16)}%` : (l.big ? big : width)
  const top = l.bottom != null ? `${l.bottom + 0.4}%` : `${l.y + dy}%`
  const badge = l.mine || l.icon || l.color
  return (
    <button onClick={l.go} disabled={!l.go} aria-label={l.label} title={l.label} className='absolute' style={{ left: `${l.x}%`, top, width: w, transform: 'translate(-50%, -100%)', zIndex: Math.round((l.bottom ?? l.y) * 10) }}>
      {l.ed ? <img src={assetUrl(night && nightOf(l.ed) ? nightOf(l.ed)! : l.ed)} alt='' decoding='async' loading='lazy' className={`w-full ${l.w ? '' : 'drop-shadow'}`} style={night && !nightOf(l.ed) ? { filter: 'brightness(.72) saturate(.85) hue-rotate(-6deg)' } : undefined} draggable={false} /> : <div className='w-full aspect-[2/1]' />}
      {night && lit(l.ed) && !nightOf(l.ed) && !/v3\//.test(l.ed ?? '') && WINDOWS.filter((_, i) => (Math.round((l.x ?? 0) * 13) + i) % 3).map((p, i) => (
        <span key={i} className='absolute rounded-full pointer-events-none' style={{ left: `${p.x}%`, top: `${p.y}%`, width: '10%', aspectRatio: '1', background: 'radial-gradient(circle, rgba(255,226,140,1), rgba(255,190,80,.5) 35%, rgba(255,170,60,0) 70%)' }} />))}
      {badge && <span className='absolute left-1/2 bottom-[78%] pointer-events-none' style={{ transform: `translateX(-50%) scale(${ps})`, transformOrigin: 'bottom center' }}>
        <span className={`relative flex flex-col items-center ${l.mine || l.alert || l.icon === 'renta' ? 'animate-[bounce_2.6s_ease-in-out_infinite]' : ''}`}>
          {l.icon === 'renta'
            ? <span className='w-9 h-9 rounded-full bg-rojo border-2 border-white shadow-lg grid place-items-center text-white text-lg font-black'>+</span>
            : l.icon
              ? <span className='w-10 h-10 rounded-full bg-white border-2 border-urbano shadow-lg grid place-items-center'><img src={assetUrl(`ui/${l.icon}.webp`)} alt='' className='w-7 h-7 object-contain' /></span>
              : <span className='w-10 h-10 rounded-full border-2 border-white shadow-lg grid place-items-center' style={{ background: l.mine ? myColor : l.color }}>
                {l.mine ? <img src={assetUrl(`ui/logo-${myIcon}.webp`)} alt='' className='w-7 h-7 rounded-full bg-white object-contain' /> : <span className='text-white font-black text-base'>{(l.tag ?? '?')[0]}</span>}
              </span>}
          {l.alert && <span className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-oferta border-2 border-white animate-pulse' />}
          <span className='w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-urbano -mt-0.5' />
        </span>
      </span>}
    </button>
  )
}

// reparte los lotes del mapa completo: primero los edificios de la ciudad, luego cada colonia toma sus lotes más cercanos
function fullLayout (g: GameState, colonies: Colony[], map: MapData, civic: Civic[], tod: string) {
  const lots = map.lots.map(([x, y, w, bottom]) => ({ x, y, w, bottom }))
  const civ = civic
  // los cívicos toman lotes repartidos por el mapa
  const step = Math.max(1, Math.floor(lots.length / civ.length))
  const civicLots = civ.map((_, i) => lots[(i * step + 1) % lots.length])
  const rest = lots.filter(l => !civicLots.includes(l))
  // centros de colonia: k-medias sencillas sobre los lotes restantes
  let centers: { x: number; y: number }[] = colonies.map((_, i) => { const r = rest[Math.floor(i * rest.length / colonies.length)]; return { x: r.x, y: r.y } })
  let groups: typeof rest[] = []
  for (let it = 0; it < 8; it++) {
    groups = colonies.map(() => [])
    for (const l of rest) { let b = 0; let bd = Infinity; centers.forEach((c, i) => { const d = (c.x - l.x) ** 2 + ((c.y - l.y) * 1.8) ** 2; if (d < bd) { bd = d; b = i } }); groups[b].push(l) }
    centers = centers.map((c, i) => groups[i].length ? { x: groups[i].reduce((a, l) => a + l.x, 0) / groups[i].length, y: groups[i].reduce((a, l) => a + l.y, 0) / groups[i].length } : c)
  }
  // cada colonia con tiendas tuyas necesita al menos esos lotes (+1 para crecer): se los quita al grupo más grande
  colonies.forEach((col, i) => {
    const need = g.stores.filter(s => s.colonyId === col.id).length + 1
    while (groups[i].length < need) {
      const big = groups.reduce((bi, gr, k) => (gr.length > groups[bi].length && k !== i ? k : bi), i === 0 ? 1 : 0)
      if (groups[big].length <= 1) break
      const c = centers[i]; groups[big].sort((a, b) => ((a.x - c.x) ** 2 + (a.y - c.y) ** 2) - ((b.x - c.x) ** 2 + (b.y - c.y) ** 2))
      groups[i].push(groups[big].shift()!)
    }
  })
  const items: Lot[] = civicLots.map((l, i) => ({ ...l, ...civ[i] }))
  const labels: { id: string; name: string; x: number; y: number; mine: number }[] = []
  colonies.forEach((col, i) => {
    const mine = g.stores.filter(s => s.colonyId === col.id).length
    labels.push({ id: col.id, name: col.name, x: centers[i].x, y: centers[i].y, mine })
    if (!groups[i].length) return
    const kind = 'media'
    const sub = lotsFor(g, col, kind, [], tod).filter(x => x.go || x.ed)
    // reordena: lo interactivo primero (tiendas, rivales, renta) en los lotes de esa colonia
    const go = sub.filter(x => x.go); const deco = sub.filter(x => !x.go)
    const inter = [...go.filter(x => x.mine), ...go.filter(x => x.pin === 'renta').slice(0, 1), ...go.filter(x => !x.mine && x.pin !== 'renta')]
    // el contenido va al lote del mapa completo (sus coordenadas mandan)
    groups[i].forEach((l, j) => items.push({ ...(inter[j] ?? deco[j % Math.max(1, deco.length)] ?? {}), x: l.x, y: l.y, w: l.w, bottom: l.bottom }))
  })
  // Mérida: kit propio de casonas yucatecas y sus 3 monumentos en los lotes más grandes
  if (colonies.some(c => c.id === 'montejo')) {
    const casas = [1, 2, 3, 4, 5, 6].map(n => `city/mer/casa-${n}.webp`)
    const free = items.filter(x => !x.go && x.ed?.startsWith('city/ed-'))
    free.forEach((x, k) => { x.ed = casas[k % casas.length]; x.w = (x.w ?? 8) * 0.95 })
    const mons = ['mon-catedral', 'mon-patria', 'mon-mercado']
    ;[...free].sort((a, b) => (b.w ?? 0) - (a.w ?? 0)).slice(0, 3).forEach((x, k) => { x.ed = `city/mer/${mons[k]}.webp`; x.w = (x.w ?? 8) * 1.25 })
  }
  return { items: items.sort((a, b) => a.y - b.y), labels }
}

// asesor flotante: "¿qué hago ahora?" con las 3 acciones más importantes
// piso del mapa modular: se dibuja una vez (y otra cuando terminan de cargar las texturas)
function ModularGround ({ kit, night }: { kit: CityKit; night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!; cv.width = Math.round(MW * RES); cv.height = Math.round(MH * RES)
    const ctx = cv.getContext('2d')!; ctx.setTransform(RES, 0, 0, RES, 0, 0)
    const paths = [...CURVE_SPRITES, 'kit/polanco/tile_calle_recta.webp', 'kit/polanco/tile_cruce_cebra.webp', 'kit/polanco/tile_avenida_masaryk.webp', 'kit/polanco/tile_glorieta_lujo.webp', 'sprites/piso-banqueta.webp', 'sprites/piso-pasto.webp']
    let tries = 0; let t: ReturnType<typeof setTimeout>
    const draw = () => {
      drawGround(ctx, kit, p => sprite(p), night)
      if (paths.some(p => !sprite(p)) && tries++ < 40) t = setTimeout(draw, 150)
    }
    draw()
    return () => clearTimeout(t)
  }, [kit, night])
  return <canvas ref={ref} className='absolute inset-0 w-full h-full' aria-hidden />
}

// reparte cuadras: monumentos y edificios clave fijos; en cada colonia tus tiendas, un local libre, rivales y relleno
function modularLayout (g: GameState, colonies: Colony[], kit: CityKit, civic: Civic[], tod: string) {
  const civicById: Record<string, Civic | undefined> = {
    banco: civic.find(c => c.icon === 'ic-banco'), bolsa: civic.find(c => c.icon === 'ic-bolsa'), inversion: civic.find(c => c.icon === 'ic-trato'),
    estilo: civic.find(c => c.icon === 'ic-premium'), logistica: civic.find(c => c.icon === 'ic-logistica'), corporativo: civic.find(c => c.icon === 'ic-ventas'),
    aeropuerto: civic.find(c => c.icon === 'ic-viajar'), central: civic.find(c => c.label === 'Viajar en autobús')
  }
  const kitEd: Record<string, string> = { central: 'kit/px/terminal_tapo_cupula.webp', bolsa: 'kit/cdmx/colonia_polanco_torre.webp', inversion: 'kit/polanco/polanco_torre_corporativa.webp', estilo: 'kit/polanco/polanco_boutique_lujo.webp', logistica: 'kit/cdmx/comercio_mercado_frutas.webp', corporativo: 'kit/polanco/polanco_torre_corporativa.webp' }
  // tamaño de cada sprite respecto a la cuadra: árboles y puestos más chicos que los edificios
  const sized = (r: { x: number; y: number; w: number; bottom: number }, ed?: string) => placeIn(r, ed)
  const items: Lot[] = []
  const byColony: Record<string, { x: number; y: number; w: number; bottom: number }[]> = {}
  for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) {
    const r = blockRect(bx, by); const u = kit.blocks(bx, by)
    if (u.kind === 'mon') items.push({ ...sized(r, u.sprite), ed: u.sprite, label: u.sprite.split('/').pop()!.replace('.webp', '').replace(/_/g, ' ') })
    else if (u.kind === 'civic') { const c = civicById[u.id]; if (c) { const ed = kitEd[u.id] ?? c.ed; items.push({ ...c, ...sized(r, ed), ed }) } }
    else if (u.kind === 'park') {
      const tx = bx * 4 + 1; const ty = by * 4 + 1
      const wt = WATER[`${bx},${by}`]
      // parque plano: árboles sueltos alrededor y, si no hay agua, un jardín al centro (o la trajinera en el canal)
      if (wt === 'canal') items.push({ ...at(tx + 1.5, ty + 1.6, 0.9), ed: 'kit/px/08_trajinera_navegando.webp' })
      else if (!wt) items.push({ ...at(tx + 1.5, ty + 1.5, 1.1), ed: (bx + by) % 2 ? 'kit/cdmx2/veg_parquecito_denso.webp' : 'kit/cdmx/deco_jacaranda.webp' })
      const tree = (bx * 3 + by) % 3 === 0 ? 'cdmx/deco_jacaranda' : 'cdmx2/veg_ahuehuete_chapultepec'
      for (const [a, b] of [[0.55, 0.55], [2.5, 0.6], [0.6, 2.5], [2.55, 2.55]] as const) items.push({ ...at(tx + a, ty + b, 0.62), ed: `kit/${tree}.webp` })
    }
    else if (u.kind === 'lot') (byColony[u.colony] ??= []).push({ ...r, bx, by } as typeof r)
  }
  const labels: { id: string; name: string; x: number; y: number; mine: number }[] = []
  const centers = colonyCenters(kit, colonies)
  for (const col of colonies) {
    const lots = byColony[col.id] ?? []
    const c = centers.find(x => x.id === col.id)
    const mine = g.stores.filter(s => s.colonyId === col.id).length
    if (c && !labels.some(l => l.name === c.name)) labels.push({ ...c, mine })
    const go = lotsFor(g, col, 'media', [], tod).filter(x => x.go)
    const inter = [...go.filter(x => x.mine), ...go.filter(x => x.pin === 'renta').slice(0, 1), ...go.filter(x => !x.mine && x.pin !== 'renta')]
    const decor = kit.decor[col.id] ?? []
    lots.forEach((r, j) => {
      const it = inter[j]
      const bx0 = (r as { bx?: number }).bx!; const by0 = (r as { by?: number }).by!
      if (it) {
        // tus tiendas y las rivales usan su fachada; las rivales con un edificio de la colonia
        const ed = it.mine ? it.ed : it.pin === 'renta' ? undefined : decor[j % Math.max(1, decor.length)]
        // formatos chicos (ambulante, paletería, conveniencia, local libre) ocupan ¼ de manzana; los grandes, la manzana entera
        const fmt = it.mine ? /tienda-(\w+)-/.exec(it.ed ?? '')?.[1] ?? '' : ''
        const small = !it.mine || SMALL_FORMATS.has(fmt)
        if (!small) { items.push({ ...it, ...sized(r, ed), ed }); return }
        const qs = quarters(bx0, by0)
        items.push({ ...it, ...placeIn(qs[3], ed), ed })
        qs.slice(0, 3).forEach((q, n) => { const e2 = n === 1 ? (n % 2 ? 'kit/cdmx/deco_jacaranda.webp' : undefined) : decor[(j * 5 + n * 3) % Math.max(1, decor.length)]; if (e2) items.push({ ...placeIn(q, e2), ed: e2 }) })
      } else {
        // cuadra de relleno: cuatro construcciones distintas, como una manzana real
        const bx = (r as { bx?: number }).bx!; const by = (r as { by?: number }).by!
        // la mayoría de las manzanas son una manzana compuesta de su colonia (varios edificios ya acomodados);
        // las demás, dos construcciones en diagonal y árboles en los otros cuartos
        const comp = COMPOSITE[col.id]; const v = (bx * 7 + by * 3) % 4
        if (comp && (bx * 5 + by * 3) % 5 < 2) { const ed = `kit/v3/${comp}${(bx + by) % 2 ? '_variante_b' : ''}.webp`; items.push({ ...sized(r, ed), ed }); return }
        const qs = quarters(bx, by)
        qs.forEach((q, n) => {
          const build = v % 2 ? (n === 0 || n === 3) : (n === 1 || n === 2)
          if (build) { const ed = decor[(j * 3 + n * 5 + col.id.length) % Math.max(1, decor.length)]; items.push({ ...placeIn(q, ed), ed }) } else if ((bx + by + n) % 3) { const ed = n % 2 ? 'kit/cdmx/deco_jacaranda.webp' : 'kit/cdmx2/veg_jardinera_bugambilias.webp'; items.push({ ...placeIn(q, ed), ed }) }
        })
      }
    })
  }
  // áreas grandes (Zócalo, Chapultepec, Alameda, CU, Estadio Azteca, Xochimilco…)
  for (const a of AREAS) for (const [ed, dx, dy, w] of a.items) items.push({ ...at(a.bx * 4 + 1 + dx, a.by * 4 + 1 + dy, w), ed })
  for (const s of scenery()) items.push({ ...s.r, ed: s.ed })
  return { items: items.sort((a, b) => (a.bottom ?? a.y) - (b.bottom ?? b.y)), labels }
}
