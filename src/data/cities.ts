// Ciudades y colonias. Valores base: cada partida los varía con la IA de mercado (engine/market.ts).
// `traffic` = peatones por hora en promedio; `wealth` = tolerancia a precios; `competition` = presión rival base.
import mask from './cdmxMask.json'
import national from './statesMask.json'

export interface Colony {
  id: string
  name: string
  traffic: number
  rentMult: number
  wealth: number
  competition: number
  blurb: string
  x: number // centro de la colonia en el mapa de la ciudad (% del ancho); 0 si la ciudad no tiene mapa ilustrado
  y: number // (% del alto)
  slots: number // locales disponibles para tus tiendas
}
export interface City {
  id: string; name: string; state: string; colonies: Colony[]
  map?: { grid: string; n: number; ids: string[] } // mapa ilustrado por colonias (por ahora solo CDMX)
  unlock: number // permisos, estudio de mercado y bodega regional
  nx: number; ny: number // posición en el mapa nacional (%)
  cedisRadius?: boolean // el CEDIS del Valle de México la surte
}

const pos = (id: string) => (mask.info as Record<string, { x: number; y: number }>)[id]
const col = (c: Omit<Colony, 'x' | 'y' | 'slots'> & { slots?: number }): Colony => ({ slots: 8, ...c, ...(pos(c.id) ?? { x: 0, y: 0 }) })
const zone = (id: string, name: string, traffic: number, rentMult: number, wealth: number, competition: number, blurb: string): Colony =>
  ({ id, name, traffic, rentMult, wealth, competition, blurb, x: 0, y: 0, slots: 6 })
// posición de cada ciudad en el mapa por estados (%)
const CITY_POS: Record<string, { x: number; y: number }> = { cdmx: { x: 58.2, y: 73.6 }, pue: { x: 60.4, y: 75.2 }, gdl: { x: 42.6, y: 66.5 }, mty: { x: 53.6, y: 41.5 }, tij: { x: 6.2, y: 6.5 }, mer: { x: 87.2, y: 62.5 } }
const npos = (id: string) => CITY_POS[id]

export const CITIES: City[] = [
  {
    id: 'cdmx',
    name: 'CDMX',
    state: 'Ciudad de México',
    map: { grid: mask.grid, n: mask.n, ids: mask.ids },
    unlock: 0, nx: npos('cdmx').x, ny: npos('cdmx').y, cedisRadius: true,
    colonies: [
      col({ id: 'roma', name: 'Roma-Condesa', traffic: 470, rentMult: 1.45, wealth: 1.25, competition: 0.55, blurb: 'Cafés, oficinas creativas y vida nocturna. Mucho peatón y clientes que pagan más.' }),
      col({ id: 'polanco', name: 'Polanco', traffic: 400, rentMult: 1.95, wealth: 1.55, competition: 0.5, blurb: 'Corporativos y residencias de lujo. Renta alta y tickets altos.' }),
      col({ id: 'coyoacan', name: 'Coyoacán', traffic: 360, rentMult: 1.15, wealth: 1.12, competition: 0.35, blurb: 'Barrio tradicional, turismo de fin de semana y poca competencia.' }),
      col({ id: 'iztapalapa', name: 'Iztapalapa', traffic: 560, rentMult: 0.7, wealth: 0.82, competition: 0.6, blurb: 'Muchísima gente y renta barata, pero clientes sensibles al precio.' }),
      col({ id: 'centro', name: 'Centro Histórico', traffic: 640, rentMult: 0.95, wealth: 0.88, competition: 0.65, blurb: 'El corazón comercial: un río de gente, mucha competencia y ventas rápidas.' }),
      col({ id: 'santafe', name: 'Santa Fe', traffic: 380, rentMult: 1.75, wealth: 1.45, competition: 0.42, blurb: 'Torres de oficinas: picos fuertes en la mañana y la comida, poco de noche.' }),
      col({ id: 'narvarte', name: 'Narvarte', traffic: 420, rentMult: 1.1, wealth: 1.05, competition: 0.4, blurb: 'Clase media, familias y oficinas pequeñas. Renta razonable.' }),
      col({ id: 'delvalle', name: 'Del Valle', traffic: 410, rentMult: 1.3, wealth: 1.2, competition: 0.45, blurb: 'Residencial y ordenada, con buen poder adquisitivo y clientes fieles.' })
    ]
  },
  { id: 'pue', name: 'Puebla', state: 'Puebla', unlock: 1500000, nx: npos('pue').x, ny: npos('pue').y, cedisRadius: true,
    colonies: [
      zone('pue-centro', 'Centro Histórico', 480, 0.8, 0.9, 0.5, 'Turismo y comercio tradicional entre calles coloniales.'),
      zone('angelopolis', 'Angelópolis', 330, 1.3, 1.35, 0.45, 'Plazas comerciales y fraccionamientos nuevos.'),
      zone('pue-lapaz', 'La Paz', 360, 1.0, 1.1, 0.4, 'Residencial de clase media alta con vida de barrio.')
    ] },
  { id: 'gdl', name: 'Guadalajara', state: 'Jalisco', unlock: 3000000, nx: npos('gdl').x, ny: npos('gdl').y,
    colonies: [
      zone('gdl-centro', 'Centro', 560, 0.9, 0.9, 0.55, 'Mucho movimiento entre plazas, mercados y oficinas.'),
      zone('gdl-americana', 'Americana', 430, 1.25, 1.2, 0.5, 'Bares, cafés y oficinas creativas.'),
      zone('zapopan', 'Zapopan', 400, 1.4, 1.35, 0.45, 'Torres, plazas y fraccionamientos de alto ingreso.'),
      zone('tlaquepaque', 'Tlaquepaque', 420, 0.85, 0.9, 0.4, 'Artesanías, turismo de fin de semana y barrios populares.')
    ] },
  { id: 'mty', name: 'Monterrey', state: 'Nuevo León', unlock: 3500000, nx: npos('mty').x, ny: npos('mty').y,
    colonies: [
      zone('sanpedro', 'San Pedro Garza García', 360, 1.9, 1.6, 0.5, 'El municipio de mayor ingreso del país.'),
      zone('mty-centro', 'Centro y Barrio Antiguo', 520, 0.95, 0.95, 0.55, 'Oficinas de gobierno, comercio y vida nocturna.'),
      zone('cumbres', 'Cumbres', 390, 1.05, 1.1, 0.4, 'Fraccionamientos familiares en crecimiento.'),
      zone('apodaca', 'Apodaca', 440, 0.75, 0.85, 0.4, 'Zona industrial: turnos de fábrica las 24 horas.')
    ] },
  { id: 'tij', name: 'Tijuana', state: 'Baja California', unlock: 4000000, nx: npos('tij').x, ny: npos('tij').y,
    colonies: [
      zone('zonario', 'Zona Río', 440, 1.2, 1.15, 0.5, 'Centro financiero junto a la garita.'),
      zone('otay', 'Otay', 420, 0.85, 0.95, 0.4, 'Maquiladoras, universidades y mucho tráfico fronterizo.'),
      zone('playas', 'Playas de Tijuana', 330, 1.0, 1.05, 0.35, 'Residencial frente al mar, tranquila.')
    ] },
  { id: 'mer', name: 'Mérida', state: 'Yucatán', unlock: 3000000, nx: npos('mer').x, ny: npos('mer').y,
    colonies: [
      zone('montejo', 'Paseo de Montejo', 380, 1.1, 1.15, 0.4, 'Turismo, oficinas y casonas.'),
      zone('mer-centro', 'Centro', 450, 0.85, 0.9, 0.45, 'Mercados y comercio tradicional; calor todo el año.'),
      zone('altabrisa', 'Altabrisa', 330, 1.25, 1.25, 0.35, 'Plazas nuevas y fraccionamientos al norte.')
    ] }
]
export const STATES = national.states
export const NATIONAL_MAP = { n: national.n, ny: national.ny, grid: national.grid, aspect: national.aspect }
export const CITY_STATE: Record<string, string> = { cdmx: 'cdmx', pue: 'pue', gdl: 'jal', mty: 'nl', tij: 'bc', mer: 'yuc' }
// qué estado hay en un punto del mapa nacional (0–1)
export function stateAt (px: number, py: number) {
  const near = STATES.filter(s => ['cdmx', 'tlax', 'mor', 'ags', 'col'].includes(s.id)).find(s => Math.hypot((s.x / 100 - px) * national.aspect, s.y / 100 - py) < 0.018)
  if (near) return near
  const gx = Math.min(national.n - 1, Math.max(0, Math.floor(px * national.n))); const gy = Math.min(national.ny - 1, Math.max(0, Math.floor(py * national.ny)))
  const v = parseInt(national.grid[gy * national.n + gx], 36)
  return v ? STATES[v - 1] : null
}
export function colonyById (colonyId: string) {
  for (const c of CITIES) { const z = c.colonies.find(x => x.id === colonyId); if (z) return { city: c, colony: z } }
  throw new Error(`Colonia desconocida: ${colonyId}`)
}
export const cityOf = (id: string) => CITIES.find(c => c.id === id)!
export const colonyOf = (cityId: string, colonyId: string) => cityOf(cityId).colonies.find(c => c.id === colonyId)!

// Multiplicador de tráfico por hora del día (0–23).
export const HOUR_PROFILE = [0.12, 0.08, 0.06, 0.06, 0.08, 0.2, 0.55, 1.35, 1.45, 1.3, 1.0, 0.85, 0.95, 1.3, 1.35, 1.25, 1.05, 1.0, 1.15, 1.5, 1.55, 1.4, 1.0, 0.45]
