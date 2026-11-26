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
export function drawGround (ctx: CanvasRenderingContext2D, kit: CityKit, img: (p: string) => HTMLImageElement | null, night: boolean) {
  ctx.fillStyle = '#7FA35B'; ctx.fillRect(0, 0, W, H)
  const recta = img('kit/polanco/tile_calle_recta.webp'); const cruce = img('kit/polanco/tile_cruce_cebra.webp')
  const avenida = img('kit/polanco/tile_avenida_masaryk.webp'); const glorieta = img('kit/polanco/tile_glorieta_lujo.webp')
  const banqueta = img('sprites/piso-banqueta.webp'); const pasto = img('sprites/piso-pasto.webp')
  const diamond = (tx: number, ty: number, fill: string) => {
    const a = toScreen(tx, ty); const b = toScreen(tx + 1, ty); const c = toScreen(tx + 1, ty + 1); const d = toScreen(tx, ty + 1)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
  }
  const tile = (im: HTMLImageElement | null, tx: number, ty: number, flip = false) => {
    const c = toScreen(tx + 0.5, ty + 0.5)
    if (!im) return false
    const w = TW * 1.02; const h = w * im.height / im.width
    ctx.save(); ctx.translate(c.x, c.y); if (flip) ctx.scale(-1, 1)
    ctx.drawImage(im, -w / 2, -h * 0.46, w, h); ctx.restore(); return true
  }
  for (let s = 0; s < NX + NY; s++) {
    for (let tx = 0; tx < NX; tx++) {
      const ty = s - tx; if (ty < 0 || ty >= NY) continue
      const bx = Math.floor(tx / P); const by = Math.floor(ty / P)
      if (isRoad(tx, ty)) {
        const cross = tx % P === 0 && ty % P === 0
        if (cross && tx === INSURGENTES && ty === REFORMA) { if (!tile(glorieta, tx, ty)) diamond(tx, ty, '#3A3D44') } else if (cross) { if (!tile(cruce, tx, ty)) diamond(tx, ty, '#3A3D44') } else {
          // calle a lo largo de x (ty fijo) o de y (tx fijo)
          const alongX = ty % P === 0
          const im = isAvenue(tx, ty) ? avenida : recta
          if (!tile(im, tx, ty, !alongX)) diamond(tx, ty, '#40434B')
        }
      } else {
        const u = kit.blocks(Math.min(bx, NBX - 1), Math.min(by, NBY - 1))
        const park = u.kind === 'park' || (u.kind === 'mon' && /chapultepec|estanque|zocalo/.test(u.sprite))
        if (!tile(park ? pasto : banqueta, tx, ty)) diamond(tx, ty, park ? '#8CBF6E' : '#D9D2C4')
      }
    }
  }
  if (night) { ctx.fillStyle = 'rgba(14,20,48,.45)'; ctx.fillRect(0, 0, W, H) }
}
