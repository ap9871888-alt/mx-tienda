// Tienda MX Inc. — contenido del juego. Un solo imperio con tres giros: tiendas, cafeterías y taquerías.

export const START = { year: 2027, month: 0, day: 1, cash: 350000 }

// Cada giro tiene 4 formatos (del más chico al flagship) y su propio catálogo.
export const GIROS = {
  tienda: {
    id: 'tienda', name: 'Tienda', plural: 'Tiendas', icon: '🏪', staff: 'Cajero', staffPl: 'Cajeros', base: 260, serve: [60, 15], basket: 2.4,
    formats: [
      { name: 'Tiendita de Esquina', cost: 80000, maxStaff: 2, ambience: 0.85, upkeep: 200, img: 'assets/formato-1.jpg', desc: 'La de toda la vida: fiado, refrescos fríos y dulces a granel.' },
      { name: 'Conveniencia 24/7', cost: 380000, maxStaff: 5, ambience: 1.05, upkeep: 750, img: 'assets/formato-2.jpg', desc: 'Abierta día y noche: +20 % de tráfico, cobro de servicios.', traffic: 1.2 },
      { name: 'Hard Discount', cost: 950000, maxStaff: 6, ambience: 0.95, upkeep: 1300, img: 'assets/formato-3.jpg', desc: 'Pallets, poco surtido y precios bajos. La clientela perdona el precio.', elastic: 0.6 },
      { name: 'Bodega Express y Farmacia', cost: 2300000, maxStaff: 9, ambience: 1.2, upkeep: 2600, img: 'assets/formato-4.jpg', desc: 'Frutas, verduras, farmacia y andén de carga.' }
    ],
    products: [
      { id: 'abarrotes', name: 'Abarrotes', ref: 35, cost: 25, tier: 1, appeal: 1.2 },
      { id: 'bebidas', name: 'Bebidas Frías', ref: 25, cost: 14, tier: 1, appeal: 1.3, heat: true },
      { id: 'botanas', name: 'Botanas y Dulces', ref: 20, cost: 11, tier: 1, appeal: 1.0 },
      { id: 'servicios', name: 'Servicios y Recargas', ref: 50, cost: 44, tier: 2, appeal: 0.9 },
      { id: 'marcapropia', name: 'Marca Propia', ref: 18, cost: 7, tier: 1, appeal: 1.0, needs: 'marcaPropia' },
      { id: 'frescos', name: 'Frutas y Verduras', ref: 30, cost: 18, tier: 4, appeal: 1.1 },
      { id: 'farmacia', name: 'Farmacia', ref: 90, cost: 55, tier: 4, appeal: 0.9 }
    ]
  },
  cafe: {
    id: 'cafe', name: 'Cafetería', plural: 'Cafeterías', icon: '☕', staff: 'Barista', staffPl: 'Baristas', base: 170, serve: [35, 14], basket: 1.3,
    formats: [
      { name: 'Kiosco de Café', cost: 60000, maxStaff: 2, ambience: 0.85, upkeep: 150, img: 'assets/cafe-1.jpg', desc: 'Ventanita con tejas de barro. Barato y ágil.' },
      { name: 'Café Artesanal Oaxaca', cost: 260000, maxStaff: 4, ambience: 1.0, upkeep: 400, img: 'assets/cafe-2.jpg', desc: 'Barro negro, vigas de madera y mesas para quedarse.' },
      { name: 'Barra Moderna Polanco', cost: 750000, maxStaff: 6, ambience: 1.18, upkeep: 900, img: 'assets/cafe-3.jpg', desc: 'Cristal, mármol y métodos de especialidad.' },
      { name: 'Hacienda Flagship y Tostador', cost: 2200000, maxStaff: 10, ambience: 1.35, upkeep: 2200, img: 'assets/cafe-4.jpg', desc: 'Patio colonial con tostador propio.' }
    ],
    products: [
      { id: 'olla', name: 'Café de Olla', ref: 40, cost: 10, tier: 1, appeal: 1.1 },
      { id: 'americano', name: 'Americano', ref: 38, cost: 8, tier: 1, appeal: 1.0 },
      { id: 'concha', name: 'Concha', ref: 25, cost: 7, tier: 1, appeal: 0.8 },
      { id: 'capuchino', name: 'Capuchino', ref: 55, cost: 15, tier: 2, appeal: 1.1 },
      { id: 'horchata', name: 'Latte de Horchata', ref: 65, cost: 19, tier: 2, appeal: 1.0 },
      { id: 'coldbrew', name: 'Cold Brew', ref: 65, cost: 13, tier: 3, appeal: 0.9, heat: true },
      { id: 'mocha', name: 'Mocha Mexicano', ref: 70, cost: 20, tier: 3, appeal: 1.0 },
      { id: 'especial', name: 'Pour-over de Especialidad', ref: 95, cost: 12, tier: 4, appeal: 0.7 },
      { id: 'panmuerto', name: 'Pan de Muerto', ref: 45, cost: 12, tier: 1, appeal: 1.6, season: 'muertos' }
    ]
  },
  taqueria: {
    id: 'taqueria', name: 'Taquería', plural: 'Taquerías', icon: '🌮', staff: 'Taquero', staffPl: 'Taqueros', base: 210, serve: [45, 15], basket: 3,
    formats: [
      { name: 'Puesto de Banqueta', cost: 45000, maxStaff: 2, ambience: 0.85, upkeep: 180, art: 1, desc: 'Trompo, comal y lona afuera del metro.' },
      { name: 'Taquería de Barrio', cost: 220000, maxStaff: 4, ambience: 1.0, upkeep: 450, art: 2, desc: 'Local con mesas, salsero y aguas frescas.' },
      { name: 'Taquería con Terraza', cost: 650000, maxStaff: 6, ambience: 1.15, upkeep: 950, art: 3, desc: 'Parrilla al carbón, terraza y cheve fría.' },
      { name: 'Taquería Flagship', cost: 1800000, maxStaff: 9, ambience: 1.3, upkeep: 2000, art: 4, desc: 'Dos trompos, olla de birria y fila hasta la esquina.' }
    ],
    products: [
      { id: 'pastor', name: 'Pastor con Piña', ref: 28, cost: 9, tier: 1, appeal: 1.3 },
      { id: 'suadero', name: 'Suadero', ref: 24, cost: 8, tier: 1, appeal: 1.0 },
      { id: 'aguas', name: 'Aguas Frescas', ref: 25, cost: 5, tier: 1, appeal: 0.9, heat: true },
      { id: 'campechano', name: 'Campechano', ref: 30, cost: 10, tier: 2, appeal: 1.0 },
      { id: 'birria', name: 'Birria con Consomé', ref: 42, cost: 15, tier: 2, appeal: 1.1 },
      { id: 'arrachera', name: 'Arrachera en Harina', ref: 48, cost: 20, tier: 3, appeal: 1.0 },
      { id: 'gringa', name: 'Gringa', ref: 55, cost: 18, tier: 3, appeal: 0.9 },
      { id: 'vampiro', name: 'Vampiro Norteño', ref: 45, cost: 16, tier: 4, appeal: 0.9 }
    ]
  }
}
export const GIRO_IDS = ['tienda', 'cafe', 'taqueria']

// Regiones del mapa nacional (x, y en % sobre assets/mapa.jpg)
export const REGIONS = [
  { id: 'vdm', name: 'Valle de México', tag: 'Puebla / Centro', unlock: 0, pop: 1.25, x: 57.4, y: 72.5, side: 'b',
    locs: [
      { id: 'centro', name: 'Centro Histórico', rent: 30000, traffic: 1.15, wealth: 0.9, comp: 0.7 },
      { id: 'iztapalapa', name: 'Iztapalapa', rent: 18000, traffic: 1.2, wealth: 0.75, comp: 0.5 },
      { id: 'coyoacan', name: 'Coyoacán', rent: 32000, traffic: 0.95, wealth: 1.05, comp: 0.4 },
      { id: 'roma', name: 'Roma-Condesa', rent: 42000, traffic: 1.25, wealth: 1.15, comp: 0.6 },
      { id: 'satelite', name: 'Ciudad Satélite', rent: 35000, traffic: 1.0, wealth: 1.15, comp: 0.5 },
      { id: 'polanco', name: 'Polanco', rent: 65000, traffic: 1.2, wealth: 1.45, comp: 0.6 },
      { id: 'puebla', name: 'Puebla Centro', rent: 22000, traffic: 1.0, wealth: 0.9, comp: 0.4 }
    ] },
  { id: 'gdl', name: 'Guadalajara', tag: 'Occidente', unlock: 450000, pop: 1.05, x: 42.3, y: 70.5, side: 'l',
    locs: [
      { id: 'chapu', name: 'Av. Chapultepec', rent: 38000, traffic: 1.15, wealth: 1.05, comp: 0.5 },
      { id: 'provi', name: 'Providencia', rent: 42000, traffic: 1.0, wealth: 1.15, comp: 0.45 },
      { id: 'zapopan', name: 'Zapopan', rent: 50000, traffic: 1.1, wealth: 1.3, comp: 0.5 },
      { id: 'tlaque', name: 'Tlaquepaque', rent: 24000, traffic: 1.05, wealth: 0.9, comp: 0.35 }
    ] },
  { id: 'mty', name: 'Monterrey', tag: 'Hub logístico', unlock: 650000, pop: 1.05, x: 54.1, y: 40.9, side: 'r', hot: true,
    locs: [
      { id: 'sanpedro', name: 'San Pedro Garza García', rent: 62000, traffic: 1.15, wealth: 1.5, comp: 0.6 },
      { id: 'antiguo', name: 'Barrio Antiguo', rent: 30000, traffic: 1.0, wealth: 1.0, comp: 0.45 },
      { id: 'cumbres', name: 'Cumbres', rent: 34000, traffic: 1.05, wealth: 1.1, comp: 0.4 },
      { id: 'apodaca', name: 'Apodaca', rent: 20000, traffic: 1.0, wealth: 0.85, comp: 0.3 }
    ] },
  { id: 'tij', name: 'Tijuana', tag: 'Frontera', unlock: 550000, pop: 0.95, x: 8.2, y: 8, side: 'r', hot: true,
    locs: [
      { id: 'zonario', name: 'Zona Río', rent: 40000, traffic: 1.15, wealth: 1.2, comp: 0.5 },
      { id: 'playas', name: 'Playas de Tijuana', rent: 28000, traffic: 0.95, wealth: 1.05, comp: 0.3 },
      { id: 'otay', name: 'Otay', rent: 22000, traffic: 1.1, wealth: 0.9, comp: 0.35 }
    ] },
  { id: 'mer', name: 'Mérida', tag: 'Sureste', unlock: 400000, pop: 0.9, x: 87.9, y: 66.4, side: 't', hot: true,
    locs: [
      { id: 'montejo', name: 'Paseo de Montejo', rent: 30000, traffic: 1.05, wealth: 1.05, comp: 0.4 },
      { id: 'centromer', name: 'Centro', rent: 22000, traffic: 1.0, wealth: 0.9, comp: 0.35 },
      { id: 'altabrisa', name: 'Altabrisa', rent: 36000, traffic: 1.0, wealth: 1.2, comp: 0.3 }
    ] }
]

export const CEDIS = { cost: 3000000, capacity: 10, expand: 1500000, expandCap: 10, upkeep: 40000, saving: 0.25 }

export const CORP = {
  marcaPropia: { name: 'Marca Propia', cost: 1500000, desc: 'Tus propios abarrotes y botanas: categoría de alto margen en tiendas y −5 % de costo en cafés y taquerías.' },
  fintech: { name: 'Fintech: Pagos y Remesas', cost: 2500000, desc: 'App de pagos, remesas y recargas en caja. Cobras comisión por cada cliente.' },
  lealtad: { name: 'Ecosistema de Lealtad', cost: 900000, desc: 'Puntos en todas tus marcas: +6 % de clientes en todo el país.', needs: 'fintech' }
}

export const CAMPAIGNS = [
  { id: 'redes', name: 'Redes sociales', cost: 30000, days: 14, boost: 9, desc: 'Influencers locales y reels.' },
  { id: 'volanteo', name: 'Volanteo y perifoneo', cost: 60000, days: 21, boost: 14, desc: 'Ofertas casa por casa en la colonia.' },
  { id: 'espectacular', name: 'Espectacular y radio', cost: 220000, days: 30, boost: 26, brand: 3, desc: 'Anuncio en avenida y spots en la radio local.' }
]

export const PROPERTIES = [
  { id: 'bodega-abastos', name: 'Bodega en Central de Abastos', region: 'vdm', price: 2600000, rent: 25000 },
  { id: 'plaza-central', name: 'Plaza Central Satélite', region: 'vdm', price: 4300000, rent: 36000 },
  { id: 'plaza-zapopan', name: 'Plaza comercial Zapopan', region: 'gdl', price: 6200000, rent: 52000 },
  { id: 'nave-apodaca', name: 'Nave industrial Apodaca', region: 'mty', price: 7800000, rent: 66000 },
  { id: 'plaza-otay', name: 'Plaza fronteriza Otay', region: 'tij', price: 5100000, rent: 44000 },
  { id: 'torre-polanco', name: 'Torre corporativa Polanco', region: 'vdm', price: 14000000, rent: 118000 }
]

export const STOCKS = [
  { id: 'AZTC', name: 'Cementos Azteca', price: 92, vol: 0.016, drift: 0.00025 },
  { id: 'BNOR', name: 'Banco del Norte', price: 148, vol: 0.014, drift: 0.0003 },
  { id: 'TSOL', name: 'Telecom Sol', price: 41, vol: 0.02, drift: 0.0002 },
  { id: 'MAYA', name: 'Aerolínea Maya', price: 27, vol: 0.03, drift: 0.0002 },
  { id: 'AGVT', name: 'Agave Tech', price: 64, vol: 0.036, drift: 0.0006 }
]

export const PHASES = [
  { n: 1, name: 'Tienda Piloto', img: 'assets/fase-1.jpg', goal: 'Abre tu primera sucursal', perks: ['1–3 sucursales', 'Compra a mayoristas', 'Flujo de caja diario'] },
  { n: 2, name: 'Clúster Urbano', img: 'assets/fase-2.jpg', goal: '8 sucursales en una misma región', perks: ['Estandarización: +satisfacción', 'Rutas locales', 'Desbloquea construir CEDIS'] },
  { n: 3, name: 'CEDIS Propio', img: 'assets/fase-3.jpg', goal: 'Construye tu primer CEDIS', perks: ['Abasto centralizado', '−25 % costo de inventario', 'Desbloquea Marca Propia y Fintech'] },
  { n: 4, name: 'Marca Propia y Fintech', img: 'assets/fase-4.jpg', goal: 'Lanza Marca Propia y Fintech', perks: ['Alto margen', 'Pagos y remesas', 'Desbloquea franquicias, adquisiciones y BMV'] },
  { n: 5, name: 'Imperio Nacional', img: 'assets/fase-5.jpg', goal: 'Sal a bolsa y opera en las 5 regiones', perks: ['Franquicias y plazas', 'Salida a bolsa BMV', 'Adquisiciones'] }
]

export const ADVISORS = {
  encargado: { name: 'Toño', role: 'Encargado de Tienda', img: 'assets/avatar-1.jpg' },
  logistica: { name: 'Ing. Ramírez', role: 'Director de Logística', img: 'assets/avatar-2.jpg' },
  comprador: { name: 'Pablo', role: 'Comprador de Marca Propia', img: 'assets/avatar-3.jpg' },
  finanzas: { name: 'Lic. Daniela', role: 'Directora Financiera', img: 'assets/avatar-4.jpg' }
}

export const FIRST_NAMES = ['Ana', 'Luis', 'Carmen', 'Diego', 'Lupita', 'Jorge', 'Ximena', 'Mateo', 'Fernanda', 'Iker', 'Valeria',
  'Emiliano', 'Renata', 'Santiago', 'Itzel', 'Rodrigo', 'Paola', 'Héctor', 'Citlali', 'Andrés', 'Mariana', 'Tonatiuh', 'Brayan', 'Chuy']
export const LAST_NAMES = ['López', 'Hernández', 'García', 'Martínez', 'Ramírez', 'Cruz', 'Flores', 'Morales', 'Reyes', 'Jiménez',
  'Ortiz', 'Mendoza', 'Ruiz', 'Vázquez', 'Castillo', 'Santiago']
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
