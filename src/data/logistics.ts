// Logística (Hito 2): descuento por volumen, CEDIS propio, flotilla y líneas de Marca Propia.
import type { CategoryId } from './categories'

export const VOLUME_DISCOUNT = { minStores: 4, factor: 0.92 } // Fase 2: −8 % al comprar para 4+ tiendas

export const CEDIS = {
  name: 'CEDIS Valle de México (Cuautitlán)',
  cost: 6000000,
  requiredStores: 10,
  requiredNetWorth: 12000000,
  savings: [0.22, 0.26, 0.3], // por nivel
  upgradeCost: [0, 2500000, 4000000],
  monthly: 120000, // personal, renta y servicios del CEDIS
  leadMinutes: 180, // del CEDIS a la tienda en 3 h
  truckCost: 650000,
  truckMonthly: 22000, // chofer, seguro y mantenimiento
  tripsPerTruck: 5, // viajes por camión al día
  fuelPerTrip: 280,
  startingTrucks: 2
}

export type LabelId = 'agua' | 'botanas' | 'lacteos' | 'pan' | 'limpieza'
export interface PrivateLabel { id: LabelId; name: string; cat: CategoryId; cost: number; desc: string }
export const PRIVATE_LABELS: PrivateLabel[] = [
  { id: 'agua', name: 'Agua purificada TMX', cat: 'bebidas', cost: 900000, desc: 'Garrafón y botella con tu marca.' },
  { id: 'botanas', name: 'Botanas TMX', cat: 'botanas', cost: 900000, desc: 'Papas, cacahuates y dulces a granel.' },
  { id: 'lacteos', name: 'Lácteos TMX', cat: 'panLacteos', cost: 1100000, desc: 'Leche, yogurt y queso de maquila.' },
  { id: 'pan', name: 'Pan TMX', cat: 'panLacteos', cost: 800000, desc: 'Pan de caja y bollería de panadería regional.' },
  { id: 'limpieza', name: 'Limpieza TMX', cat: 'abarrotes', cost: 1200000, desc: 'Detergente, cloro y papel.' }
]
export const LABEL_COST_FACTOR = 0.85 // cada línea abarata 15 % su categoría
export const LABEL_LOYALTY = { hardDiscount: 0.03, other: 0.008 } // +clientes por línea lanzada
