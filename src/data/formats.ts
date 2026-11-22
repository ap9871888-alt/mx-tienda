// Formatos de tienda. Desde el Hito 2 se abren Tiendita, 24/7, Hard Discount y Bodega; la Dark Store llega en el Hito 4.
export type FormatId = 'tiendita' | 'conveniencia' | 'hardDiscount' | 'bodega' | 'darkStore'

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
}

export const FORMATS: StoreFormat[] = [
  { id: 'tiendita', name: 'Tiendita de Esquina', capex: 250000, rent: 12000, grossMargin: 0.22, capture: 0.028, hours: [7, 22], maxCashiers: 3, selfCheckoutSlots: 1, shelfUnits: 420, kwhDay: 38, overhead: 9000, basketMult: 1, marginMult: 1, priceSensitivity: 1, available: true, advantage: 'Arranque rápido, bajo riesgo y flujo diario inmediato' },
  { id: 'conveniencia', name: 'Conveniencia 24/7', capex: 1200000, rent: 38000, grossMargin: 0.32, capture: 0.05, hours: [0, 24], allDay: true, maxCashiers: 6, selfCheckoutSlots: 2, shelfUnits: 820, kwhDay: 160, overhead: 22000, basketMult: 1.15, marginMult: 1.45, priceSensitivity: 0.6, available: true, advantage: 'Bebidas frías, café y comida rápida, pago de servicios 24 h' },
  { id: 'hardDiscount', name: 'Hard Discount', capex: 1800000, rent: 32000, grossMargin: 0.18, capture: 0.06, hours: [8, 21], maxCashiers: 6, selfCheckoutSlots: 2, shelfUnits: 1700, kwhDay: 90, overhead: 26000, basketMult: 2.4, marginMult: 0.75, priceSensitivity: 1.3, available: true, advantage: 'Volumen en tarimas y dominio de Marca Propia' },
  { id: 'bodega', name: 'Bodega Express y Farmacia', capex: 3500000, rent: 55000, grossMargin: 0.28, capture: 0.05, hours: [7, 23], maxCashiers: 8, selfCheckoutSlots: 3, shelfUnits: 1600, kwhDay: 210, overhead: 38000, basketMult: 2.8, marginMult: 1.2, priceSensitivity: 0.85, available: true, advantage: 'Ticket alto, perecederos, farmacia y lockers' },
  { id: 'darkStore', name: 'Dark Store 15 min', capex: 2800000, rent: 26000, grossMargin: 0.26, capture: 0, hours: [7, 24], maxCashiers: 4, selfCheckoutSlots: 0, shelfUnits: 800, kwhDay: 120, overhead: 20000, basketMult: 2, marginMult: 1.15, priceSensitivity: 0.8, available: false, unlockNote: 'Hito 4', advantage: 'Sin frente comercial caro; reparto ultrarrápido en moto y EV' }
]
export const formatOf = (id: FormatId) => FORMATS.find(f => f.id === id)!
