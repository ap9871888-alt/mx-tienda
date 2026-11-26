// Vista principal estilo Coffee Inc: toda la pantalla es la ciudad. Se arrastra y se hace zoom con los dedos;
// cada edificio se toca y abre su módulo (tu tienda, banco, bolsa, inversionistas, plaza, mercado, aeropuerto…).
import { useEffect, useRef, useState } from 'react'
import * as E from '../engine'
import { useApp, type Tab } from '../state/store'
import { assetUrl } from '../renderer/assets'
import { cityOf } from '../data/cities'
import LOTS from '../data/cityLots.json'
import { ColonyTraffic } from './ColonyTraffic'
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
    const free = Math.max(0, colony.slots - g.stores.filter(x => x.colonyId === colony.id).length)
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
  const full = MAPS[`${city.id}-full`]
  const W = full ? full.w! : cols * TW; const H = full ? full.h! : rows * TH
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
  // ---------- arrastrar y hacer zoom ----------
  const box = useRef<HTMLDivElement>(null); const world = useRef<HTMLDivElement>(null)
  const cam = useRef({ x: 0, y: 0, s: 1, init: '' })
  const [, force] = useState(0)
  const apply = () => { const c = cam.current; if (world.current) world.current.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.s})` }
  const clamp = () => {
    const el = box.current; if (!el) return
    const c = cam.current; const vw = el.clientWidth; const vh = el.clientHeight
    const minS = Math.max(vw / W, vh / H) * 0.98; c.s = Math.min(3.2, Math.max(minS * 0.85, c.s))
    c.x = Math.min(0, Math.max(vw - W * c.s, c.x)); c.y = Math.min(0, Math.max(vh - H * c.s, c.y))
  }
  useEffect(() => {
    const el = box.current; if (!el) return
    if (cam.current.init !== city.id) {
      const vw = el.clientWidth
      cam.current = { s: full ? vw / (W * 0.62) : vw / (TW * 0.95), x: 0, y: 0, init: city.id }
      // centra en tu primera tienda de esta ciudad, si hay
      const st = game.stores.find(s => s.cityId === city.id)
      const k = st ? city.colonies.findIndex(c => c.id === st.colonyId) : 0
      const c = cam.current
      const fl = full && fullItems ? fullItems.labels.find(l => l.id === (st?.colonyId ?? city.colonies[0].id)) : null
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
  return (
    <div ref={box} className='relative flex-1 overflow-hidden bg-[#8FA3B5] touch-none select-none' style={{ overscrollBehavior: 'none' }}>
      <div ref={world} className='absolute left-0 top-0 origin-top-left will-change-transform' style={{ width: W, height: H }}>
        {full && fullItems && (
          <div className='absolute inset-0 isolate'>
            <img src={assetUrl(`city/${city.id}-full.webp`)} alt='' className='absolute inset-0 w-full h-full' draggable={false} style={{ filter: night ? 'brightness(.55) saturate(.8) hue-rotate(10deg)' : undefined }} />
            <ColonyTraffic grid={full} night={night} density={5} riders={game.stores.filter(s => s.cityId === city.id).reduce((a, s) => a + (s.riders ?? 0), 0)} drones={!!game.lab?.done.includes('drones')} />
            {fullItems.labels.map(l => <span key={l.id} className='absolute z-[2000] -translate-x-1/2 bg-urbano/85 text-white text-[17px] leading-tight font-bold rounded-full px-3 py-0.5 opacity-80 pointer-events-none shadow-lg whitespace-nowrap' style={{ left: `${l.x}%`, top: `${l.y - 5}%` }}>{l.name}{l.mine ? ` · ${l.mine} 🏪` : ''}</span>)}
            {fullItems.items.map((l, j) => <LotButton key={j} l={l} width='12.5%' big='14%' myColor={myColor} myIcon={myIcon} dy={2.2} ps={1.9} />)}
          </div>
        )}
        {!full && tiles.map((col, k) => {
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

function LotButton ({ l, width, big, myColor, myIcon, dy, ps }: { l: Lot; width: string; big: string; myColor: string; myIcon: string; dy: number; ps: number }) {
  // con medidas del lote: el edificio ocupa el rombo y su base cae en la punta inferior
  const w = l.w ? `${Math.min(l.w * 1.08, l.big ? 16 : 14)}%` : (l.big ? big : width)
  const top = l.bottom != null ? `${l.bottom + 0.4}%` : `${l.y + dy}%`
  const badge = l.mine || l.icon || l.color
  return (
    <button onClick={l.go} disabled={!l.go} aria-label={l.label} title={l.label} className='absolute' style={{ left: `${l.x}%`, top, width: w, transform: 'translate(-50%, -100%)', zIndex: Math.round((l.bottom ?? l.y) * 10) }}>
      {l.ed ? <img src={assetUrl(l.ed)} alt='' className='w-full drop-shadow' draggable={false} /> : <div className='w-full aspect-[2/1]' />}
      {badge && <span className='absolute left-1/2 bottom-[78%] pointer-events-none' style={{ transform: `translateX(-50%) scale(${ps})`, transformOrigin: 'bottom center' }}>
        <span className='relative flex flex-col items-center animate-[bounce_2.6s_ease-in-out_infinite]'>
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
    const inter = sub.filter(x => x.go); const deco = sub.filter(x => !x.go)
    // el contenido va al lote del mapa completo (sus coordenadas mandan)
    groups[i].forEach((l, j) => items.push({ ...(inter[j] ?? deco[j % Math.max(1, deco.length)] ?? {}), x: l.x, y: l.y, w: l.w, bottom: l.bottom }))
  })
  return { items: items.sort((a, b) => a.y - b.y), labels }
}
