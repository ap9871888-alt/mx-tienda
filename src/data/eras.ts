// Épocas: el jugador elige el año de fundación y el juego ajusta precios, tecnología y sucesos.
// Los montos del motor están en "pesos de 2027"; la interfaz los muestra en pesos de la fecha del juego.

// Índice de precios aproximado (2027 = 1). Después de 2027 se infla 4 % al año.
export const PRICE_INDEX: [number, number][] = [
  [1995, 0.12], [1996, 0.16], [2000, 0.28], [2005, 0.36], [2010, 0.45], [2015, 0.54], [2020, 0.66], [2022, 0.75], [2024, 0.83], [2027, 1]
]
// tasa del crédito PyME por año (aprox.)
export const LOAN_RATE: [number, number][] = [
  [1995, 0.55], [1997, 0.3], [2000, 0.24], [2005, 0.16], [2010, 0.13], [2015, 0.12], [2020, 0.13], [2023, 0.2], [2027, 0.18]
]
// tecnología y formatos disponibles según el año
export const FEATURES = {
  hardDiscount: 2004, // llegan los hard discount mexicanos
  selfCheckout: 2012,
  recargas: 1999, // recargas de celular en el mostrador
  pinkTaxis: 2014, // taxis rosas de la CDMX; antes, vochos verdes
  metrobus: 2005,
  darkStore: 2021
}

export interface HistoricEvent { from: string; to: string; text: string; traffic: number; city?: string }
export const HISTORIC_EVENTS: HistoricEvent[] = [
  { from: '1995-01-01', to: '1995-12-31', text: 'Crisis del tequila: el consumo cae y el crédito se dispara', traffic: -0.2 },
  { from: '2008-10-01', to: '2009-09-30', text: 'Crisis financiera mundial: la gente cuida el gasto', traffic: -0.08 },
  { from: '2009-04-24', to: '2009-05-15', text: 'Influenza AH1N1: la ciudad se queda en casa', traffic: -0.35 },
  { from: '2017-09-19', to: '2017-10-05', text: 'Sismo del 19 de septiembre: la ciudad se recupera poco a poco', traffic: -0.3, city: 'cdmx' },
  { from: '2020-03-23', to: '2020-06-30', text: 'Pandemia: confinamiento, solo salen a lo esencial', traffic: -0.45 },
  { from: '2020-07-01', to: '2020-12-31', text: 'Nueva normalidad: aforos reducidos', traffic: -0.15 },
  { from: '2026-06-11', to: '2026-07-19', text: 'Mundial 2026 en México: calles llenas de aficionados', traffic: 0.15 }
]

export const START_YEARS: { year: number; title: string; desc: string }[] = [
  { year: 1995, title: '1995 · Crisis del tequila', desc: 'Sin celulares ni hard discount. Crédito carísimo, pero locales baratos.' },
  { year: 2000, title: '2000 · Cambio de siglo', desc: 'Llegan las recargas de celular. La competencia aún es pequeña.' },
  { year: 2008, title: '2008 · Crisis mundial', desc: 'Empiezas justo antes de la crisis y la influenza.' },
  { year: 2015, title: '2015 · Expansión', desc: 'Hard discount, autocobro y taxis rosas. Mercado competido.' },
  { year: 2019, title: '2019 · Antes de la pandemia', desc: 'Prepárate para 2020: ¿sobrevivirás al confinamiento?' },
  { year: 2027, title: '2027 · Hoy', desc: 'Mercado maduro, rivales fuertes y todas las tecnologías.' },
  { year: 2035, title: '2035 · Futuro', desc: 'Precios más altos y competencia madura. Autos eléctricos pronto.' }
]
