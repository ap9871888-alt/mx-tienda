// Mundo vivo: una IA de entorno que observa cómo juegas y responde.
// - Gobierno: impuestos a grandes cadenas, elecciones con candidatos y salario mínimo.
// - Bolsa: empresas nuevas que salen a cotizar, booms y escándalos que salen en las noticias.
// - Obras públicas por etapas (anuncio → obra → inauguración) que cambian el tráfico de una colonia.
// - Estilo del jugador: los rivales y la prensa reaccionan a tus precios y a tu ritmo de expansión.
import { CITIES, cityOf } from '../data/cities'
import { nextRandom } from './rng'
import type { GameState, Result } from './types'

const ok = (msg = ''): Result => ({ ok: true, msg })
const fail = (msg: string): Result => ({ ok: false, msg })
const pick = <T>(s: GameState, a: T[]) => a[Math.floor(nextRandom(s) * a.length)]
const news = (s: GameState, text: string, kind: 'info' | 'good' | 'bad' = 'info') => {
  s.log.unshift({ minute: s.minute, text: `📰 ${text}`, kind }); if (s.log.length > 60) s.log.length = 60
  const w = s.world!; w.news.unshift({ day: Math.floor(s.minute / 1440), text, kind }); if (w.news.length > 40) w.news.length = 40
}

export interface PoliticalCandidate { name: string; party: string; color: string; tax: number; wage: number; desc: string; poll: number }
export interface WorldCompany { id: string; name: string; ticker: string; sector: string; vol: number; drift: number; day: number }
export interface PublicWork { id: string; name: string; city: string; colony: string; stage: number; stages: string[]; next: number; traffic: number }
export interface WorldState {
  taxRate: number // impuesto especial a la utilidad
  wageMult: number
  approval: number // qué tan bien te ve la opinión pública (0–100)
  nextGov: number // día de la próxima revisión del gobierno
  election: { day: number; candidates: PoliticalCandidate[]; donated: number | null } | null
  nextElection: number
  companies: WorldCompany[]
  works: PublicWork[]
  news: { day: number; text: string; kind: 'info' | 'good' | 'bad' }[]
  style: { cheap: number; growth: number }
  seq: number
  deals?: AngelDeal[]
}
// proyectos que inventa la IA y buscan inversión (ángel): avanzan por etapas y al final multiplican o pierden tu dinero
export interface AngelDeal {
  id: string; name: string; idea: string; founder: string; ask: number; pct: number; risk: number
  stage: number; next: number; invested: boolean; result: number | null; expires: number
}
export const DEAL_STAGES = ['Idea', 'Prototipo', 'Lanzamiento', 'Crecimiento', 'Resultado']

export function initWorld (s: GameState): WorldState {
  return (s.world ??= { taxRate: 0, wageMult: 1, approval: 60, nextGov: 30, election: null, nextElection: 300, companies: [], works: [], news: [], style: { cheap: 0, growth: 0 }, seq: 0 })
}

// ---------- generador de empresas para la Bolsa ----------
const PRE = ['Grupo', 'Agro', 'Tec', 'Inmobiliaria', 'Energía', 'Logística', 'Farma', 'Bio', 'Constructora', 'Fintech']
const ROOT = ['Aztlán', 'Nopal', 'Sierra', 'Quetzal', 'Jaguar', 'Maya', 'Olmeca', 'Tláloc', 'Copal', 'Ámbar', 'Cenote', 'Volcán']
const SUF = ['MX', 'Holdings', 'Global', 'del Norte', 'del Bajío', 'Digital', '']
const SECTOR: Record<string, string> = { Agro: 'Agroindustria', Tec: 'Tecnología', Inmobiliaria: 'Bienes raíces', Energía: 'Energía', Logística: 'Transporte', Farma: 'Salud', Bio: 'Salud', Constructora: 'Construcción', Fintech: 'Finanzas', Grupo: 'Conglomerado' }
function newCompany (s: GameState): WorldCompany {
  const w = initWorld(s); const p = pick(s, PRE); const r = pick(s, ROOT); const x = pick(s, SUF)
  const name = `${p} ${r}${x ? ' ' + x : ''}`
  const ticker = (r.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 2) + p[0]).toUpperCase() + (1 + Math.floor(nextRandom(s) * 9))
  w.seq++
  return { id: `w${w.seq}`, name, ticker, sector: SECTOR[p] ?? 'Industria', vol: 0.015 + nextRandom(s) * 0.03, drift: 0.02 + nextRandom(s) * 0.15, day: Math.floor(s.minute / 1440) }
}

// ---------- obras públicas ----------
const WORKS = [
  { name: 'Nueva línea de Metrobús', stages: ['Anuncio', 'Obra en la avenida', 'Inauguración'], days: [10, 90], during: -0.12, after: 0.15 },
  { name: 'Remodelación de la plaza principal', stages: ['Anuncio', 'Obra', 'Reapertura'], days: [7, 45], during: -0.08, after: 0.08 },
  { name: 'Nuevo hospital', stages: ['Primera piedra', 'Construcción', 'Inauguración'], days: [14, 180], during: -0.03, after: 0.1 },
  { name: 'Plaza comercial', stages: ['Anuncio', 'Construcción', 'Apertura'], days: [10, 120], during: -0.04, after: -0.06 },
  { name: 'Ciclovía y banquetas nuevas', stages: ['Anuncio', 'Obra', 'Entrega'], days: [5, 30], during: -0.1, after: 0.06 },
  { name: 'Estadio de fútbol', stages: ['Anuncio', 'Construcción', 'Partido inaugural'], days: [20, 365], during: -0.02, after: 0.2 }
]

// ---------- día a día ----------
export function worldDaily (s: GameState, dayProfit: number) {
  const w = initWorld(s); const day = Math.floor(s.minute / 1440)
  // aprender el estilo del jugador
  if (s.stores.length) {
    const cheap = s.stores.reduce((a, st) => a + Object.values(st.margins).reduce((b, m) => b + m, 0) / Object.keys(st.margins).length, 0) / s.stores.length
    w.style.cheap = w.style.cheap * 0.95 + (cheap < 0.17 ? 1 : 0) * 0.05
  }
  w.style.growth = w.style.growth * 0.97 + 0
  // impuesto especial
  if (w.taxRate > 0 && dayProfit > 0) s.cash -= dayProfit * w.taxRate
  // opinión pública: sube con programas sociales y buen trato; baja con escándalos
  w.approval = Math.max(0, Math.min(100, w.approval + ((s.social?.length ?? 0) * 0.05) + (((s.morale ?? 70) - 60) * 0.004) - 0.02))

  // el gobierno revisa a las grandes cadenas cada mes
  if (day >= w.nextGov) {
    w.nextGov = day + 30
    const big = s.stores.length + (s.subsidiaries ?? []).reduce((a, x) => a + x.stores, 0)
    if (big >= 15 && nextRandom(s) < 0.35) {
      w.taxRate = Math.min(0.12, +(w.taxRate + 0.02).toFixed(3))
      news(s, `El Congreso aprueba un impuesto especial a grandes cadenas: tu empresa pagará ${Math.round(w.taxRate * 100)} % extra de su utilidad`, 'bad')
    } else if (w.taxRate > 0 && w.approval > 75 && nextRandom(s) < 0.3) {
      w.taxRate = Math.max(0, +(w.taxRate - 0.01).toFixed(3))
      news(s, 'Por tus programas sociales, el gobierno te reconoce y baja el impuesto especial', 'good')
    }
    // la prensa y los rivales notan tu estrategia
    if (w.style.cheap > 0.5 && s.market && nextRandom(s) < 0.4) {
      for (const r of s.market.rivals) if (r.style === 'precio') r.aggression = Math.min(2, r.aggression + 0.15)
      news(s, 'Los analistas dicen que tu cadena "es la más barata del barrio"; los rivales de precios bajos preparan su respuesta', 'info')
    }
  }

  // elecciones: campaña 30 días antes
  if (!w.election && day >= w.nextElection - 30) {
    w.election = {
      day: w.nextElection, donated: null,
      candidates: [
        { name: 'Lic. Ernesto Salgado', party: 'Partido del Progreso', color: '#1B4D8F', tax: -0.01, wage: 1.03, desc: 'Menos impuestos a negocios; salario mínimo +3 %', poll: 34 + nextRandom(s) * 8 },
        { name: 'Dra. Patricia Rivas', party: 'Movimiento Popular', color: '#8E2A2A', tax: 0.02, wage: 1.12, desc: 'Más programas sociales; salario mínimo +12 % e impuesto a grandes cadenas', poll: 34 + nextRandom(s) * 8 },
        { name: 'Ing. Tomás Ibarra', party: 'Coalición Ciudadana', color: '#2E7D5B', tax: 0, wage: 1.06, desc: 'Sin cambios de impuestos; salario mínimo +6 %', poll: 22 + nextRandom(s) * 6 }
      ]
    }
    news(s, 'Arrancan las campañas: tres candidatos prometen cambiar los impuestos y el salario mínimo', 'info')
  }
  if (w.election && day >= w.election.day) {
    const c = w.election.candidates.map(x => ({ x, v: x.poll + nextRandom(s) * 14 })).sort((a, b) => b.v - a.v)[0].x
    w.taxRate = Math.max(0, Math.min(0.15, +(w.taxRate + c.tax).toFixed(3)))
    w.wageMult *= c.wage
    for (const st of s.stores) for (const k of st.cashiers) k.salary = Math.round(k.salary * c.wage)
    news(s, `Gana ${c.name} (${c.party}): ${c.desc.toLowerCase()}`, c.tax > 0 ? 'bad' : 'good')
    if (w.election.donated != null && nextRandom(s) < 0.25) {
      w.approval = Math.max(0, w.approval - 20)
      for (const st of s.stores) st.reputation = Math.max(0, st.reputation - 0.4)
      news(s, `Escándalo: revelan que ${s.company} financió una campaña. Tu reputación cae`, 'bad')
    }
    w.election = null; w.nextElection = day + 365
  }

  // Bolsa: empresas nuevas, booms y escándalos
  const stocks = s.stocks ?? {}
  if (nextRandom(s) < 1 / 25) {
    const c = newCompany(s); const price = Math.round(8 + nextRandom(s) * 40)
    w.companies.push(c); stocks[c.id] = { price, hist: [price], shares: 0, cost: 0 }; s.stocks = stocks
    news(s, `${c.name} (${c.ticker}) sale a la Bolsa MX a $${price} por acción`, 'info')
  }
  for (const c of w.companies) {
    const x = stocks[c.id]; if (!x) continue
    const z = (nextRandom(s) + nextRandom(s) + nextRandom(s) - 1.5) * 1.15
    let jump = 0
    const roll = nextRandom(s)
    if (roll < 1 / 350) { jump = -0.35 - nextRandom(s) * 0.2; news(s, `Escándalo en ${c.name}: investigan fraude contable. Sus acciones se desploman`, 'bad') } else if (roll < 1 / 160) { jump = 0.2 + nextRandom(s) * 0.25; news(s, `${c.name} gana un contrato millonario: sus acciones se disparan`, 'good') }
    x.price = Math.max(0.5, +(x.price * (1 + c.drift / 365 + c.vol * z + jump)).toFixed(2))
    x.hist.push(x.price); if (x.hist.length > 120) x.hist.shift()
  }

  // obras públicas en tus ciudades
  if (nextRandom(s) < 1 / 30) {
    const cities = CITIES.filter(c => s.cities.includes(c.id)); const city = pick(s, cities); const col = pick(s, city.colonies); const t = pick(s, WORKS)
    w.seq++
    w.works.push({ id: `o${w.seq}`, name: t.name, city: city.id, colony: col.id, stage: 0, stages: t.stages, next: day + t.days[0], traffic: t.after })
    news(s, `${t.stages[0]}: ${t.name} en ${col.name}, ${city.name}`, 'info')
  }
  for (const o of w.works) {
    if (day < o.next || o.stage >= o.stages.length - 1) continue
    o.stage++
    const t = WORKS.find(x => x.name === o.name)!
    const m = s.market?.colonies[o.colony]
    const col = cityOf(o.city).colonies.find(c => c.id === o.colony)!
    if (o.stage === 1) {
      o.next = day + t.days[1]
      m?.events.push({ text: `${o.name}: ${o.stages[1]}`, traffic: t.during, days: t.days[1] })
      news(s, `Empieza ${o.name.toLowerCase()} en ${col.name}: habrá menos paso de gente por ${t.days[1]} días`, 'bad')
    } else {
      if (m) m.traffic = Math.max(0.6, Math.min(1.6, m.traffic * (1 + t.after)))
      news(s, `${o.stages[o.stages.length - 1]} de ${o.name.toLowerCase()} en ${col.name}: ${t.after >= 0 ? 'llega mucha más gente' : 'te quita clientes'}`, t.after >= 0 ? 'good' : 'bad')
    }
  }
  worldDeals(s)
  w.works = w.works.filter(o => o.stage < o.stages.length - 1 || day - o.next < 30)
}

const IDEAS = [
  ['Mandado Ya', 'app de mandados en 20 minutos'], ['TacoBot', 'robot que prepara tacos al pastor'], ['Agua Viva', 'purificadora con energía solar'],
  ['PaseCar', 'renta de autos entre vecinos'], ['Nopalia', 'snacks saludables de nopal'], ['Tianguis Online', 'marketplace de tianguis'],
  ['ChambaYa', 'bolsa de trabajo para jóvenes'], ['MezcalHub', 'exportación de mezcal artesanal'], ['EcoBolsa', 'bolsas compostables para tiendas'],
  ['Carrera de Muertos', 'carrera nocturna de Día de Muertos en la capital'], ['CasaInversor', 'casas compartidas para inversionistas'], ['VerdeFarm', 'huertos verticales en azoteas'],
  ['PagoBarrio', 'pagos con celular para tienditas'], ['DronExpress', 'entregas con drones en colonias'], ['Cafecito MX', 'cafeterías en estaciones del Metro']
]
const FOUNDERS = ['Andrea', 'Luis', 'Mariana', 'Jorge', 'Fernanda', 'Diego', 'Ximena', 'Rodrigo', 'Valeria', 'Emilio']
export function worldDeals (s: GameState) {
  const w = initWorld(s); const day = Math.floor(s.minute / 1440)
  w.deals ??= []
  // nuevas propuestas de vez en cuando (más grandes si tu empresa es grande)
  if (w.deals.filter(d => !d.invested && d.result == null && d.expires > day).length < 3 && nextRandom(s) < 1 / 6) {
    const [name, idea] = pick(s, IDEAS); const scale = Math.max(1, Math.min(20, s.cash / 1_000_000))
    const ask = Math.round((150000 + nextRandom(s) * 600000) * scale / 10000) * 10000
    w.seq++
    w.deals.push({ id: `d${w.seq}`, name, idea, founder: pick(s, FOUNDERS), ask, pct: Math.round(5 + nextRandom(s) * 20), risk: +(0.3 + nextRandom(s) * 0.5).toFixed(2), stage: 0, next: 0, invested: false, result: null, expires: day + 10 })
  }
  for (const d of w.deals) {
    if (!d.invested || d.result != null || day < d.next) continue
    d.stage++; d.next = day + 7 + Math.floor(nextRandom(s) * 21)
    if (d.stage < DEAL_STAGES.length - 1) {
      if (nextRandom(s) < d.risk * 0.25) { d.result = 0; d.stage = DEAL_STAGES.length - 1; news(s, `${d.name} cerró: ${d.founder} no logró sacar adelante el proyecto. Perdiste tu inversión`, 'bad'); continue }
      news(s, `${d.name} avanza a la etapa de ${DEAL_STAGES[d.stage].toLowerCase()}`, 'info')
    } else {
      const mult = nextRandom(s) < d.risk ? +(nextRandom(s) * 0.8).toFixed(2) : +(1.5 + nextRandom(s) * 6 * (1 + d.risk)).toFixed(1)
      d.result = mult; s.cash += d.ask * mult
      news(s, mult >= 1 ? `¡${d.name} fue un éxito! Tu inversión se multiplicó ×${mult}` : `${d.name} no despegó: recuperaste solo ${Math.round(mult * 100)} %`, mult >= 1 ? 'good' : 'bad')
    }
  }
  w.deals = w.deals.filter(d => d.invested ? (d.result == null || day - d.next < 60) : d.expires > day)
}
export function investDeal (s: GameState, id: string): Result {
  const d = initWorld(s).deals?.find(x => x.id === id); if (!d || d.invested) return fail('Ya no está disponible')
  if (s.cash < d.ask) return fail('No alcanza el efectivo')
  s.cash -= d.ask; d.invested = true; d.next = Math.floor(s.minute / 1440) + 7
  return ok(`Invertiste en ${d.name}: ahora tienes el ${d.pct} % del proyecto`)
}

// donar a una campaña: sube su intención de voto, con riesgo de escándalo
export function donate (s: GameState, i: number): Result {
  const w = initWorld(s); const e = w.election
  if (!e) return fail('No hay elecciones en curso')
  if (e.donated != null) return fail('Ya donaste en esta elección')
  if (s.cash < 500000) return fail('Una donación cuesta $500,000')
  s.cash -= 500000; e.donated = i; e.candidates[i].poll += 8
  return ok(`Donaste a ${e.candidates[i].party}. Sube en las encuestas… ojalá nadie se entere`)
}
