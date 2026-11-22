// Café MX Inc. — datos del juego (contenido de diseño, sin lógica)

export const START = { year: 2027, month: 0, day: 1, cash: 300000 }

export const TIERS = [
  { id: 1, name: 'Kiosco de Barrio', cost: 60000, maxStaff: 2, ambience: 0.85, upkeep: 150, img: 'assets/tienda-1.jpg',
    desc: 'Ventanita de barrio con tejas de barro. Barato y ágil.' },
  { id: 2, name: 'Café Artesanal Oaxaca', cost: 260000, maxStaff: 4, ambience: 1.0, upkeep: 400, img: 'assets/tienda-2.jpg',
    desc: 'Barro negro, vigas de madera y mesas para quedarse.' },
  { id: 3, name: 'Barra Moderna Polanco', cost: 750000, maxStaff: 6, ambience: 1.18, upkeep: 900, img: 'assets/tienda-3.jpg',
    desc: 'Cristal, mármol y métodos de especialidad.' },
  { id: 4, name: 'Hacienda Flagship y Tostador', cost: 2200000, maxStaff: 10, ambience: 1.35, upkeep: 2200, img: 'assets/tienda-4.jpg',
    desc: 'Patio colonial con tostador propio: grano 25% más barato y mejor.' }
]

// cost = insumos por taza (sin grano), ref = precio de referencia, g = gramos de grano
export const PRODUCTS = [
  { id: 'olla', name: 'Café de Olla', cost: 7, ref: 40, g: 15, tier: 1, appeal: 1.1 },
  { id: 'americano', name: 'Americano', cost: 4, ref: 38, g: 18, tier: 1, appeal: 1.0 },
  { id: 'espresso', name: 'Espresso', cost: 3, ref: 35, g: 18, tier: 1, appeal: 0.7 },
  { id: 'concha', name: 'Concha', cost: 7, ref: 25, g: 0, tier: 1, appeal: 0.8 },
  { id: 'capuchino', name: 'Capuchino', cost: 11, ref: 55, g: 18, tier: 2, appeal: 1.1 },
  { id: 'flatwhite', name: 'Flat White', cost: 12, ref: 60, g: 18, tier: 2, appeal: 0.9 },
  { id: 'horchata', name: 'Latte de Horchata', cost: 15, ref: 65, g: 18, tier: 2, appeal: 1.0 },
  { id: 'coldbrew', name: 'Cold Brew', cost: 8, ref: 65, g: 25, tier: 3, appeal: 0.9, heat: true },
  { id: 'mocha', name: 'Mocha Mexicano', cost: 16, ref: 70, g: 18, tier: 3, appeal: 1.0 },
  { id: 'especial', name: 'Pour-over de Especialidad', cost: 6, ref: 95, g: 22, tier: 4, appeal: 0.7 },
  { id: 'panmuerto', name: 'Pan de Muerto', cost: 12, ref: 45, g: 0, tier: 1, appeal: 1.6, season: 'muertos' }
]

export const CITIES = [
  { id: 'cdmx', name: 'CDMX', tag: 'Capital', unlock: 0, pop: 1.25, x: 54.3, y: 67.5, side: 't',
    locs: [
      { id: 'centro', name: 'Centro Histórico', rent: 28000, traffic: 1.1, wealth: 0.9 },
      { id: 'coyoacan', name: 'Coyoacán', rent: 32000, traffic: 0.95, wealth: 1.0 },
      { id: 'roma', name: 'Roma-Condesa', rent: 48000, traffic: 1.3, wealth: 1.15 },
      { id: 'santafe', name: 'Santa Fe', rent: 55000, traffic: 1.05, wealth: 1.25 },
      { id: 'polanco', name: 'Polanco', rent: 65000, traffic: 1.25, wealth: 1.4 }
    ] },
  { id: 'oax', name: 'Oaxaca', tag: 'Origen y cultura', unlock: 250000, pop: 0.8, x: 61.5, y: 81, side: 'l', festival: 'guelaguetza',
    locs: [
      { id: 'andador', name: 'Andador Turístico', rent: 24000, traffic: 1.1, wealth: 0.95 },
      { id: 'jalatlaco', name: 'Jalatlaco', rent: 19000, traffic: 0.85, wealth: 0.9 }
    ] },
  { id: 'mer', name: 'Mérida', tag: 'Histórico', unlock: 350000, pop: 0.85, x: 82.6, y: 56.6, side: 't', hot: true,
    locs: [
      { id: 'montejo', name: 'Paseo de Montejo', rent: 30000, traffic: 1.05, wealth: 1.05 },
      { id: 'centromer', name: 'Centro', rent: 22000, traffic: 0.95, wealth: 0.9 }
    ] },
  { id: 'gdl', name: 'Guadalajara', tag: 'Tech Hub', unlock: 450000, pop: 1.05, x: 42, y: 59.8, side: 'l',
    locs: [
      { id: 'chapu', name: 'Av. Chapultepec', rent: 38000, traffic: 1.15, wealth: 1.05 },
      { id: 'provi', name: 'Providencia', rent: 42000, traffic: 1.0, wealth: 1.15 },
      { id: 'andares', name: 'Zapopan Andares', rent: 52000, traffic: 1.1, wealth: 1.3 }
    ] },
  { id: 'mty', name: 'Monterrey', tag: 'Corporativos', unlock: 650000, pop: 1.05, x: 50.6, y: 34.7, side: 'r', hot: true,
    locs: [
      { id: 'antiguo', name: 'Barrio Antiguo', rent: 30000, traffic: 1.0, wealth: 1.0 },
      { id: 'valle', name: 'Valle Oriente', rent: 50000, traffic: 1.05, wealth: 1.3 },
      { id: 'sanpedro', name: 'San Pedro Garza García', rent: 62000, traffic: 1.15, wealth: 1.5 }
    ] },
  { id: 'cun', name: 'Cancún / Tulum', tag: 'Turismo', unlock: 900000, pop: 0.95, x: 90.2, y: 54.4, side: 'bl', tourism: true, hot: true,
    locs: [
      { id: 'tulum', name: 'Tulum Pueblo', rent: 45000, traffic: 1.0, wealth: 1.3 },
      { id: 'quinta', name: 'Playa del Carmen · Quinta Av.', rent: 55000, traffic: 1.2, wealth: 1.25 },
      { id: 'hotelera', name: 'Cancún Zona Hotelera', rent: 72000, traffic: 1.3, wealth: 1.55 }
    ] }
]

export const ORIGINS = [
  { id: 'importado', name: 'Importado comercial', region: 'Mezcla', price: 120, quality: 0.78, mx: false },
  { id: 'veracruz', name: 'Veracruz · Coatepec', region: 'Veracruz', price: 185, quality: 0.97, mx: true, x: 65.6, y: 74,
    finca: { cost: 1500000, kgDay: 18 } },
  { id: 'chiapas', name: 'Chiapas · Soconusco', region: 'Chiapas', price: 215, quality: 1.05, mx: true, x: 74.9, y: 86,
    finca: { cost: 2000000, kgDay: 20 } },
  { id: 'oaxaca', name: 'Oaxaca · Pluma Hidalgo', region: 'Oaxaca', price: 245, quality: 1.13, mx: true, x: 63.1, y: 87,
    finca: { cost: 2600000, kgDay: 18 } }
]

export const CAMPAIGNS = [
  { id: 'redes', name: 'Redes sociales', cost: 25000, days: 14, boost: 9, desc: 'Influencers locales y reels.' },
  { id: 'espectacular', name: 'Espectacular', cost: 120000, days: 30, boost: 20, desc: 'Anuncio en avenida principal.' },
  { id: 'festival', name: 'Patrocinio de festival', cost: 320000, days: 30, boost: 34, brand: 4, desc: 'Tu marca en el festival de la ciudad.' }
]

export const PROPERTIES = [
  { id: 'local-coy', name: 'Local en Coyoacán', city: 'cdmx', price: 2200000, rent: 17500 },
  { id: 'casona-mer', name: 'Casona en Mérida', city: 'mer', price: 3100000, rent: 25500 },
  { id: 'plaza-zap', name: 'Plaza comercial Zapopan', city: 'gdl', price: 6200000, rent: 52000 },
  { id: 'villa-tulum', name: 'Villa en Tulum', city: 'cun', price: 8000000, rent: 70000, tourism: true },
  { id: 'torre-mty', name: 'Oficinas en San Pedro', city: 'mty', price: 9800000, rent: 84000 },
  { id: 'edif-pol', name: 'Edificio en Polanco', city: 'cdmx', price: 12500000, rent: 104000 }
]

// Empresas ficticias de la bolsa del juego
export const STOCKS = [
  { id: 'AZTC', name: 'Cementos Azteca', price: 92, vol: 0.016, drift: 0.00025 },
  { id: 'BNOR', name: 'Banco del Norte', price: 148, vol: 0.014, drift: 0.0003 },
  { id: 'TSOL', name: 'Telecom Sol', price: 41, vol: 0.02, drift: 0.0002 },
  { id: 'MAYA', name: 'Aerolínea Maya', price: 27, vol: 0.032, drift: 0.0002 },
  { id: 'AGVT', name: 'Agave Tech', price: 64, vol: 0.038, drift: 0.0006 }
]

export const STARTUP_POOL = [
  { name: 'PagosYa', sector: 'Fintech' },
  { name: 'Tacotech', sector: 'Restaurantes' },
  { name: 'AgroCadena', sector: 'Agritech' },
  { name: 'EnvíoBici', sector: 'Logística' },
  { name: 'Mezcalytics', sector: 'Datos' },
  { name: 'Barrio Cloud', sector: 'SaaS' },
  { name: 'SolarMilpa', sector: 'Energía' },
  { name: 'TianguisApp', sector: 'Marketplace' },
  { name: 'Clínica Express', sector: 'Salud' },
  { name: 'Lotería Labs', sector: 'Juegos' }
]

export const FIRST_NAMES = ['Ana', 'Luis', 'Carmen', 'Diego', 'Lupita', 'Jorge', 'Ximena', 'Mateo', 'Fernanda', 'Iker',
  'Valeria', 'Emiliano', 'Renata', 'Santiago', 'Itzel', 'Rodrigo', 'Paola', 'Héctor', 'Citlali', 'Andrés', 'Mariana', 'Tonatiuh']
export const LAST_NAMES = ['López', 'Hernández', 'García', 'Martínez', 'Ramírez', 'Cruz', 'Flores', 'Morales', 'Reyes',
  'Jiménez', 'Ortiz', 'Mendoza', 'Ruiz', 'Vázquez', 'Castillo', 'Santiago']

export const ADVISORS = {
  barista: { name: 'Beto', role: 'Barista en jefe', img: 'assets/avatar-1.jpg' },
  tostador: { name: 'Don Chuy', role: 'Maestro tostador', img: 'assets/avatar-2.jpg' },
  finanzas: { name: 'Lic. Mariana', role: 'Directora Financiera', img: 'assets/avatar-3.jpg' },
  inversion: { name: 'Don Ernesto', role: 'Inversionista', img: 'assets/avatar-4.jpg' }
}

export const PHASES = [
  { n: 'I', name: 'Primer changarro', goal: 'Abre tu primera tienda' },
  { n: 'II', name: 'Cadena local', goal: '3 tiendas o 2 ciudades' },
  { n: 'III', name: 'Marca regional', goal: '8 tiendas en 4 ciudades' },
  { n: 'IV', name: 'Corporativo', goal: 'Patrimonio de $50 M' },
  { n: 'V', name: 'Imperio del grano', goal: 'Patrimonio de $250 M en las 6 ciudades' }
]

export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
