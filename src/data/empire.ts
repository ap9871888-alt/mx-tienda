// Contenido de "Imperio MX": temporadas, dilemas, inversionistas, estilo de vida y Bolsa MX. Todo ficticio.

// Calendario mexicano de temporadas (MM-DD). mult sube o baja el tráfico; tourism se suma en ciudades turísticas
export interface Season { id: string; name: string; from: string; to: string; mult: number; tourism?: number; tip: string; formats?: Record<string, number> } // formats: empujón extra por tipo de negocio
export const SEASONS: Season[] = [
  { id: 'reyes', name: 'Día de Reyes', from: '01-04', to: '01-07', mult: 0.12, tip: 'Rosca, chocolate y leche vuelan', formats: { panaderia: 0.6 } },
  { id: 'cuesta', name: 'Cuesta de enero', from: '01-08', to: '01-31', mult: -0.1, tip: 'La gente cuida el gasto tras las fiestas', formats: { farmacia: 0.15 } },
  { id: 'valentin', name: 'San Valentín', from: '02-12', to: '02-14', mult: 0.1, tip: 'Dulces y botanas suben', formats: { papeleria: 0.3, panaderia: 0.2 } },
  { id: 'santa', name: 'Semana Santa', from: '03-28', to: '04-12', mult: -0.05, tourism: 0.35, tip: 'Playas llenas, ciudades vacías' },
  { id: 'nino', name: 'Día del Niño', from: '04-28', to: '04-30', mult: 0.1, tip: 'Dulces, paletas y helados', formats: { paleteria: 0.4, papeleria: 0.15 } },
  { id: 'madres', name: 'Día de las Madres', from: '05-08', to: '05-10', mult: 0.15, tip: 'Pan, pastel y refrescos', formats: { panaderia: 0.45, papeleria: 0.2 } },
  { id: 'mundial', name: 'Partidos de la Selección', from: '06-15', to: '07-10', mult: 0.12, tip: 'Botanas y cerveza sin alcohol en cada partido' },
  { id: 'verano', name: 'Vacaciones de verano', from: '07-11', to: '08-20', mult: 0, tourism: 0.3, tip: 'Turismo alto en playas y ciudades coloniales', formats: { paleteria: 0.35, fruteria: 0.15 } },
  { id: 'clases', name: 'Regreso a clases', from: '08-21', to: '09-05', mult: 0.08, tip: 'Lunch, agua y papelería', formats: { papeleria: 0.9, ferreteria: 0.1 } },
  { id: 'patrias', name: 'Fiestas Patrias', from: '09-13', to: '09-16', mult: 0.15, tip: 'Antojitos y refrescos para el grito', formats: { taqueria: 0.3, fruteria: 0.1 } },
  { id: 'muertos', name: 'Día de Muertos', from: '10-28', to: '11-02', mult: 0.12, tourism: 0.25, tip: 'Pan de muerto y turismo en Oaxaca', formats: { panaderia: 0.7, fruteria: 0.25 } },
  { id: 'buenfin', name: 'El Buen Fin', from: '11-14', to: '11-17', mult: 0.2, tip: 'Todo el país sale de compras', formats: { ferreteria: 0.35 } },
  { id: 'guadalupe', name: 'Maratón Guadalupe-Reyes', from: '12-12', to: '12-23', mult: 0.15, tip: 'Posadas, piñatas y ponche', formats: { panaderia: 0.25, fruteria: 0.3 } },
  { id: 'navidad', name: 'Navidad y Año Nuevo', from: '12-24', to: '01-03', mult: 0.18, tourism: 0.3, tip: 'Las ventas del año', formats: { panaderia: 0.3, farmacia: 0.15, ferreteria: 0.1 } }
]
export const SEASON_ICON: Record<string, string> = { reyes: 'reyes', cuesta: 'reyes', valentin: 'valentin', santa: 'santa', nino: 'nino', madres: 'madres', mundial: 'mundial', verano: 'santa', clases: 'clases', patrias: 'patrias', muertos: 'muertos', buenfin: 'buenfin', guadalupe: 'guadalupe', navidad: 'navidad' }

// Dilemas: decisiones con 2 o 3 opciones y consecuencias
export interface DilemmaOption { label: string; cost?: number; risk?: { p: number; cost: number; text: string }; traffic?: number; days?: number; sat?: number; margin?: number; rep?: number; text: string; fire?: boolean; morale?: number }
export interface DilemmaDef { id: string; title: string; text: string; options: DilemmaOption[]; when?: 'smog' | 'hurricane' | 'food' | 'staff' }
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
    ] },
  // ---------- problemas laborales y personales ----------
  { id: 'robo-caja', title: 'Faltante en la caja', text: 'Al hacer el corte faltan $3,500. Las cámaras muestran que fue un cajero.', when: 'staff',
    options: [
      { label: 'Despedirlo con acta administrativa', cost: 4000, fire: true, text: 'Lo despediste con todo en regla. El equipo entendió el mensaje.' },
      { label: 'Descontarle y darle otra oportunidad', morale: -3, risk: { p: 0.35, cost: 6000, text: 'Volvió a pasar: ahora faltan $6,000' }, text: 'Pagó el faltante y prometió no repetirlo.' },
      { label: 'Denunciar ante el MP', cost: 2500, fire: true, rep: 0.1, text: 'Se presentó la denuncia. Los vecinos valoran tu seriedad.' }
    ] },
  { id: 'robo-asalto', title: 'Asalto a la tienda', text: 'Dos sujetos asaltaron la tienda en la noche. Nadie salió herido, pero se llevaron la caja y mercancía.', when: 'staff',
    options: [
      { label: 'Poner cámaras y botón de pánico', cost: 25000, sat: 2, text: 'La gente se siente más segura comprando contigo.' },
      { label: 'Contratar vigilante nocturno', cost: 12000, text: 'El vigilante cuida la tienda en la noche.' },
      { label: 'No hacer nada', risk: { p: 0.4, cost: 20000, text: 'Volvieron a asaltar la tienda' }, sat: -4, text: 'Por suerte no volvió a pasar.' }
    ] },
  { id: 'aumento', title: 'Tu cajera pide aumento', text: 'Tu mejor cajera dice que en la tienda de enfrente le ofrecen $1,500 más al mes.', when: 'staff',
    options: [
      { label: 'Darle el aumento', cost: 18000, morale: 6, text: 'Se queda contenta y atiende mejor que nunca.' },
      { label: 'Ofrecerle capacitación pagada', cost: 8000, morale: 3, text: 'Aceptó quedarse por la oportunidad de crecer.' },
      { label: 'Dejarla ir', fire: true, text: 'Renunció y se fue con la competencia.' }
    ] },
  { id: 'enfermo', title: 'Problema familiar', text: 'Un empleado tiene a su mamá hospitalizada y pide una semana de permiso con goce de sueldo.', when: 'staff',
    options: [
      { label: 'Darle el permiso pagado', cost: 5000, morale: 8, rep: 0.1, text: 'Te lo agradece de corazón. Todo el equipo lo nota.' },
      { label: 'Permiso sin goce de sueldo', morale: -2, text: 'Se fue preocupado por el dinero.' },
      { label: 'Negarlo', morale: -8, risk: { p: 0.5, cost: 0, text: 'Renunció y el equipo quedó molesto' }, text: 'Se quedó, pero de mala gana.' }
    ] },
  { id: 'despido', title: 'Demanda laboral', text: 'Un excajero que despediste te demanda ante la Junta de Conciliación por despido injustificado.', when: 'staff',
    options: [
      { label: 'Conciliar y pagar finiquito completo', cost: 30000, text: 'Se cerró el caso de forma amistosa.' },
      { label: 'Pelear el juicio con abogado', cost: 15000, risk: { p: 0.45, cost: 80000, text: 'Perdiste el juicio: pagaste salarios caídos' }, text: 'Ganaste el juicio.' }
    ] },
  { id: 'impuntual', title: 'Llegadas tarde', text: 'Un cajero lleva tres semanas llegando tarde y la fila crece cada mañana.', when: 'staff',
    options: [
      { label: 'Hablar con él', morale: 2, text: 'Tenía problemas con el transporte. Le cambiaste el turno y mejoró.' },
      { label: 'Despedirlo', cost: 6000, fire: true, text: 'Lo despediste pagando su finiquito.' },
      { label: 'Ignorarlo', sat: -4, text: 'La fila de la mañana sigue molestando a los clientes.' }
    ] },
  { id: 'sindicato', title: 'Tus empleados se organizan', text: 'Tus empleados quieren formar un sindicato y piden mejores prestaciones: vales de despensa y seguro.', when: 'staff',
    options: [
      { label: 'Negociar prestaciones', cost: 35000, morale: 10, rep: 0.2, text: 'Firmaron un buen acuerdo. Rotación baja y servicio sube.' },
      { label: 'Ofrecer solo vales de despensa', cost: 12000, morale: 3, text: 'Aceptaron por ahora.' },
      { label: 'Negarte', morale: -10, sat: -5, risk: { p: 0.3, cost: 40000, text: 'Hicieron paro de un día' }, text: 'Hay tensión en las tiendas.' }
    ] },
  { id: 'accidente', title: 'Accidente laboral', text: 'Un empleado se cortó acomodando mercancía y necesita atención médica.', when: 'staff',
    options: [
      { label: 'Llevarlo al IMSS y pagar incapacidad', cost: 6000, morale: 4, text: 'Se recuperó y volvió agradecido.' },
      { label: 'Pagar clínica privada', cost: 15000, morale: 7, text: 'Lo atendieron rápido. El equipo se siente cuidado.' }
    ] },
  { id: 'cliente-queja', title: 'Cliente furioso en redes', text: 'Una clienta publicó un video quejándose de que le cobraron de más. Ya lleva 50 mil vistas.',
    options: [
      { label: 'Disculparte y regalarle una despensa', cost: 3000, rep: 0.2, text: 'Publicó otro video agradeciendo. Quedaste bien.' },
      { label: 'Responder con el ticket', risk: { p: 0.5, cost: 0, text: 'Se hizo más viral y te criticaron' }, text: 'El ticket demostró que el cobro era correcto.' },
      { label: 'Ignorarlo', sat: -3, traffic: -0.05, days: 10, text: 'Algunos clientes dejaron de venir.' }
    ] }
]

// inversionistas ficticios
export const INVESTORS = [
  { name: 'Lic. Arturo Garza', kind: 'Ángel de Monterrey', avatar: 'inversor-0' },
  { name: 'Mtra. Sofía Villaseñor', kind: 'Ángel de la CDMX', avatar: 'inversor-1' },
  { name: 'Fondo Jaguar Capital', kind: 'Fondo de capital', avatar: 'inversor-2' },
  { name: 'Grupo Nopal Ventures', kind: 'Fondo de capital', avatar: 'inversor-3' }
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

// ---------- Hito 3: eventos propios de cada ciudad (MM-DD) ----------
export interface CityEvent { id: string; city: string; name: string; from: string; to: string; mult: number; tip: string }
export const CITY_EVENTS: CityEvent[] = [
  { id: 'carnaval-ver', city: 'ver', name: 'Carnaval de Veracruz', from: '02-20', to: '02-28', mult: 0.35, tip: 'Desfiles y comparsas: el malecón se llena' },
  { id: 'spring-aca', city: 'aca', name: 'Spring break', from: '03-08', to: '03-25', mult: 0.3, tip: 'Estudiantes en la costera' },
  { id: 'feria-pue', city: 'pue', name: 'Feria de Puebla', from: '04-20', to: '05-15', mult: 0.18, tip: 'Juegos mecánicos y palenque' },
  { id: 'guelaguetza', city: 'oax', name: 'Guelaguetza', from: '07-18', to: '07-31', mult: 0.4, tip: 'La fiesta más grande de Oaxaca' },
  { id: 'mariachi-gdl', city: 'gdl', name: 'Encuentro del Mariachi', from: '08-25', to: '09-05', mult: 0.2, tip: 'Mariachis en cada plaza' },
  { id: 'feria-pach', city: 'pach', name: 'Feria de Pachuca', from: '10-01', to: '10-20', mult: 0.18, tip: 'Pastes y conciertos' },
  { id: 'catrinas-qro', city: 'qro', name: 'Festival de Catrinas', from: '10-25', to: '11-02', mult: 0.2, tip: 'El centro se llena de catrinas' },
  { id: 'noche-mer', city: 'mer', name: 'Noche Blanca', from: '05-20', to: '05-22', mult: 0.3, tip: 'Museos y calles abiertas toda la noche' },
  { id: 'fil-gdl', city: 'gdl', name: 'Feria del Libro', from: '11-28', to: '12-06', mult: 0.22, tip: 'Visitantes de todo el mundo' },
  { id: 'clasico-mty', city: 'mty', name: 'Clásico regio', from: '10-10', to: '10-12', mult: 0.25, tip: 'Toda la ciudad ve el partido' },
  { id: 'gastro-tij', city: 'tij', name: 'Festival gastronómico', from: '09-20', to: '09-28', mult: 0.2, tip: 'Comida y turistas del otro lado' },
  { id: 'maraton-cdmx', city: 'cdmx', name: 'Maratón de la Ciudad', from: '08-30', to: '08-31', mult: 0.12, tip: 'Corredores con sed' },
  { id: 'ozono-cdmx', city: 'cdmx', name: 'Temporada de ozono', from: '03-15', to: '05-31', mult: -0.06, tip: 'Contingencias frecuentes' },
  { id: 'calor-mer', city: 'mer', name: 'Calor extremo', from: '04-15', to: '06-15', mult: 0.1, tip: 'Bebidas frías y helados vuelan' },
  { id: 'huracanes-aca', city: 'aca', name: 'Temporada de huracanes', from: '09-01', to: '10-15', mult: -0.15, tip: 'Menos turistas en la costa' }
]

// ---------- Hito 3: salida a Bolsa y conglomerado ----------
export const IPO = { minStores: 10, minWorth: 15_000_000, minOffice: 2, float: 0.25, shares: 10_000_000, fee: 0.04 }
export const BUYOUT_PER_STORE = 650_000 // costo por tienda al comprar una cadena rival
export const SUBSIDIARY_DAILY = 1400 // utilidad diaria por tienda de una cadena comprada

// ---------- metas de patrimonio: celebración y desbloqueos ----------
export const MILESTONES = [
  { amount: 1_000_000, title: '¡Tu primer millón, jefe!', unlock: 'Ya puedes contratar un Gerente de Operaciones que pida mercancía y contrate por ti.' },
  { amount: 5_000_000, title: '¡Felicidades, jefe: 5 millones!', unlock: 'Desbloqueas el Director Comercial (precios automáticos) y la compra de cadenas rivales.' },
  { amount: 10_000_000, title: '¡Eres millonario: 10 millones!', unlock: 'Desbloqueas el Director General: tu cadena funciona sola y tú decides la estrategia.' },
  { amount: 50_000_000, title: '¡50 millones! Ya eres un grupo empresarial', unlock: 'Fundación social: tus programas tienen doble impacto.' },
  { amount: 100_000_000, title: '¡100 millones! Magnate del retail', unlock: 'Tu empresa es de las más grandes del país.' },
  { amount: 1_000_000_000, title: '¡Mil millones! Leyenda de México', unlock: 'Has construido un imperio.' }
]

// ---------- directivos: delegar para que la cadena funcione sola ----------
export interface DirectorDef { id: 'ops' | 'com' | 'rh' | 'dg'; name: string; who: string; salary: number; minWorth: number; desc: string }
export const DIRECTORS: DirectorDef[] = [
  { id: 'ops', name: 'Gerente de Operaciones', who: 'Lupita', salary: 45000, minWorth: 1_000_000, desc: 'Pide mercancía a tiempo y contrata cajeros cuando la fila crece.' },
  { id: 'rh', name: 'Jefa de Recursos Humanos', who: 'Doña Carmen', salary: 40000, minWorth: 1_000_000, desc: 'Resuelve sola los problemas laborales menores y capacita al personal.' },
  { id: 'com', name: 'Director Comercial', who: 'Don Ramiro', salary: 70000, minWorth: 5_000_000, desc: 'Ajusta los precios de cada tienda según su colonia y competencia.' },
  { id: 'dg', name: 'Director General', who: 'Lic. Valeria', salary: 150000, minWorth: 10_000_000, desc: 'Abre tiendas nuevas en las mejores colonias con tu dinero (si se lo autorizas).' }
]

// ---------- programas sociales ----------
export interface SocialDef { id: string; name: string; cost: number; monthly: number; rep: number; traffic: number; desc: string; emoji: string }
export const SOCIAL_PROGRAMS: SocialDef[] = [
  { id: 'redondeo', name: 'Redondeo en caja', cost: 0, monthly: 0, rep: 0.1, traffic: 0.01, desc: 'Tus clientes redondean y lo donas a un asilo.', emoji: '🪙' },
  { id: 'despensas', name: 'Banco de alimentos', cost: 50000, monthly: 15000, rep: 0.2, traffic: 0.02, desc: 'Donas la mercancía por caducar a familias que la necesitan.', emoji: '🥫' },
  { id: 'becas', name: 'Becas para hijos de empleados', cost: 100000, monthly: 25000, rep: 0.2, traffic: 0.01, desc: 'Tu equipo se queda y trabaja mejor.', emoji: '🎓' },
  { id: 'comedor', name: 'Comedor comunitario', cost: 200000, monthly: 40000, rep: 0.3, traffic: 0.03, desc: 'Comida caliente en las colonias donde tienes tiendas.', emoji: '🍲' },
  { id: 'reforestar', name: 'Reforestación urbana', cost: 150000, monthly: 10000, rep: 0.2, traffic: 0.02, desc: 'Plantas árboles y jacarandas en tus colonias.', emoji: '🌳' },
  { id: 'deporte', name: 'Liga de fútbol infantil', cost: 120000, monthly: 20000, rep: 0.3, traffic: 0.03, desc: 'Patrocinas uniformes y canchas. Todo el barrio te conoce.', emoji: '⚽' }
]
