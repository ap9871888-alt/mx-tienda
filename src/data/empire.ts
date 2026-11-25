// Contenido de "Imperio MX": temporadas, dilemas, inversionistas, estilo de vida y Bolsa MX. Todo ficticio.

// Calendario mexicano de temporadas (MM-DD). mult sube o baja el tráfico; tourism se suma en ciudades turísticas
export interface Season { id: string; name: string; from: string; to: string; mult: number; tourism?: number; tip: string }
export const SEASONS: Season[] = [
  { id: 'reyes', name: 'Día de Reyes', from: '01-04', to: '01-07', mult: 0.12, tip: 'Rosca, chocolate y leche vuelan' },
  { id: 'cuesta', name: 'Cuesta de enero', from: '01-08', to: '01-31', mult: -0.1, tip: 'La gente cuida el gasto tras las fiestas' },
  { id: 'valentin', name: 'San Valentín', from: '02-12', to: '02-14', mult: 0.1, tip: 'Dulces y botanas suben' },
  { id: 'santa', name: 'Semana Santa', from: '03-28', to: '04-12', mult: -0.05, tourism: 0.35, tip: 'Playas llenas, ciudades vacías' },
  { id: 'nino', name: 'Día del Niño', from: '04-28', to: '04-30', mult: 0.1, tip: 'Dulces, paletas y helados' },
  { id: 'madres', name: 'Día de las Madres', from: '05-08', to: '05-10', mult: 0.15, tip: 'Pan, pastel y refrescos' },
  { id: 'mundial', name: 'Partidos de la Selección', from: '06-15', to: '07-10', mult: 0.12, tip: 'Botanas y cerveza sin alcohol en cada partido' },
  { id: 'verano', name: 'Vacaciones de verano', from: '07-11', to: '08-20', mult: 0, tourism: 0.3, tip: 'Turismo alto en playas y ciudades coloniales' },
  { id: 'clases', name: 'Regreso a clases', from: '08-21', to: '09-05', mult: 0.08, tip: 'Lunch, agua y papelería' },
  { id: 'patrias', name: 'Fiestas Patrias', from: '09-13', to: '09-16', mult: 0.15, tip: 'Antojitos y refrescos para el grito' },
  { id: 'muertos', name: 'Día de Muertos', from: '10-28', to: '11-02', mult: 0.12, tourism: 0.25, tip: 'Pan de muerto y turismo en Oaxaca' },
  { id: 'buenfin', name: 'El Buen Fin', from: '11-14', to: '11-17', mult: 0.2, tip: 'Todo el país sale de compras' },
  { id: 'guadalupe', name: 'Maratón Guadalupe-Reyes', from: '12-12', to: '12-23', mult: 0.15, tip: 'Posadas, piñatas y ponche' },
  { id: 'navidad', name: 'Navidad y Año Nuevo', from: '12-24', to: '01-03', mult: 0.18, tourism: 0.3, tip: 'Las ventas del año' }
]
export const SEASON_ICON: Record<string, string> = { reyes: 'reyes', cuesta: 'reyes', valentin: 'valentin', santa: 'santa', nino: 'nino', madres: 'madres', mundial: 'mundial', verano: 'santa', clases: 'clases', patrias: 'patrias', muertos: 'muertos', buenfin: 'buenfin', guadalupe: 'guadalupe', navidad: 'navidad' }

// Dilemas: decisiones con 2 o 3 opciones y consecuencias
export interface DilemmaOption { label: string; cost?: number; risk?: { p: number; cost: number; text: string }; traffic?: number; days?: number; sat?: number; margin?: number; rep?: number; text: string }
export interface DilemmaDef { id: string; title: string; text: string; options: DilemmaOption[]; when?: 'smog' | 'hurricane' | 'food' }
export const DILEMMAS: DilemmaDef[] = [
  { id: 'inspector', title: 'Visita del inspector', text: 'Un inspector dice que a tu licencia le falta un sello. Te insinúa que "se puede arreglar aquí mismo".',
    options: [
      { label: 'Pagar la multa legal', cost: 8000, rep: 0.2, text: 'Pagaste en regla. Los vecinos lo notan.' },
      { label: 'Dar "para el refresco"', cost: 3000, risk: { p: 0.3, cost: 45000, text: 'Te cacharon: multa doble y mala fama' }, rep: -0.2, text: 'Se fue contento… por ahora.' },
      { label: 'Contratar abogado', cost: 15000, text: 'Se aclaró todo y no pagaste multa.' }
    ] },
  { id: 'receta', title: 'Te quieren copiar', text: 'Un exsocio abrió un negocio idéntico al tuyo a dos cuadras, con tu receta y tus precios.', when: 'food',
    options: [
      { label: 'Demandarlo', cost: 50000, text: 'El juez te dio la razón. Cerró en un mes.' },
      { label: 'Mejorar tu receta', cost: 30000, sat: 6, text: 'Tus clientes notan la diferencia.' },
      { label: 'Ignorarlo', traffic: -0.08, days: 30, text: 'Te quitó algunos clientes este mes.' }
    ] },
  { id: 'insumos', title: 'Sube el precio de los insumos', text: 'El azúcar, el cacao y el maíz subieron 15 % por la sequía. ¿Qué haces?',
    options: [
      { label: 'Absorber el golpe', cost: 25000, text: 'Mantuviste precios: tus clientes te lo agradecen.' },
      { label: 'Subir precios 2 %', margin: 0.02, sat: -4, text: 'Más margen, algunos clientes se quejaron.' },
      { label: 'Cambiar de proveedor', risk: { p: 0.5, cost: 0, text: 'La calidad bajó y hubo quejas' }, cost: 5000, text: 'El nuevo proveedor salió bueno.' }
    ] },
  { id: 'contingencia', title: 'Contingencia ambiental', text: 'Se activa la Fase 1: se suspenden actividades al aire libre 3 días y las ventas físicas bajan 30 %.', when: 'smog',
    options: [
      { label: 'Promoción a domicilio', cost: 25000, text: 'Tus repartidores salvaron las ventas.' },
      { label: 'Aguantar el golpe', traffic: -0.3, days: 3, text: 'Fueron 3 días flojos.' }
    ] },
  { id: 'huracan', title: 'Alerta de huracán', text: 'Un huracán se acerca a la costa. Puedes proteger tus locales o arriesgarte.', when: 'hurricane',
    options: [
      { label: 'Proteger con tablas y seguro', cost: 40000, traffic: -0.4, days: 3, text: 'Pasó el huracán y tus locales quedaron bien.' },
      { label: 'Arriesgarse', risk: { p: 0.5, cost: 150000, text: 'El agua entró: perdiste mercancía y equipo' }, traffic: -0.4, days: 5, text: 'Tuviste suerte: solo cerraste unos días.' }
    ] },
  { id: 'salario', title: 'Aumento al salario mínimo', text: 'El gobierno anunció un aumento al salario mínimo. Tu equipo pregunta si lo vas a respetar desde ya.',
    options: [
      { label: 'Pagarlo desde ya', cost: 20000, sat: 5, text: 'Tu equipo está motivado y atiende mejor.' },
      { label: 'Esperar a que sea obligatorio', sat: -3, text: 'Hubo algo de molestia en el equipo.' }
    ] },
  { id: 'influencer', title: 'Un influencer te visitó', text: 'Un tiktoker con 2 millones de seguidores quiere hacer un video en tu negocio, pero cobra por la publicación.',
    options: [
      { label: 'Pagar la colaboración', cost: 35000, traffic: 0.15, days: 21, text: 'El video se hizo viral: llegaron clientes nuevos.' },
      { label: 'Invitarle la comida', risk: { p: 0.4, cost: 0, text: 'Habló mal del servicio' }, traffic: 0.05, days: 10, text: 'Hizo un video corto y amable.' },
      { label: 'No, gracias', text: 'Todo sigue igual.' }
    ] }
]

// inversionistas ficticios
export const INVESTORS = [
  { name: 'Lic. Arturo Garza', kind: 'Ángel de Monterrey', avatar: 'asesor-finanzas' },
  { name: 'Mtra. Sofía Villaseñor', kind: 'Ángel de la CDMX', avatar: 'asesor-comprador' },
  { name: 'Fondo Jaguar Capital', kind: 'Fondo de capital', avatar: 'asesor-logistica' },
  { name: 'Grupo Nopal Ventures', kind: 'Fondo de capital', avatar: 'asesor-encargado' }
]

// estilo de vida: no da ingresos, solo un poco de estatus (mejor trato con inversionistas)
export interface StatusItem { id: string; name: string; cost: number; bonus: number; emoji: string; desc: string }
export const STATUS_ITEMS: StatusItem[] = [
  { id: 'ropa', name: 'Ropa de marca', cost: 15000, bonus: 0.01, emoji: '👔', desc: '+1 % al negociar' },
  { id: 'celular', name: 'Celular de gama alta', cost: 28000, bonus: 0.01, emoji: '📱', desc: '+1 % al negociar' },
  { id: 'moto', name: 'Moto de reparto propia', cost: 45000, bonus: 0.02, emoji: '🛵', desc: '+2 % al negociar' },
  { id: 'vocho', name: 'Vocho clásico', cost: 90000, bonus: 0.02, emoji: '🚗', desc: '+2 % al negociar' },
  { id: 'reloj', name: 'Reloj suizo', cost: 250000, bonus: 0.02, emoji: '⌚', desc: '+2 % al negociar' },
  { id: 'auto', name: 'Auto ejecutivo', cost: 650000, bonus: 0.03, emoji: '🚙', desc: '+3 % al negociar' },
  { id: 'depa', name: 'Departamento en la Condesa', cost: 4500000, bonus: 0.04, emoji: '🏢', desc: '+4 % al negociar' },
  { id: 'mansion', name: 'Casa en Valle de Bravo', cost: 15000000, bonus: 0.05, emoji: '🏡', desc: '+5 % al negociar' }
]

// Bolsa MX: empresas ficticias
export interface StockDef { id: string; name: string; sector: string; price: number; vol: number; drift: number }
export const STOCKS: StockDef[] = [
  { id: 'refresquera', name: 'Refrescos Aurora', sector: 'Bebidas', price: 120, vol: 0.012, drift: 0.08 },
  { id: 'panificadora', name: 'Panificadora La Espiga', sector: 'Alimentos', price: 68, vol: 0.01, drift: 0.07 },
  { id: 'cementera', name: 'Cementos Sierra Madre', sector: 'Construcción', price: 22, vol: 0.02, drift: 0.06 },
  { id: 'banco', name: 'Banca del Comercio', sector: 'Finanzas', price: 145, vol: 0.014, drift: 0.09 },
  { id: 'aerolinea', name: 'Aerolínea Quetzal', sector: 'Transporte', price: 34, vol: 0.026, drift: 0.05 },
  { id: 'telefonica', name: 'Conecta MX', sector: 'Telecom', price: 18, vol: 0.013, drift: 0.05 },
  { id: 'minera', name: 'Minera Plata Alta', sector: 'Minería', price: 95, vol: 0.024, drift: 0.07 },
  { id: 'cines', name: 'Cines Estelar', sector: 'Entretenimiento', price: 41, vol: 0.018, drift: 0.06 }
]
export const STOCK_FEE = 0.0025
