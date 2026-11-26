// Mapa modular: el piso (calles, banquetas, parques) se genera con código sobre una cuadrícula isométrica 2:1
// y encima van sprites individuales. Los coches siguen los nodos exactos de la cuadrícula.
import type { Colony } from '../data/cities'
import { isLite } from './settings'

export const TW = 96; export const TH = 48 // tamaño de un mosaico
export const P = 4 // cada cuadra son 3×3 mosaicos + 1 de calle
export const NBX = 11; export const NBY = 15 // cuadras en cada eje (ciudad amplia, con aire entre lugares)
export const NX = NBX * P + 1; export const NY = NBY * P + 1
export const TOP = 380 // margen para lo alto de los edificios de arriba
export const M = 220 // margen alrededor: ahí sigue la ciudad lejana
export const OX = NY * TW / 2 + M // origen x para que todo quede en positivo
export const W = (NX + NY) * TW / 2 + 2 * M; export const H = (NX + NY) * TH / 2 + TOP + M
// los teléfonos limitan el tamaño de un lienzo (~16 M de píxeles): el piso y el tráfico se pintan a esta resolución
export const RES = Math.min(1, Math.sqrt((isLite() ? 2.2e6 : 4.5e6) / (((NX + NY) * TW / 2 + 2 * M) * ((NX + NY) * TH / 2 + TOP + M))))
export const toScreen = (tx: number, ty: number) => ({ x: OX + (tx - ty) * TW / 2, y: TOP + (tx + ty) * TH / 2 })

// calles: cada 4 mosaicos. En pantalla el norte queda arriba y el oriente a la derecha.
// Paseo de la Reforma corre en diagonal del Centro (arriba a la derecha) a Chapultepec (abajo a la izquierda),
// sobre tx=12; Insurgentes la cruza sobre ty=16 en la glorieta del Ángel.
export const REFORMA_TX = 16; export const INSURGENTES_TY = 24
export const REFORMA = INSURGENTES_TY; export const INSURGENTES = REFORMA_TX // nombres viejos usados en el dibujo
export const isRoad = (tx: number, ty: number) => tx % P === 0 || ty % P === 0
export const isAvenue = (tx: number, ty: number) => tx === REFORMA_TX || ty === INSURGENTES_TY

export type BlockUse = { kind: 'mon'; sprite: string } | { kind: 'civic'; id: string } | { kind: 'park' } | { kind: 'lot'; colony: string } | { kind: 'curve'; sprite: string; colony: string } | { kind: 'area'; id: string }
export interface CityKit {
  id: string
  blocks: (bx: number, by: number) => BlockUse
  decor: Record<string, string[]> // sprites de relleno por colonia
}

const X = (s: string) => `kit/px/${s}.webp`; const K = (s: string) => `kit/cdmx/${s}.webp`; const K2 = (s: string) => `kit/cdmx2/${s}.webp`; const KP = (s: string) => `kit/polanco/${s}.webp`
// Plano de la CDMX con geografía real (11 × 15 manzanas). En pantalla el norte queda arriba,
// el oriente a la derecha. Cada lugar se colocó a partir de su posición real en km desde el Zócalo
// y luego se ajustó a la retícula: Reforma corre sobre tx=16 de Chapultepec (abajo-izquierda)
// a la Alameda (arriba-derecha); Insurgentes la cruza en ty=24, en la glorieta del Ángel.
// La Basílica queda lejos al norte, el aeropuerto al oriente y CU, el Azteca y Xochimilco al sur.
const MON: Record<string, string> = {
  // norte
  '4,0': K('monumento_basilica'), '2,1': X('10_monumento_raza'),
  // Centro Histórico (al oriente de la Alameda; el Zócalo es un área grande aparte)
  '5,1': X('14_arco_garibaldi'), '6,1': K('monumento_catedral'), '8,2': K('monumento_palacio_nacional'),
  '5,3': K('monumento_torre_latino'), '4,3': K('monumento_bellas_artes'), '3,5': X('13_hemiciclo_juarez'),
  '5,5': X('15_mercado_artesanias'), '6,6': X('20_arena_lucha_libre'),
  // Reforma, de la Alameda a Chapultepec
  '2,5': K('monumento_revolucion'), '4,5': X('12_senado_moderno'), '4,6': K('monumento_angel'),
  '3,7': X('19_torre_reforma'), '3,8': X('11_torre_mayor'), '4,8': K('monumento_estela_luz'),
  // Polanco y museos junto al bosque
  '2,8': X('02_museo_antropologia'), '1,8': X('17_auditorio_nacional'), '0,6': X('01_museo_soumaya'), '1,6': KP('polanco_estanque_lincoln'),
  // sur
  '7,8': X('18_hospital_grande'), '6,11': X('16_plaza_toros'), '8,12': X('03_casa_azul_frida')
}
const CIVIC: Record<string, string> = {
  '3,6': 'bolsa', '4,7': 'banco', '2,7': 'inversion', '0,7': 'estilo', '10,6': 'logistica', '0,11': 'corporativo', '10,3': 'aeropuerto', '9,2': 'central'
}
// Lugares grandes: ocupan varias manzanas juntas, sin calles por dentro (los coches las rodean).
// Cada uno tiene su piso y sus piezas acomodadas en mosaicos relativos a su esquina.
export interface Area { id: string; bx: number; by: number; w: number; h: number; ground: 'plaza' | 'park' | 'water'; items: [string, number, number, number][] }
const TREE = K2('veg_ahuehuete_chapultepec'); const JAC = K('deco_jacaranda'); const BUG = K2('veg_jardinera_bugambilias')
const ring = (w: number, h: number, sp: string, n = 2) => { const out: [string, number, number, number][] = []; const L = w * P - 1; const Hh = h * P - 1; for (let i = 0.6; i < L; i += n) { out.push([sp, i, 0.6, 0.55]); out.push([sp, i, Hh - 0.4, 0.55]) } for (let j = 2.6; j < Hh - 1; j += n) { out.push([sp, 0.6, j, 0.55]); out.push([sp, L - 0.4, j, 0.55]) } return out }
export const AREAS: Area[] = [
  { id: 'zocalo', bx: 6, by: 2, w: 2, h: 2, ground: 'plaza', items: [[K('monumento_zocalo'), 4.8, 4.8, 4.2], ...ring(2, 2, BUG, 2.4)] },
  { id: 'alameda', bx: 3, by: 3, w: 1, h: 2, ground: 'park', items: [[K('deco_kiosco_jardin'), 1.6, 3.6, 0.9], ...[[0.7, 0.8], [2.4, 1.2], [0.8, 2.6], [2.3, 5.6], [0.7, 6.2], [2.4, 3.4], [1.5, 1.8], [1.4, 5.0]].map(([x, y]) => [JAC, x, y, 0.75] as [string, number, number, number])] },
  { id: 'chapultepec', bx: 1, by: 9, w: 3, h: 3, ground: 'park', items: [[K('monumento_chapultepec'), 8.6, 2.8, 2.4], ...Array.from({ length: 22 }, (_, i) => [TREE, 0.8 + (i * 4.7) % 9.6, 0.8 + (i * 2.9 + Math.floor(i / 4) * 1.3) % 10, 0.62] as [string, number, number, number]).filter(([, x, y]) => !(x > 6.5 && y < 5) && !((x - 4.5) ** 2 + (y - 7) ** 2 < 4))] },
  { id: 'parque_mexico', bx: 5, by: 9, w: 1, h: 1, ground: 'park', items: ring(1, 1, JAC, 1.2) },
  { id: 'xochimilco', bx: 9, by: 10, w: 2, h: 2, ground: 'water', items: [[X('07_embarcadero_xochimilco'), 2.4, 2.6, 2.2], [X('09_chinampa_cultivos'), 5.6, 2.2, 1.6], [X('09_chinampa_cultivos'), 2.3, 5.8, 1.6], [X('09_chinampa_cultivos'), 5.8, 5.8, 1.6], [X('08_trajinera_navegando'), 4.0, 4.2, 0.9], [X('08_trajinera_navegando'), 4.1, 1.2, 0.9]] },
  { id: 'azteca', bx: 9, by: 12, w: 2, h: 2, ground: 'plaza', items: [[X('06_estadio_azteca'), 4.8, 4.8, 5.2], ...ring(2, 2, TREE, 2.6)] },
  { id: 'cu', bx: 6, by: 13, w: 2, h: 2, ground: 'park', items: [[X('04_rectoria_cu'), 2.6, 2.6, 2.4], [X('05_biblioteca_central_cu'), 5.8, 5.6, 2.2], ...[[5.6, 1.4], [1.4, 5.6], [3.6, 6.4], [6.4, 3.4]].map(([x, y]) => [TREE, x, y, 0.62] as [string, number, number, number])] }
]
const AREA_AT = new Map<string, Area>(); for (const a of AREAS) for (let i = 0; i < a.w; i++) for (let j = 0; j < a.h; j++) AREA_AT.set(`${a.bx + i},${a.by + j}`, a)
// ¿esta calle (mosaico) quedó dentro de un área grande? Los coches no entran ahí
export const blocked = (tx: number, ty: number) => AREAS.some(a => tx >= a.bx * P + 1 && tx < (a.bx + a.w) * P && ty >= a.by * P + 1 && ty < (a.by + a.h) * P)
const PARKS = new Set<string>()
export const WATER: Record<string, 'lago' | 'canal'> = {}
// centro de cada colonia en la retícula; cada manzana libre pertenece a la colonia más cercana
const COLONY_AT: [string, number, number][] = [
  ['polanco', 1, 6.5], ['centro', 6, 3.5], ['santafe', 0, 11], ['roma', 5, 8.5], ['narvarte', 7.5, 8],
  ['delvalle', 7, 10.5], ['coyoacan', 8, 13], ['iztapalapa', 10, 7.5]
]
const colonyOf = (bx: number, by: number) => {
  let best = 'centro'; let bd = Infinity
  for (const [id, x, y] of COLONY_AT) { const d = ((bx - by) - (x - y)) ** 2 + ((bx + by) - (x + y)) ** 2 * 0.8; if (d < bd) { bd = d; best = id } }
  return best
}
// calles que rompen la cuadrícula: retornos, curvas con camellón, bifurcaciones, glorietas y el distribuidor
// de San Antonio. Ocupan una manzana entera; se eligen por colonia para que tengan sentido.
const CURVE_BY: Record<string, string[]> = {
  coyoacan: ['via_curva_suave_90', 'via_retorno_residencial'], delvalle: ['via_retorno_residencial', 'via_segundo_piso_curvo'],
  santafe: ['via_retorno_residencial', 'via_curva_suave_90'], iztapalapa: ['via_bifurcacion_y'], narvarte: ['via_bifurcacion_y'], roma: ['via_glorieta_grande']
}
const CURVES: Record<string, string> = (() => {
  const out: Record<string, string> = {}; const used: Record<string, number> = {}
  for (let by = 0; by < NBY; by++) for (let bx = 0; bx < NBX; bx++) {
    const k = `${bx},${by}`; if (MON[k] || CIVIC[k] || PARKS.has(k) || AREA_AT.has(k)) continue
    const col = colonyOf(bx, by); const opts = CURVE_BY[col]; if (!opts) continue
    const n = used[col] ?? 0
    if (n < opts.length && (bx * 7 + by * 13) % 6 === 0) { out[k] = `kit/v3/${opts[n]}.webp`; used[col] = n + 1 }
  }
  return out
})()
export const CURVE_SPRITES = [...new Set(Object.values(CURVES))]
export const CDMX_KIT: CityKit = {
  id: 'cdmx',
  blocks: (bx, by) => {
    const k = `${bx},${by}`
    if (MON[k]) return { kind: 'mon', sprite: MON[k] }
    if (CIVIC[k]) return { kind: 'civic', id: CIVIC[k] }
    if (AREA_AT.has(k)) return { kind: 'area', id: AREA_AT.get(k)!.id }
    if (PARKS.has(k)) return { kind: 'park' }
    const col = colonyOf(bx, by)
    if (CURVES[k]) return { kind: 'curve', sprite: CURVES[k], colony: col }
    return { kind: 'lot', colony: col }
  },
  decor: {
    polanco: [X('02_torre_helipuerto'), KP('polanco_torre_corporativa'), KP('polanco_boutique_lujo'), K2('hotel_moderno_cristal'), X('01_rascacielos_reforma'), KP('polanco_residencia_lujo'), KP('polanco_cafe_bistro'), K2('hotel_torre_jardin_alberca'), X('mob_puesto_flores')],
    centro: [X('03_edificio_porfiriano'), X('04_colonial_tezontle'), K2('hotel_boutique_colonial'), X('05_vecindad_patio'), X('17_iglesia_barrio'), K2('hotel_clasico_reforma'), X('16_mercado_techado'), X('mob_puesto_periodicos'), X('19_entrada_metro')],
    roma: [X('06_deptos_condesa'), X('07_casa_art_deco_roma'), K('colonia_roma_art_deco'), K2('hotel_art_deco_condesa'), X('14_panaderia'), K2('casa_azul_bugambilia'), KP('polanco_cafe_bistro'), X('mob_puesto_flores')],
    narvarte: [X('08_edificio_narvarte_5p'), X('15_taqueria_trompo'), K('colonia_condesa_deptos'), X('13_farmacia_cruz_verde'), K2('casa_moderna_concreto_madera'), X('12_tiendita_esquina'), X('19_entrada_metro')],
    delvalle: [X('09_casa_del_valle_2p'), X('08_edificio_narvarte_5p'), K2('casa_moderna_concreto_madera'), X('18_escuela_primaria'), X('14_panaderia'), KP('polanco_residencia_lujo')],
    coyoacan: [X('10_casona_coyoacan'), K('colonia_coyoacan_casona'), K2('casa_azul_bugambilia'), X('17_iglesia_barrio'), K2('veg_jardinera_bugambilias'), X('mob_triciclo_tamales')],
    iztapalapa: [X('11_casa_block_iztapalapa'), K('colonia_iztapalapa_casa'), X('12_tiendita_esquina'), K2('bloque_3_casitas_adosadas'), X('15_taqueria_trompo'), X('16_mercado_techado'), X('18_escuela_primaria')],
    santafe: [X('01_rascacielos_reforma'), X('02_torre_helipuerto'), K2('hotel_moderno_cristal'), KP('polanco_torre_corporativa'), K2('hotel_torre_jardin_alberca')]
  }
}
export const KITS: Record<string, CityKit> = { cdmx: CDMX_KIT }

// posición de una cuadra en % del mundo: centro, punta de abajo y ancho del rombo
export function blockRect (bx: number, by: number) {
  const tx0 = bx * P + 1; const ty0 = by * P + 1
  const c = toScreen(tx0 + 1.5, ty0 + 1.5); const bottom = toScreen(tx0 + 3, ty0 + 3)
  return { x: c.x / W * 100, y: c.y / H * 100, bottom: bottom.y / H * 100, w: (3 * TW) / W * 100 }
}
export function colonyCenters (kit: CityKit, colonies: Colony[]) {
  return colonies.map(col => {
    const bs: { x: number; y: number }[] = []
    for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) { const u = kit.blocks(bx, by); if (u.kind === 'lot' && u.colony === col.id) bs.push(blockRect(bx, by)) }
    if (!bs.length) return null
    return { id: col.id, name: col.name, x: bs.reduce((a, b) => a + b.x, 0) / bs.length, y: Math.min(...bs.map(b => b.y)) - 4 }
  }).filter(Boolean) as { id: string; name: string; x: number; y: number }[]
}

// sprite parado en un punto del mundo (tx, ty) con un ancho en mosaicos
export function at (tx: number, ty: number, wTiles: number) {
  const p = toScreen(tx, ty)
  return { x: p.x / W * 100, y: (p.y - TH) / H * 100, bottom: p.y / H * 100, w: wTiles * TW / W * 100 }
}
// cuatro edificios por cuadra: el centro de cada cuarto, con la base hacia el frente
export const quarters = (bx: number, by: number) => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([qx, qy]) => at(bx * P + 1 + 0.25 + qx * 1.25 + 1.0, by * P + 1 + 0.25 + qy * 1.25 + 1.0, 1.18))
// adornos de la ciudad: palmeras en los camellones y cerros alrededor del valle
export function scenery () {
  const out: { r: ReturnType<typeof at>; ed: string }[] = []
  for (let j = 1; j < NY; j++) if (j % P !== 0 && j % 2 === 0) out.push({ r: at(REFORMA_TX + 0.55, j + 0.5, 0.5), ed: K2('veg_palmera_reforma') })
  return out
}

// baches de la ciudad (siempre los mismos): se pintan en el piso y los coches frenan al pasarlos
const seeded = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x) }
export const POTHOLES: { axis: 'x' | 'y'; line: number; pos: number }[] = Array.from({ length: 46 }, (_, i) => {
  const axis = seeded(i) < 0.5 ? 'x' : 'y'
  const line = Math.floor(seeded(i + 99) * ((axis === 'x' ? NY : NX) - 1) / P) * P
  let pos = 1 + seeded(i + 7) * ((axis === 'x' ? NX : NY) - 3); if (pos % P < 1.3) pos += 1.6
  return { axis, line, pos }
})

// Periférico con segundo piso: una vía curva que rodea la ciudad por el poniente y el sur
// (no sigue la cuadrícula). Se describe con curvas y se recorre por distancia.
const bez = (a: number[], b: number[], c: number[], d: number[], t: number) => { const u = 1 - t; return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]) }
export const PERIFERICO: [number, number][] = (() => {
  const segs = [
    [[-2.5, -3], [-3.5, NY * 0.3], [-1.5, NY * 0.55], [-2.5, NY * 0.75]],
    [[-2.5, NY * 0.75], [-3.5, NY + 1], [NX * 0.15, NY + 3.5], [NX * 0.45, NY + 2.5]],
    [[NX * 0.45, NY + 2.5], [NX * 0.75, NY + 1.5], [NX + 1, NY + 4], [NX + 4, NY + 2.5]]
  ]
  const out: [number, number][] = []
  for (const [a, b, c, d] of segs) for (let i = 0; i < 40; i++) { const p = bez(a, b, c, d, i / 40); out.push([p[0], p[1]]) }
  return out
})()
export function alongPeriferico (t: number) { // t de 0 a 1 → punto y dirección en pantalla
  const n = PERIFERICO.length - 1; const f = Math.max(0, Math.min(n - 0.001, t * n)); const i = Math.floor(f); const k = f - i
  const [x0, y0] = PERIFERICO[i]; const [x1, y1] = PERIFERICO[i + 1]
  const a = toScreen(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); const b = toScreen(x1, y1)
  return { x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y }
}
export const DECK = 46 // altura del segundo piso en píxeles

// ---------- dibujo del piso ----------
// todo se dibuja con formas limpias: asfalto continuo, banquetas alrededor de cada cuadra,
// líneas de carril, cebras solo en las esquinas y camellón verde en Reforma e Insurgentes
export function drawGround (ctx: CanvasRenderingContext2D, kit: CityKit, _img: (p: string) => HTMLImageElement | null, night: boolean) {
  ctx.fillStyle = '#6E8F50'; ctx.fillRect(0, 0, W, H)
  const poly = (pts: [number, number][], fill: string, stroke?: string) => {
    ctx.beginPath(); pts.forEach(([tx, ty], i) => { const p = toScreen(tx, ty); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y) }); ctx.closePath()
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, fill: string, stroke?: string) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, stroke)
  const line = (a: [number, number], b: [number, number], color: string, w: number, dash: number[] = []) => {
    const p = toScreen(...a); const q = toScreen(...b); ctx.beginPath(); ctx.setLineDash(dash); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([])
  }
  // la ciudad sigue más allá del borde: calles y casitas sencillas hasta el horizonte (sin pasto vacío)
  const EXT = 26
  rect(-EXT, -EXT, NX + EXT, NY + EXT, '#4A4D55')
  const roofs = ['#C9694A', '#D9A066', '#B9B2A4', '#E3C9A0', '#9DA7B3', '#C98B6B']
  for (let i = -EXT; i < NX + EXT; i += P) for (let j = -EXT; j < NY + EXT; j += P) {
    if (i >= 0 && i < NX - 1 && j >= 0 && j < NY - 1) continue
    rect(i + 1, j + 1, i + 4, j + 4, '#CFC8B9')
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { // casitas de 1 mosaico: muro y azotea
      const x0 = i + 1.12 + a; const y0 = j + 1.12 + b; const hgt = 10 + ((i * 7 + j * 3 + a * 5 + b) % 4) * 7
      const p1 = toScreen(x0, y0 + 0.76); const p2 = toScreen(x0 + 0.76, y0 + 0.76); const p3 = toScreen(x0 + 0.76, y0)
      ctx.fillStyle = '#8F8676'; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p2.x, p2.y - hgt); ctx.lineTo(p1.x, p1.y - hgt); ctx.fill()
      ctx.fillStyle = '#A79D8B'; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p3.x, p3.y - hgt); ctx.lineTo(p2.x, p2.y - hgt); ctx.fill()
      ctx.save(); ctx.translate(0, -hgt); rect(x0, y0, x0 + 0.76, y0 + 0.76, roofs[(i + j * 3 + a + b * 2 + 60) % roofs.length]); ctx.restore()
    }
  }
  // Periférico: columnas, calzada de abajo y segundo piso elevado
  const path = (lift: number) => { ctx.beginPath(); PERIFERICO.forEach(([x, y], i) => { const p = toScreen(x, y); if (i) ctx.lineTo(p.x, p.y - lift); else ctx.moveTo(p.x, p.y - lift) }) }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  path(0); ctx.strokeStyle = '#3E4148'; ctx.lineWidth = 64; ctx.stroke()
  path(0); ctx.strokeStyle = '#E8C547'; ctx.lineWidth = 2; ctx.setLineDash([16, 14]); ctx.stroke(); ctx.setLineDash([])
  PERIFERICO.forEach(([x, y], i) => { if (i % 5) return; const p = toScreen(x, y); ctx.fillStyle = '#9A958B'; ctx.fillRect(p.x - 5, p.y - DECK, 10, DECK); ctx.fillStyle = '#7E796F'; ctx.fillRect(p.x + 1, p.y - DECK, 4, DECK) })
  path(DECK - 6); ctx.strokeStyle = '#8D877C'; ctx.lineWidth = 50; ctx.stroke() // canto del puente
  path(DECK); ctx.strokeStyle = '#53565D'; ctx.lineWidth = 46; ctx.stroke()
  path(DECK); ctx.strokeStyle = '#EDEDED'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = 'rgba(233,226,210,.18)'; ctx.fillRect(0, 0, W, H) // bruma ligera: lo lejano se ve más tenue
  rect(0, 0, NX, NY, '#4A4D55')
  // camellones de las avenidas
  rect(INSURGENTES + 0.44, 0, INSURGENTES + 0.56, NY, '#6FA04A')
  rect(0, REFORMA + 0.44, NX, REFORMA + 0.56, '#6FA04A')
  // líneas de carril (amarillas al centro) en las calles normales
  for (let i = 0; i < NX; i += P) if (i !== INSURGENTES) line([i + 0.5, 0], [i + 0.5, NY], '#E8C547', 2, [18, 14])
  for (let j = 0; j < NY; j += P) if (j !== REFORMA) line([0, j + 0.5], [NX, j + 0.5], '#E8C547', 2, [18, 14])
  // cebras en cada esquina
  for (let i = 0; i < NX; i += P) for (let j = 0; j < NY; j += P) {
    for (let k = 0; k < 5; k++) {
      const t = 0.12 + k * 0.17
      rect(i + t, j - 0.32, i + t + 0.08, j - 0.04, 'rgba(255,255,255,.85)'); rect(i + t, j + 1.04, i + t + 0.08, j + 1.32, 'rgba(255,255,255,.85)')
      rect(i - 0.32, j + t, i - 0.04, j + t + 0.08, 'rgba(255,255,255,.85)'); rect(i + 1.04, j + t, i + 1.32, j + t + 0.08, 'rgba(255,255,255,.85)')
    }
  }
  // glorieta del Ángel
  // vida de calle mexicana: parches de asfalto, baches, coladeras y topes
  for (let k = 0; k < 120; k++) {
    const ax = seeded(k + 300) < 0.5; const line = Math.floor(seeded(k + 400) * ((ax ? NY : NX) - 1) / P) * P; const pos = seeded(k + 500) * (ax ? NX : NY)
    const [a, b] = ax ? [pos, line] : [line, pos]
    rect(a + 0.1, b + 0.15, a + 0.1 + 0.3 + seeded(k) * 0.5, b + 0.85, seeded(k + 1) < 0.5 ? '#55585F' : '#43464D')
  }
  for (const h of POTHOLES) {
    const p = h.axis === 'x' ? toScreen(h.pos, h.line + 0.5 + (seeded(h.pos) - 0.5) * 0.5) : toScreen(h.line + 0.5 + (seeded(h.pos) - 0.5) * 0.5, h.pos)
    ctx.fillStyle = '#2C2E33'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 11, 5, 0, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(120,110,95,.6)'; ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 1, 6, 2.5, 0, 0, 7); ctx.fill()
  }
  for (let k = 0; k < 60; k++) { // coladeras
    const ax = seeded(k + 800) < 0.5; const line = Math.floor(seeded(k + 900) * ((ax ? NY : NX) - 1) / P) * P; const pos = seeded(k + 950) * (ax ? NX : NY)
    const p = ax ? toScreen(pos, line + 0.8) : toScreen(line + 0.8, pos)
    ctx.fillStyle = '#2E3036'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#6A6D74'; ctx.lineWidth = 1; ctx.stroke()
  }
  // glorietas en fila sobre Reforma, como en la foto satelital
  for (let j = 0; j < NY; j += P) {
    const g = toScreen(REFORMA_TX + 0.5, j + 0.5); const big = j === INSURGENTES_TY
    ctx.beginPath(); ctx.ellipse(g.x, g.y, TW * (big ? 0.46 : 0.34), TH * (big ? 0.46 : 0.34), 0, 0, 7); ctx.fillStyle = '#6FA04A'; ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 6; ctx.stroke()
  }
  // cuadras: banqueta, guarnición y el interior (plaza, pasto o patio)
  for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) {
    const x0 = bx * P + 1; const y0 = by * P + 1
    const u = kit.blocks(bx, by)
    const park = u.kind === 'park' || (u.kind === 'mon' && /chapultepec|estanque|zocalo|chinampa|embarcadero|antropologia|parque_|alameda|borde_/.test(u.sprite))
    if (u.kind === 'area') continue // las áreas grandes se pintan completas más abajo
    if (u.kind === 'curve') { // la manzana entera es calle curva: se estira al rombo exacto de la cuadra
      const im = _img(u.sprite); const top = toScreen(x0 - 0.1, y0 - 0.1); const w = 3.2 * TW; const h = 3.2 * TH
      if (im) ctx.drawImage(im, top.x - w / 2, top.y, w, h)
      else rect(x0, y0, x0 + 3, y0 + 3, '#7DB35A')
      continue
    }
    // Coyoacán: calles empedradas alrededor de la manzana
    if (u.kind === 'lot' && u.colony === 'coyoacan') {
      rect(x0 - 1, y0 - 1, x0 + 4, y0 + 4, '#8B7A68')
      for (let d = 0; d < 26; d++) { const p = toScreen(x0 - 0.9 + seeded(d + bx * 31) * 4.8, y0 - 0.9 + seeded(d + by * 17) * 4.8); ctx.fillStyle = 'rgba(60,45,35,.35)'; ctx.fillRect(p.x, p.y, 4, 2) }
    }
    rect(x0 - 0.02, y0 - 0.02, x0 + 3.02, y0 + 3.02, '#B9B2A4') // guarnición
    rect(x0, y0, x0 + 3, y0 + 3, '#DCD5C6') // banqueta
    rect(x0 + 0.28, y0 + 0.28, x0 + 2.72, y0 + 2.72, park ? '#7DB35A' : u.kind === 'mon' ? '#E6DCC6' : '#C9C2B2', park ? '#5E9440' : '#B3AB9A')
    const wt = WATER[`${bx},${by}`]
    if (wt === 'lago') { const c = toScreen(x0 + 1.5, y0 + 1.5); ctx.fillStyle = '#4FB3C8'; ctx.beginPath(); ctx.ellipse(c.x, c.y, TW * 0.95, TH * 0.75, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 4; ctx.stroke() }
    if (wt === 'canal') { rect(x0 + 0.3, y0 + 1.2, x0 + 2.7, y0 + 1.8, '#4FB3C8'); rect(x0 + 1.2, y0 + 0.3, x0 + 1.8, y0 + 2.7, '#4FB3C8') }
    if (!park) for (const [a, b] of [[0.14, 0.14], [2.86, 0.14], [0.14, 2.86], [2.86, 2.86], [1.5, 0.14], [0.14, 1.5]]) {
      const p = toScreen(x0 + a, y0 + b); ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 11, 9, 0, 0, 7); ctx.fillStyle = '#5C8F3C'; ctx.fill()
    }
  }
  // áreas grandes: un solo piso continuo que tapa las calles de adentro, con banqueta alrededor
  for (const a of AREAS) {
    const x0 = a.bx * P + 1; const y0 = a.by * P + 1; const x1 = (a.bx + a.w) * P; const y1 = (a.by + a.h) * P
    rect(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, '#B9B2A4'); rect(x0, y0, x1, y1, '#DCD5C6')
    const fill = a.ground === 'plaza' ? '#D9CCB4' : '#7DB35A'
    rect(x0 + 0.28, y0 + 0.28, x1 - 0.28, y1 - 0.28, fill, a.ground === 'plaza' ? '#BFAE90' : '#5E9440')
    if (a.ground === 'plaza') for (let i = x0 + 1; i < x1 - 0.5; i += 1) line([i, y0 + 0.3], [i, y1 - 0.3], 'rgba(150,130,100,.35)', 1)
    if (a.id === 'chapultepec') { const c = toScreen(x0 + 4.5, y0 + 7); ctx.fillStyle = '#4FB3C8'; ctx.beginPath(); ctx.ellipse(c.x, c.y, TW * 1.6, TH * 1.2, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 5; ctx.stroke() }
    if (a.id === 'parque_mexico') { const c = toScreen(x0 + 1.5, y0 + 1.5); ctx.strokeStyle = '#D9CCB4'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(c.x, c.y, TW * 1.05, TH * 1.05, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#4FB3C8'; ctx.beginPath(); ctx.ellipse(c.x, c.y, TW * 0.4, TH * 0.4, 0, 0, 7); ctx.fill() }
    if (a.ground === 'water') for (let k = 0; k < 3; k++) { rect(x0 + 0.4, y0 + 1.1 + k * 2.6, x1 - 0.4, y0 + 1.6 + k * 2.6, '#4FB3C8'); rect(x0 + 1.1 + k * 2.6, y0 + 0.4, x0 + 1.6 + k * 2.6, y1 - 0.4, '#4FB3C8') }
  }
  if (night) { // noche: tinte índigo multiplicado (oscurece sin lavar los colores)
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(118,128,182)'; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
}
