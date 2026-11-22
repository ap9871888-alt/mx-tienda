// Banco ficticio "Banca Mexicana del Comercio": oficinas corporativas y productos de crédito.
export interface OfficeDef { name: string; place: string; cost: number; monthly: number; desc: string }
export const OFFICES: OfficeDef[] = [
  { name: 'Escritorio en la trastienda', place: 'Tu primera tienda', cost: 0, monthly: 0, desc: 'Llevas las cuentas en una libreta junto a la caja.' },
  { name: 'Oficina regional', place: 'Col. Roma', cost: 400000, monthly: 30000, desc: 'Contador y gerente de zona. El banco te toma en serio.' },
  { name: 'Piso corporativo', place: 'Paseo de la Reforma', cost: 1500000, monthly: 90000, desc: 'Equipo de finanzas: mejor tasa y más crédito.' },
  { name: 'Torre corporativa', place: 'Santa Fe', cost: 5000000, monthly: 250000, desc: 'Sede de un grupo nacional. Lista para la Bolsa.' }
]
// por nivel de oficina: multiplicador de la línea y puntos menos de tasa
export const OFFICE_CREDIT = [1, 1.5, 2.2, 3.2]
export const OFFICE_RATE_CUT = [0, 0.015, 0.03, 0.05]
// crédito simple a plazo: monto fijo, pagos diarios, tasa menor que la línea revolvente
export const TERM_LOANS = [
  { id: 't12', label: 'Crédito simple 12 meses', amount: 500000, months: 12, rateCut: 0.03 },
  { id: 't36', label: 'Crédito de expansión 36 meses', amount: 2000000, months: 36, rateCut: 0.02, minStores: 6 }
]
