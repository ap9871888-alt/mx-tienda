// Datos de la IA de mercado y del fondo de inversión. Nombres ficticios.
export type RivalStyle = 'precio' | 'expansion' | 'premium' | 'barrio'
export const RIVAL_POOL: { name: string; color: string }[] = [
  { name: 'Super Esquina', color: '#E35D2F' },
  { name: 'Abarrotes La Lupita', color: '#7A5BA6' },
  { name: 'Express Norteño', color: '#2F7FB5' },
  { name: 'MiniMax 24', color: '#C2185B' },
  { name: 'Tiendas Ahorrín', color: '#5D8C2E' },
  { name: 'Don Chuy Market', color: '#B07D1A' },
  { name: 'Mercadito Azteca', color: '#00897B' },
  { name: 'La Bodeguita', color: '#6D4C41' },
  { name: 'SúperPrecio MX', color: '#F4511E' },
  { name: 'Tiendas Sol', color: '#FBC02D' },
  { name: 'Ultramarinos Del Valle', color: '#3949AB' },
  { name: 'Kiosko Rápido', color: '#8E24AA' }
]
export const RIVAL_STYLES: Record<RivalStyle, { label: string; desc: string }> = {
  precio: { label: 'Guerra de precios', desc: 'Baja precios donde te ve ganar' },
  expansion: { label: 'Expansión rápida', desc: 'Abre tiendas donde hay hueco' },
  premium: { label: 'Premium', desc: 'Busca colonias de alto poder adquisitivo' },
  barrio: { label: 'Changarros de barrio', desc: 'Llena las colonias populares de tienditas' }
}
export const MAX_RIVAL_STORES_PER_COLONY = 9

// eventos de mercado que la IA puede lanzar en una colonia
export const MARKET_EVENTS = [
  { text: 'Abre un nuevo corporativo en {c}: más oficinistas por la mañana', traffic: 0.1, days: 9999 },
  { text: 'Obra del Metro en {c}: banquetas cerradas', traffic: -0.18, days: 21 },
  { text: 'Festival cultural en {c} este mes', traffic: 0.2, days: 10 },
  { text: 'Ola de inseguridad en {c}: la gente sale menos de noche', traffic: -0.1, days: 30 },
  { text: 'Nueva plaza comercial cerca de {c}', traffic: -0.08, days: 9999 },
  { text: '{c} se pone de moda: llegan nuevos vecinos', traffic: 0.08, days: 9999, wealth: 0.05 }
]

export interface FundDef { id: string; name: string; annual: number; vol: number; desc: string; color: string }
export const FUNDS: FundDef[] = [
  { id: 'bonos', name: 'Bonos gubernamentales', annual: 0.095, vol: 0.0015, desc: 'Bajo riesgo: crece despacio y casi nunca baja.', color: '#2E7D5B' },
  { id: 'balanceado', name: 'Fondo balanceado', annual: 0.13, vol: 0.007, desc: 'Mitad bonos, mitad acciones: sube más, con bajadas moderadas.', color: '#1B4D8F' },
  { id: 'acciones', name: 'Acciones mexicanas', annual: 0.17, vol: 0.016, desc: 'Alto riesgo: puede ganar mucho y caer fuerte en una crisis.', color: '#D63B2F' }
]
export const FUND_FEE = 0.005 // comisión de entrada y salida
