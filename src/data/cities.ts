// Ciudades y colonias. `traffic` = peatones por hora en promedio; `wealth` = tolerancia a precios.
export interface Colony {
  id: string
  name: string
  traffic: number
  rentMult: number
  wealth: number
  competition: number // 0–1: presión de tiendas rivales cercanas
  rivals: number // tiendas rivales visibles en el mapa
  // posición del polígono en el mapa de la ciudad (viewBox 0–100)
  shape: string
  label: [number, number]
  blurb: string
}
export interface City { id: string; name: string; colonies: Colony[] }

export const CITIES: City[] = [
  {
    id: 'cdmx',
    name: 'CDMX',
    colonies: [
      { id: 'roma', name: 'Roma-Condesa', traffic: 470, rentMult: 1.45, wealth: 1.25, competition: 0.55, rivals: 4,
        shape: '8,10 48,6 52,44 12,50', label: [30, 28], blurb: 'Cafés, oficinas creativas y vida nocturna. Mucho peatón y clientes que pagan más.' },
      { id: 'polanco', name: 'Polanco', traffic: 400, rentMult: 1.95, wealth: 1.55, competition: 0.5, rivals: 3,
        shape: '52,4 94,8 90,42 56,44', label: [73, 24], blurb: 'Corporativos y residencias de lujo. Renta alta y tickets altos.' },
      { id: 'coyoacan', name: 'Coyoacán', traffic: 360, rentMult: 1.15, wealth: 1.12, competition: 0.35, rivals: 2,
        shape: '12,54 50,48 54,92 10,94', label: [31, 72], blurb: 'Barrio tradicional, turismo de fin de semana y poca competencia.' },
      { id: 'iztapalapa', name: 'Iztapalapa', traffic: 560, rentMult: 0.7, wealth: 0.82, competition: 0.6, rivals: 5,
        shape: '56,48 92,46 94,90 58,94', label: [75, 70], blurb: 'Muchísima gente y renta barata, pero clientes sensibles al precio.' }
    ]
  }
]
export const cityOf = (id: string) => CITIES.find(c => c.id === id)!
export const colonyOf = (cityId: string, colonyId: string) => cityOf(cityId).colonies.find(c => c.id === colonyId)!

// Multiplicador de tráfico por hora del día (0–23).
export const HOUR_PROFILE = [0.12, 0.08, 0.06, 0.06, 0.08, 0.2, 0.55, 1.35, 1.45, 1.3, 1.0, 0.85, 0.95, 1.3, 1.35, 1.25, 1.05, 1.0, 1.15, 1.5, 1.55, 1.4, 1.0, 0.45]
