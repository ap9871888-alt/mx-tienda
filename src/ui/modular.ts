// Mapa modular: el piso (calles, banquetas, parques) se genera con código sobre una cuadrícula isométrica 2:1
// y encima van sprites individuales. Los coches siguen los nodos exactos de la cuadrícula.
import type { Colony } from '../data/cities'

export const TW = 96; export const TH = 48 // tamaño de un mosaico
export const P = 4 // cada cuadra son 3×3 mosaicos + 1 de calle
export const NBX = 7; export const NBY = 8 // cuadras en cada eje
export const NX = NBX * P + 1; export const NY = NBY * P + 1
export const TOP = 380 // margen para lo alto de los edificios de arriba
export const OX = NY * TW / 2 // origen x para que todo quede en positivo
export const W = (NX + NY) * TW / 2; export const H = (NX + NY) * TH / 2 + TOP
export const toScreen = (tx: number, ty: number) => ({ x: OX + (tx - ty) * TW / 2, y: TOP + (tx + ty) * TH / 2 })

// calles: cada 4 mosaicos. Reforma corre a lo largo de ty=16 e Insurgentes de tx=12
export const REFORMA = 16; export const INSURGENTES = 12
export const isRoad = (tx: number, ty: number) => tx % P === 0 || ty % P === 0
export const isAvenue = (tx: number, ty: number) => ty === REFORMA || tx === INSURGENTES

export type BlockUse = { kind: 'mon'; sprite: string } | { kind: 'civic'; id: string } | { kind: 'park' } | { kind: 'lot'; colony: string }
export interface CityKit {
  id: string
  blocks: (bx: number, by: number) => BlockUse
  decor: Record<string, string[]> // sprites de relleno por colonia
}

const K = (s: string) => `kit/cdmx/${s}.webp`; const KP = (s: string) => `kit/polanco/${s}.webp`
// geografía real simplificada: norte arriba, poniente a la izquierda, oriente a la derecha
const MON: Record<string, string> = {
  '3,0': K('monumento_basilica'), // La Villa, al norte
  '0,3': K('monumento_chapultepec'), // Castillo en el bosque, al poniente
  '1,3': K('monumento_estela_luz'), // Estela de Luz sobre Reforma
  '3,3': K('monumento_angel'), // Ángel de la Independencia sobre Reforma
  '5,2': K('monumento_revolucion'), // Monumento a la Revolución
  '6,3': K('monumento_bellas_artes'), // Bellas Artes, junto a la Alameda
  '5,3': K('monumento_torre_latino'), // Torre Latinoamericana
  '6,1': K('monumento_catedral'), // Catedral Metropolitana
  '6,2': K('monumento_zocalo'), // Zócalo
  '5,1': K('monumento_palacio_nacional'), // Palacio Nacional
  '1,2': KP('polanco_museo_moderno'), // museo moderno de Polanco
  '0,2': KP('polanco_estanque_lincoln') // parque Lincoln
}
const CIVIC: Record<string, string> = {
  '4,3': 'banco', '2,3': 'bolsa', '1,1': 'inversion', '0,1': 'estilo', '6,5': 'logistica', '0,6': 'corporativo', '6,4': 'aeropuerto', '4,0': 'central'
}
const PARKS = new Set(['0,4', '0,5', '3,7'])
function colonyOf (bx: number, by: number) {
  if (by <= 2 && bx <= 2) return 'polanco'
  if (by <= 3 && bx >= 4) return 'centro'
  if (by <= 3) return 'polanco'
  if (bx === 0) return 'santafe'
  if (bx >= 5) return 'iztapalapa'
  if (by >= 7) return 'coyoacan'
  if (bx <= 2 && by <= 5) return 'roma'
  if (by <= 5) return 'narvarte'
  return 'delvalle'
}
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
    polanco: [KP('polanco_torre_corporativa'), KP('polanco_boutique_lujo'), KP('polanco_residencia_lujo'), KP('polanco_cafe_bistro'), K('colonia_polanco_torre')],
    centro: [K('comercio_mercado_frutas'), K('colonia_roma_art_deco'), K('comercio_puesto_tacos')],
    roma: [K('colonia_roma_art_deco'), K('colonia_condesa_deptos'), KP('polanco_cafe_bistro')],
    narvarte: [K('colonia_condesa_deptos'), K('colonia_roma_art_deco')],
    delvalle: [K('colonia_condesa_deptos'), KP('polanco_residencia_lujo')],
    coyoacan: [K('colonia_coyoacan_casona'), K('deco_kiosco_jardin')],
    iztapalapa: [K('colonia_iztapalapa_casa'), K('comercio_puesto_tacos'), K('comercio_mercado_frutas')],
    santafe: [K('colonia_polanco_torre'), KP('polanco_torre_corporativa')]
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
  const g = toScreen(INSURGENTES + 0.5, REFORMA + 0.5)
  ctx.beginPath(); ctx.ellipse(g.x, g.y, TW * 0.42, TH * 0.42, 0, 0, 7); ctx.fillStyle = '#6FA04A'; ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 6; ctx.stroke()
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
