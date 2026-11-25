// Categorías de venta. `price` es el precio de mercado por pieza y `margin` el margen bruto de referencia.
export type CategoryId = 'abarrotes' | 'bebidas' | 'botanas' | 'panLacteos' | 'servicios'

export interface Category {
  id: CategoryId
  name: string
  price: number // precio de mercado por pieza (MXN)
  margin: number // margen bruto de referencia sobre precio
  basketProb: number // probabilidad de que un cliente lleve algo de esta categoría
  qty: [number, number] // piezas mínimas y máximas por ticket
  elasticity: number // qué tanto castiga el cliente un precio arriba del mercado
  service?: boolean // no ocupa anaquel: cobra comisión
  color: string
}

export const CATEGORIES: Category[] = [
  { id: 'abarrotes', name: 'Abarrotes', price: 28, margin: 0.18, basketProb: 0.55, qty: [1, 3], elasticity: 3.2, color: '#D63B2F' },
  { id: 'bebidas', name: 'Bebidas Frías', price: 22, margin: 0.28, basketProb: 0.6, qty: [1, 2], elasticity: 2.4, color: '#1B4D8F' },
  { id: 'botanas', name: 'Botanas y Dulces', price: 18, margin: 0.3, basketProb: 0.4, qty: [1, 2], elasticity: 2.2, color: '#F2B705' },
  { id: 'panLacteos', name: 'Pan y Lácteos', price: 30, margin: 0.2, basketProb: 0.35, qty: [1, 2], elasticity: 2.8, color: '#C97B2E' },
  { id: 'servicios', name: 'Servicios y Recargas', price: 8, margin: 1, basketProb: 0.12, qty: [1, 1], elasticity: 1.2, service: true, color: '#2E7D5B' }
]
export const PRODUCT_CATEGORIES = CATEGORIES.filter(c => !c.service)
export const categoryOf = (id: CategoryId) => CATEGORIES.find(c => c.id === id)!
