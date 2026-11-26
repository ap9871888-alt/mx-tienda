// Mapa modular: el piso (calles, banquetas, parques) se genera con código sobre una cuadrícula isométrica 2:1
// y encima van sprites individuales. Los coches siguen los nodos exactos de la cuadrícula.
import type { Colony } from '../data/cities'

export const TW = 96; export const TH = 48 // tamaño de un mosaico
export const P = 4 // cada cuadra son 3×3 mosaicos + 1 de calle
export const NBX = 7; export const NBY = 8 // cuadras en cada eje
export const NX = NBX * P + 1; export const NY = NBY * P + 1
export const TOP = 380 // margen para lo alto de los edificios de arriba
export const M = 120 // margen alrededor para los cerros del borde
export const OX = NY * TW / 2 + M // origen x para que todo quede en positivo
export const W = (NX + NY) * TW / 2 + 2 * M; export const H = (NX + NY) * TH / 2 + TOP + M
export const toScreen = (tx: number, ty: number) => ({ x: OX + (tx - ty) * TW / 2, y: TOP + (tx + ty) * TH / 2 })

// calles: cada 4 mosaicos. En pantalla el norte queda arriba y el oriente a la derecha.
// Paseo de la Reforma corre en diagonal del Centro (arriba a la derecha) a Chapultepec (abajo a la izquierda),
// sobre tx=12; Insurgentes la cruza sobre ty=16 en la glorieta del Ángel.
export const REFORMA_TX = 12; export const INSURGENTES_TY = 16
export const REFORMA = INSURGENTES_TY; export const INSURGENTES = REFORMA_TX // nombres viejos usados en el dibujo
export const isRoad = (tx: number, ty: number) => tx % P === 0 || ty % P === 0
export const isAvenue = (tx: number, ty: number) => tx === REFORMA_TX || ty === INSURGENTES_TY

export type BlockUse = { kind: 'mon'; sprite: string } | { kind: 'civic'; id: string } | { kind: 'park' } | { kind: 'lot'; colony: string }
export interface CityKit {
  id: string
  blocks: (bx: number, by: number) => BlockUse
  decor: Record<string, string[]> // sprites de relleno por colonia
}

const K = (s: string) => `kit/cdmx/${s}.webp`; const K2 = (s: string) => `kit/cdmx2/${s}.webp`; const KP = (s: string) => `kit/polanco/${s}.webp`; const X = (s: string) => `kit/px/${s}.webp`
// manzanas: (bx, by). Arriba = norte (Gustavo A. Madero), derecha = oriente (Iztapalapa, aeropuerto),
// izquierda = poniente (Polanco, Santa Fe), abajo = sur (Coyoacán)
const MON: Record<string, string> = {
  '1,0': K('monumento_basilica'), // La Villa, al norte
  '3,0': K('monumento_bellas_artes'), // fin de Reforma: Alameda y Bellas Artes
  '4,0': K('monumento_torre_latino'), // Madero
  '5,0': K('monumento_catedral'),
  '6,0': K('monumento_zocalo'),
  '6,1': K('monumento_palacio_nacional'), // al oriente del Zócalo
  '2,1': K('monumento_revolucion'), // junto a Reforma, al poniente
  '3,3': K('monumento_angel'), // glorieta de Reforma e Insurgentes
  '3,5': K('monumento_estela_luz'), // entrada a Chapultepec
  '2,6': K('monumento_chapultepec'), // el Castillo
  '1,4': KP('polanco_museo_moderno'), // museos de Polanco
  '0,3': KP('polanco_estanque_lincoln') // parque Lincoln
}
const CIVIC: Record<string, string> = {
  '4,1': 'banco', '3,2': 'bolsa', '2,3': 'inversion', '1,3': 'estilo', '6,3': 'logistica', '0,6': 'corporativo', '6,2': 'aeropuerto', '2,0': 'central'
}
const PARKS = new Set(['1,6', '1,7', '2,7', '1,5']) // bosque de Chapultepec
// colonias por manzana (filas = by, columnas = bx)
const GRID = [
  'CCCCCCC',
  'PCCCCCC',
  'PPCCNII',
  'PPCCNII',
  'PPRRNDI',
  'SPRRDDI',
  'SSRRDYY',
  'SSRRDYY'
]
const CODE: Record<string, string> = { C: 'centro', P: 'polanco', S: 'santafe', I: 'iztapalapa', R: 'roma', N: 'narvarte', D: 'delvalle', Y: 'coyoacan' }
const colonyOf = (bx: number, by: number) => CODE[GRID[by]?.[bx] ?? 'C']
export const CDMX_KIT: CityKit = {
  id: 'cdmx',
  blocks: (bx, by) => {
    const k = `${bx},${by}`
    if (MON[k]) return { kind: 'mon', sprite: MON[k] }
    if (CIVIC[k]) return { kind: 'civic', id: CIVIC[k] }
    if (PARKS.has(k)) return { kind: 'park' }
    return { kind: 'lot', colony: colonyOf(bx, by) }
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
  // asfalto de toda la ciudad
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
  // glorietas en fila sobre Reforma, como en la foto satelital
  for (let j = 0; j < NY; j += P) {
    const g = toScreen(REFORMA_TX + 0.5, j + 0.5); const big = j === INSURGENTES_TY
    ctx.beginPath(); ctx.ellipse(g.x, g.y, TW * (big ? 0.46 : 0.34), TH * (big ? 0.46 : 0.34), 0, 0, 7); ctx.fillStyle = '#6FA04A'; ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 6; ctx.stroke()
  }
  // cuadras: banqueta, guarnición y el interior (plaza, pasto o patio)
  for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) {
    const x0 = bx * P + 1; const y0 = by * P + 1
    const u = kit.blocks(bx, by)
    const park = u.kind === 'park' || (u.kind === 'mon' && /chapultepec|estanque|zocalo/.test(u.sprite))
    rect(x0 - 0.02, y0 - 0.02, x0 + 3.02, y0 + 3.02, '#B9B2A4') // guarnición
    rect(x0, y0, x0 + 3, y0 + 3, '#DCD5C6') // banqueta
    rect(x0 + 0.28, y0 + 0.28, x0 + 2.72, y0 + 2.72, park ? '#7DB35A' : u.kind === 'mon' ? '#E6DCC6' : '#C9C2B2', park ? '#5E9440' : '#B3AB9A')
    if (!park) for (const [a, b] of [[0.14, 0.14], [2.86, 0.14], [0.14, 2.86], [2.86, 2.86], [1.5, 0.14], [0.14, 1.5]]) {
      const p = toScreen(x0 + a, y0 + b); ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 11, 9, 0, 0, 7); ctx.fillStyle = '#5C8F3C'; ctx.fill()
    }
  }
  if (night) { ctx.fillStyle = 'rgba(14,20,48,.45)'; ctx.fillRect(0, 0, W, H) }
}
