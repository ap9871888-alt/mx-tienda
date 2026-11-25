// Formatos de tienda. Desde el Hito 2 se abren Tiendita, 24/7, Hard Discount y Bodega; la Dark Store llega en el Hito 4.
import type { CategoryId } from './categories'
export type FormatId = 'ambulante' | 'tiendita' | 'conveniencia' | 'hardDiscount' | 'bodega' | 'darkStore' | 'taqueria' | 'paleteria'

export interface StoreFormat {
  id: FormatId
  name: string
  capex: number
  rent: number // renta mensual base, se multiplica por la colonia
  grossMargin: number // margen bruto típico del formato
  capture: number // fracción de peatones que entran
  hours: [number, number] // hora de apertura y cierre (24 = cierra a medianoche)
  allDay?: boolean
  maxCashiers: number
  selfCheckoutSlots: number
  shelfUnits: number // piezas por categoría en anaquel
  kwhDay: number // consumo eléctrico diario
  overhead: number // agua, internet, licencias y contador al mes
  basketMult: number // tamaño relativo del ticket
  marginMult: number // margen de referencia relativo a la categoría
  priceSensitivity: number // qué tanto pesa el precio a sus clientes
  available: boolean // disponible en esta versión
  unlockNote?: string
  advantage: string
  catNames?: Partial<Record<CategoryId, string>> // negocios de comida: las 4 líneas cambian de nombre
  noServices?: boolean // no cobra recargas ni servicios
  food?: boolean
  ownerSells?: boolean // lo atiendes tú: cobra sin cajeros
}

export const FORMATS: StoreFormat[] = [
  { id: 'ambulante', name: 'Puesto ambulante', capex: 1500, rent: 300, grossMargin: 0.35, capture: 0.024, hours: [9, 19], maxCashiers: 1, selfCheckoutSlots: 0, shelfUnits: 40, kwhDay: 0, overhead: 150, basketMult: 0.6, marginMult: 1.6, priceSensitivity: 1.2, available: true, food: true, noServices: true, ownerSells: true,
    advantage: 'Etapa 1: tú mismo vendes en la calle. Junta tus primeros ahorros',
    catNames: { abarrotes: 'Chocolates', bebidas: 'Aguas frescas', botanas: 'Dulces', panLacteos: 'Paletas' } },
  { id: 'tiendita', name: 'Tiendita de Esquina', capex: 250000, rent: 12000, grossMargin: 0.22, capture: 0.028, hours: [7, 22], maxCashiers: 3, selfCheckoutSlots: 1, shelfUnits: 420, kwhDay: 38, overhead: 9000, basketMult: 1, marginMult: 1, priceSensitivity: 1, available: true, advantage: 'Arranque rápido, bajo riesgo y flujo diario inmediato' },
  { id: 'conveniencia', name: 'Conveniencia 24/7', capex: 1200000, rent: 38000, grossMargin: 0.32, capture: 0.05, hours: [0, 24], allDay: true, maxCashiers: 6, selfCheckoutSlots: 2, shelfUnits: 820, kwhDay: 160, overhead: 22000, basketMult: 1.15, marginMult: 1.45, priceSensitivity: 0.6, available: true, advantage: 'Bebidas frías, café y comida rápida, pago de servicios 24 h' },
  { id: 'hardDiscount', name: 'Hard Discount', capex: 1800000, rent: 32000, grossMargin: 0.18, capture: 0.06, hours: [8, 21], maxCashiers: 6, selfCheckoutSlots: 2, shelfUnits: 1700, kwhDay: 90, overhead: 26000, basketMult: 2.4, marginMult: 0.75, priceSensitivity: 1.3, available: true, advantage: 'Volumen en tarimas y dominio de Marca Propia' },
  { id: 'bodega', name: 'Bodega Express y Farmacia', capex: 3500000, rent: 55000, grossMargin: 0.28, capture: 0.05, hours: [7, 23], maxCashiers: 8, selfCheckoutSlots: 3, shelfUnits: 1600, kwhDay: 210, overhead: 38000, basketMult: 2.8, marginMult: 1.2, priceSensitivity: 0.85, available: true, advantage: 'Ticket alto, perecederos, farmacia y lockers' },
  { id: 'taqueria', name: 'Taquería', capex: 180000, rent: 9000, grossMargin: 0.45, capture: 0.035, hours: [13, 24], maxCashiers: 3, selfCheckoutSlots: 0, shelfUnits: 300, kwhDay: 45, overhead: 7000, basketMult: 1.6, marginMult: 1.9, priceSensitivity: 0.9, available: true, food: true, noServices: true, advantage: 'Margen alto y clientela de noche; vive del tráfico peatonal',
    catNames: { abarrotes: 'Tacos', bebidas: 'Aguas y refrescos', botanas: 'Postres', panLacteos: 'Quesadillas' } },
  { id: 'paleteria', name: 'Paletería y Helados', capex: 45000, rent: 3500, grossMargin: 0.5, capture: 0.03, hours: [11, 21], maxCashiers: 1, selfCheckoutSlots: 0, shelfUnits: 200, kwhDay: 25, overhead: 2500, basketMult: 0.8, marginMult: 2, priceSensitivity: 1.1, available: true, food: true, noServices: true, advantage: 'El más barato de abrir; ideal junto a parques y en temporada de calor',
    catNames: { abarrotes: 'Paletas', bebidas: 'Aguas frescas', botanas: 'Helados', panLacteos: 'Raspados' } },
  { id: 'darkStore', name: 'Dark Store 15 min', capex: 2800000, rent: 26000, grossMargin: 0.26, capture: 0, hours: [7, 24], maxCashiers: 4, selfCheckoutSlots: 0, shelfUnits: 800, kwhDay: 120, overhead: 20000, basketMult: 2, marginMult: 1.15, priceSensitivity: 0.8, available: false, unlockNote: 'Hito 4', advantage: 'Sin frente comercial caro; reparto ultrarrápido en moto y EV' }
]
export const formatOf = (id: FormatId) => FORMATS.find(f => f.id === id)!

// nombre de la línea de producto según el formato (una taquería vende tacos, no abarrotes)
export const catLabel = (formatId: FormatId, cat: CategoryId, fallback: string) => formatOf(formatId).catNames?.[cat] ?? fallback
export const REMODEL = [
  { name: 'Original', desc: 'Como la rentaste.' },
  { name: 'Remozada', desc: 'Pintura, iluminación LED y letrero nuevo.' },
  { name: 'Renovada', desc: 'Anaqueles nuevos, piso y refrigeradores de puerta.' },
  { name: 'Insignia', desc: 'Diseño de autor: la tienda que todos fotografían.' }
]
