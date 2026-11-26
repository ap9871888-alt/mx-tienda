// Mapa modular: el piso (calles, banquetas, parques) se genera con código sobre una cuadrícula isométrica 2:1
// y encima van sprites individuales. Los coches siguen los nodos exactos de la cuadrícula.
import type { Colony } from '../data/cities'

export const TW = 96; export const TH = 48 // tamaño de un mosaico
export const P = 4 // cada cuadra son 3×3 mosaicos + 1 de calle
export const NBX = 11; export const NBY = 15 // cuadras en cada eje (ciudad amplia, con aire entre lugares)
export const NX = NBX * P + 1; export const NY = NBY * P + 1
export const TOP = 380 // margen para lo alto de los edificios de arriba
export const M = 220 // margen alrededor: ahí sigue la ciudad lejana
export const OX = NY * TW / 2 + M // origen x para que todo quede en positivo
export const W = (NX + NY) * TW / 2 + 2 * M; export const H = (NX + NY) * TH / 2 + TOP + M
// los teléfonos limitan el tamaño de un lienzo (~16 M de píxeles): el piso y el tráfico se pintan a esta resolución
export const RES = Math.min(1, Math.sqrt(10e6 / (((NX + NY) * TW / 2 + 2 * M) * ((NX + NY) * TH / 2 + TOP + M))))
export const toScreen = (tx: number, ty: number) => ({ x: OX + (tx - ty) * TW / 2, y: TOP + (tx + ty) * TH / 2 })

// calles: cada 4 mosaicos. En pantalla el norte queda arriba y el oriente a la derecha.
// Paseo de la Reforma corre en diagonal del Centro (arriba a la derecha) a Chapultepec (abajo a la izquierda),
// sobre tx=12; Insurgentes la cruza sobre ty=16 en la glorieta del Ángel.
export const REFORMA_TX = 20; export const INSURGENTES_TY = 24
export const REFORMA = INSURGENTES_TY; export const INSURGENTES = REFORMA_TX // nombres viejos usados en el dibujo
export const isRoad = (tx: number, ty: number) => tx % P === 0 || ty % P === 0
export const isAvenue = (tx: number, ty: number) => tx === REFORMA_TX || ty === INSURGENTES_TY

export type BlockUse = { kind: 'mon'; sprite: string } | { kind: 'civic'; id: string } | { kind: 'park' } | { kind: 'lot'; colony: string }
export interface CityKit {
  id: string
  blocks: (bx: number, by: number) => BlockUse
  decor: Record<string, string[]> // sprites de relleno por colonia
}

const X = (s: string) => `kit/px/${s}.webp`; const K = (s: string) => `kit/cdmx/${s}.webp`; const K2 = (s: string) => `kit/cdmx2/${s}.webp`; const KP = (s: string) => `kit/polanco/${s}.webp`
// manzanas: (bx, by). Arriba = norte (Gustavo A. Madero), derecha = oriente (Iztapalapa, aeropuerto),
// izquierda = poniente (Polanco, Santa Fe), abajo = sur (Coyoacán)
const MON0: Record<string, string> = {
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
  '0,3': KP('polanco_estanque_lincoln'), // parque Lincoln
  '0,0': X('10_monumento_raza'), // al norte
  '0,2': X('01_museo_soumaya'), // Nuevo Polanco
  '1,4': KP('polanco_museo_moderno'),
  '1,5': X('02_museo_antropologia'), // en el bosque, junto a Reforma
  '2,5': X('17_auditorio_nacional'),
  '2,4': X('11_torre_mayor'), // rascacielos de Reforma
  '3,4': X('19_torre_reforma'),
  '2,2': X('12_senado_moderno'),
  '3,1': X('13_hemiciclo_juarez'), // Alameda
  '4,2': X('15_mercado_artesanias'),
  '5,1': X('14_arco_garibaldi'),
  '5,2': X('20_arena_lucha_libre'),
  '4,4': X('18_hospital_grande'),
  '5,6': X('16_plaza_toros'), // Nápoles
  '4,7': X('03_casa_azul_frida'), // Coyoacán
  '2,8': X('05_biblioteca_central_cu'), // Ciudad Universitaria
  '3,8': X('04_rectoria_cu'),
  '4,9': X('06_estadio_azteca'),
  '6,8': X('09_chinampa_cultivos'), // Xochimilco
  '6,9': X('07_embarcadero_xochimilco'),
  '5,9': X('09_chinampa_cultivos')
}
const CIVIC0: Record<string, string> = {
  '4,1': 'banco', '3,2': 'bolsa', '2,3': 'inversion', '1,3': 'estilo', '6,3': 'logistica', '0,6': 'corporativo', '6,2': 'aeropuerto', '2,0': 'central'
}
const PARKS0 = new Set(['1,6', '1,7', '2,7', '2,9']) // bosque de Chapultepec
// colonias por manzana (filas = by, columnas = bx)
const GRID = [
  'CCCCCCC',
  'PCCCCCC',
  'PPCCNII',
  'PPCCNII',
  'PPRRNDI',
  'SPRRDDI',
  'SSRRDYY',
  'SSRRDYY',
  'SSYYYYY',
  'SSYYYYY'
]
const CODE: Record<string, string> = { C: 'centro', P: 'polanco', S: 'santafe', I: 'iztapalapa', R: 'roma', N: 'narvarte', D: 'delvalle', Y: 'coyoacan' }
// el plano de arriba es el boceto compacto; aquí se extiende a una ciudad más grande:
// cada lugar conserva su posición relativa y entre ellos quedan manzanas de colonia
const FX = [1, 2, 4, 5, 7, 8, 9]; const FY = [1, 2, 3, 5, 6, 7, 9, 10, 12, 13]
const spread = <T, >(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([k, v]) => { const [x, y] = k.split(',').map(Number); return [`${FX[x]},${FY[y]}`, v] })) as Record<string, T>
const MON = spread(MON0); const CIVIC = spread(CIVIC0)
const nearest = (bx: number, by: number) => {
  let best = [0, 0]; let bd = Infinity
  FX.forEach((x, i) => FY.forEach((y, j) => { const d = (x - bx) ** 2 + (y - by) ** 2; if (d < bd) { bd = d; best = [i, j] } }))
  return best
}
const PARKS = new Set<string>()
for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) {
  const k = `${bx},${by}`; if (MON[k] || CIVIC[k]) continue
  const [i, j] = nearest(bx, by); const old = `${i},${j}`
  // el bosque de Chapultepec y Xochimilco crecen hacia las manzanas vecinas
  if (PARKS0.has(old) || /chapultepec|antropologia|chinampa|embarcadero/.test(MON0[old] ?? '')) PARKS.add(k)
}
const colonyOf = (bx: number, by: number) => { const [i, j] = nearest(bx, by); return CODE[GRID[j]?.[i] ?? 'C'] }
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
  // glorietas en fila sobre Reforma, como en la foto satelital
  for (let j = 0; j < NY; j += P) {
    const g = toScreen(REFORMA_TX + 0.5, j + 0.5); const big = j === INSURGENTES_TY
    ctx.beginPath(); ctx.ellipse(g.x, g.y, TW * (big ? 0.46 : 0.34), TH * (big ? 0.46 : 0.34), 0, 0, 7); ctx.fillStyle = '#6FA04A'; ctx.fill(); ctx.strokeStyle = '#E9E2D2'; ctx.lineWidth = 6; ctx.stroke()
  }
  // cuadras: banqueta, guarnición y el interior (plaza, pasto o patio)
  for (let bx = 0; bx < NBX; bx++) for (let by = 0; by < NBY; by++) {
    const x0 = bx * P + 1; const y0 = by * P + 1
    const u = kit.blocks(bx, by)
    const park = u.kind === 'park' || (u.kind === 'mon' && /chapultepec|estanque|zocalo|chinampa|embarcadero|antropologia/.test(u.sprite))
    rect(x0 - 0.02, y0 - 0.02, x0 + 3.02, y0 + 3.02, '#B9B2A4') // guarnición
    rect(x0, y0, x0 + 3, y0 + 3, '#DCD5C6') // banqueta
    rect(x0 + 0.28, y0 + 0.28, x0 + 2.72, y0 + 2.72, park ? '#7DB35A' : u.kind === 'mon' ? '#E6DCC6' : '#C9C2B2', park ? '#5E9440' : '#B3AB9A')
    if (!park) for (const [a, b] of [[0.14, 0.14], [2.86, 0.14], [0.14, 2.86], [2.86, 2.86], [1.5, 0.14], [0.14, 1.5]]) {
      const p = toScreen(x0 + a, y0 + b); ctx.beginPath(); ctx.ellipse(p.x, p.y - 10, 11, 9, 0, 0, 7); ctx.fillStyle = '#5C8F3C'; ctx.fill()
    }
  }
  if (night) { ctx.fillStyle = 'rgba(14,20,48,.45)'; ctx.fillRect(0, 0, W, H) }
}
