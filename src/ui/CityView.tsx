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

interface Lot { x: number; y: number; ed?: string; pin?: string; pinImg?: string; color?: string; tag?: string; mine?: boolean; go?: () => void; label?: string; big?: boolean }
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
      put({ ed: `sprites/tienda-${fmt}-${E.isOpen(s, E.hourOf(g.minute)) ? (night ? 'noche' : 'dia') : 'cerrada'}.webp`, pin: 'mine', color: myColor, tag: 'TU TIENDA', mine: true, label: E.storeShort(s), go: () => { useApp.getState().selectStore(s.id); useApp.getState().setTab('tienda') } })
    }
    const rivals = g.market?.rivals.flatMap(r => Array.from({ length: r.stores[colony.id] || 0 }, () => r)) ?? []
    for (const r of rivals.slice(0, Math.max(0, items.length - i - 2))) put({ ed: `city/ed-plaza-${tod}.webp`, pin: 'rival', color: r.color, tag: r.name.split(' ')[0], label: r.name, go: () => useApp.getState().say(`${r.name}: ${r.style === 'precio' ? 'baja precios donde tú ganas' : r.style === 'premium' ? 'busca clientes con dinero' : r.style === 'barrio' ? 'llena las colonias de tienditas' : 'abre por todos lados'}`) })
    const free = Math.max(0, colony.slots - g.stores.filter(x => x.colonyId === colony.id).length)
    for (let k = 0; k < Math.min(2, free) && i < items.length; k++) put({ pin: 'renta', tag: 'SE RENTA', label: `Abrir en ${colony.name}`, go: () => useApp.getState().focusColony(colony.id) })
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
  civicBy[0].push({ ed: `city/ed-banco-${tod}.webp`, pin: 'banco', tag: 'BANCO', label: 'Banco: créditos e inversiones', go: open('banco'), big: true })
  civicBy[Math.min(1, tiles.length - 1)].push({ ed: `city/ed-torre-${tod}.webp`, pinImg: 'ui/bolsa.webp', tag: 'BOLSA MX', label: 'Bolsa MX', go: open('bolsa'), big: true })
  civicBy[Math.min(1, tiles.length - 1)].push({ ed: `city/ed-oficinas-${tod}.webp`, pin: 'oficina', tag: game.offer ? '¡OFERTA!' : 'INVERSIONISTAS', label: 'Torre de inversionistas', go: open('inversion') })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: `city/ed-plaza-${tod}.webp`, pin: 'oficina', tag: 'PLAZA · ESTILO', label: 'Plaza comercial: estilo de vida', go: open('estilo') })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: `city/ed-mercado-${tod}.webp`, pin: 'cedis', tag: game.cedis ? 'TU CEDIS' : 'CENTRAL DE ABASTO', label: 'Logística y mayoristas', go: open('logistica') })
  civicBy[Math.min(3, tiles.length - 1)].push({ ed: `city/ed-${office >= 3 ? 'torre' : 'oficinas'}-${tod}.webp`, pin: 'oficina', tag: office ? 'TU SEDE' : 'CORPORATIVO', label: 'Corporativo: ganancias y cortes', go: open('corporativo') })
  civicBy[Math.min(3, tiles.length - 1)].push({ ed: 'city/ed-aeropuerto-dia.webp', pinImg: 'city/pin-aeropuerto.webp', tag: 'AEROPUERTO', label: 'Viajar en avión a otro estado', go: () => useApp.getState().openStates(), big: true })
  civicBy[Math.min(2, tiles.length - 1)].push({ ed: 'city/ed-central-dia.webp', pinImg: 'city/pin-central.webp', tag: 'CENTRAL DE AUTOBUSES', label: 'Viajar en autobús', go: () => useApp.getState().openStates(), big: true })

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
    const minS = Math.max(vw / W, vh / H) * 0.98; c.s = Math.min(1.6, Math.max(minS, c.s))
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
            <ColonyTraffic grid={full} night={night} density={2.2} />
            {fullItems.labels.map(l => <span key={l.id} className='absolute z-[2000] -translate-x-1/2 bg-urbano/85 text-white text-[30px] leading-tight font-black rounded-3xl px-4 py-1 pointer-events-none shadow-lg whitespace-nowrap' style={{ left: `${l.x}%`, top: `${l.y - 5}%` }}>{l.name}{l.mine ? ` · ${l.mine} 🏪` : ''}</span>)}
            {fullItems.items.map((l, j) => <LotButton key={j} l={l} width='12.5%' big='14%' myColor={myColor} myIcon={myIcon} dy={2.2} ps={1.7} />)}
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
        <button onClick={() => useApp.getState().setTab('tienda')} aria-label='Mis tiendas' className='w-14 h-14 rounded-2xl bg-urbano/90 text-white text-2xl shadow-lg grid place-items-center'>🏪</button>
        <button onClick={() => useApp.getState().openStates()} className='flex-1 max-w-[260px] min-h-[56px] rounded-2xl bg-urbano/90 text-white font-bold shadow-lg flex items-center justify-center gap-2'>
          <span>{(game.here ?? 'cdmx') === city.id ? '📍' : '🗺️'}</span><span className='truncate'>{city.name} · {city.state}</span><span className='opacity-70'>▾</span>
        </button>
        <button onClick={() => useApp.getState().setMore(true)} aria-label='Menú' className='relative w-14 h-14 rounded-2xl bg-urbano/90 text-white text-2xl shadow-lg grid place-items-center'>☰{game.offer && <span className='absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-oferta animate-pulse' />}</button>
      </div>
    </div>
  )
}

function LotButton ({ l, width, big, myColor, myIcon, dy, ps }: { l: Lot; width: string; big: string; myColor: string; myIcon: string; dy: number; ps: number }) {
  return (
    <button onClick={l.go} disabled={!l.go} aria-label={l.label} className='absolute' style={{ left: `${l.x}%`, top: `${l.y + dy}%`, width: l.big ? big : width, transform: 'translate(-50%, -100%)', zIndex: Math.round(l.y * 10) }}>
      {l.ed ? <img src={assetUrl(l.ed)} alt='' className='w-full drop-shadow' draggable={false} /> : <div className='w-full aspect-[2/1]' />}
      {(l.pin || l.pinImg) && <span className='absolute left-1/2 bottom-[80%] pointer-events-none' style={{ transform: `translateX(-50%) scale(${ps})`, transformOrigin: 'bottom center' }}><span className='flex flex-col items-center animate-[bounce_2.4s_ease-in-out_infinite]'>
        {l.tag && <span className='text-[19px] font-black text-white rounded-xl px-2.5 py-1 mb-1 whitespace-nowrap shadow-lg' style={{ background: l.mine ? myColor : l.pin === 'renta' ? '#D63B2F' : '#2B2D33' }}>{l.tag}</span>}
        {l.color ? <span className='relative w-[72px] h-[72px] grid place-items-center'>
          <span className='absolute inset-0 rounded-[50%_50%_50%_0] -rotate-45 border-[3px] border-urbano shadow-lg' style={{ background: l.color }} />
          <span className='relative grid place-items-center w-full h-full -translate-y-0.5'>{l.mine ? <img src={assetUrl(`ui/logo-${myIcon}.webp`)} alt='' className='w-[60%] rounded-full bg-white p-0.5' /> : <span className='text-white font-black text-3xl'>{(l.tag ?? '?')[0]}</span>}</span>
        </span> : <img src={assetUrl(l.pinImg ?? `city/pin-${l.pin}.webp`)} alt='' draggable={false} className={l.pinImg === 'ui/bolsa.webp' ? 'w-[72px] rounded-xl shadow-lg' : 'w-16'} />}
      </span></span>}
    </button>
  )
}

// reparte los lotes del mapa completo: primero los edificios de la ciudad, luego cada colonia toma sus lotes más cercanos
function fullLayout (g: GameState, colonies: Colony[], map: MapData, civic: Civic[], tod: string) {
  const lots = map.lots.map(([x, y]) => ({ x, y }))
  const civ = civic
  // los cívicos toman lotes repartidos por el mapa
  const step = Math.max(1, Math.floor(lots.length / civ.length))
  const civicLots = civ.map((_, i) => lots[(i * step + 1) % lots.length])
  const rest = lots.filter(l => !civicLots.includes(l))
  // centros de colonia: k-medias sencillas sobre los lotes restantes
  let centers = colonies.map((_, i) => ({ ...rest[Math.floor(i * rest.length / colonies.length)] }))
  let groups: { x: number; y: number }[][] = []
  for (let it = 0; it < 8; it++) {
    groups = colonies.map(() => [])
    for (const l of rest) { let b = 0; let bd = Infinity; centers.forEach((c, i) => { const d = (c.x - l.x) ** 2 + ((c.y - l.y) * 1.8) ** 2; if (d < bd) { bd = d; b = i } }); groups[b].push(l) }
    centers = centers.map((c, i) => groups[i].length ? { x: groups[i].reduce((a, l) => a + l.x, 0) / groups[i].length, y: groups[i].reduce((a, l) => a + l.y, 0) / groups[i].length } : c)
  }
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
    groups[i].forEach((l, j) => items.push({ ...l, ...(inter[j] ?? deco[j % Math.max(1, deco.length)] ?? {}) }))
  })
  return { items: items.sort((a, b) => a.y - b.y), labels }
}
