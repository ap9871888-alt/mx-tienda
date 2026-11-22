// Ciudades y colonias. Valores base: cada partida los varía con la IA de mercado (engine/market.ts).
// `traffic` = peatones por hora en promedio; `wealth` = tolerancia a precios; `competition` = presión rival base.
import mask from './cdmxMask.json'

export interface Colony {
  id: string
  name: string
  traffic: number
  rentMult: number
  wealth: number
  competition: number
  blurb: string
  x: number // centro de la colonia en el mapa (% del ancho)
  y: number // (% del alto)
}
export interface City { id: string; name: string; colonies: Colony[]; map: { grid: string; n: number; ids: string[] } }

const pos = (id: string) => (mask.info as Record<string, { x: number; y: number }>)[id]
const col = (c: Omit<Colony, 'x' | 'y'>): Colony => ({ ...c, ...pos(c.id) })

export const CITIES: City[] = [
  {
    id: 'cdmx',
    name: 'CDMX',
    map: { grid: mask.grid, n: mask.n, ids: mask.ids },
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
  }
]
export const cityOf = (id: string) => CITIES.find(c => c.id === id)!
export const colonyOf = (cityId: string, colonyId: string) => cityOf(cityId).colonies.find(c => c.id === colonyId)!

// Multiplicador de tráfico por hora del día (0–23).
export const HOUR_PROFILE = [0.12, 0.08, 0.06, 0.06, 0.08, 0.2, 0.55, 1.35, 1.45, 1.3, 1.0, 0.85, 0.95, 1.3, 1.35, 1.25, 1.05, 1.0, 1.15, 1.5, 1.55, 1.4, 1.0, 0.45]
