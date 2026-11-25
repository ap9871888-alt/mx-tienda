import type { CategoryId } from '../data/categories'
import type { FormatId } from '../data/formats'

export type CatMap<T> = Record<CategoryId, T>

export interface Cashier { id: number; name: string; stars: number; salary: number }
export type Candidate = Omit<Cashier, 'id'>

export interface BasketLine { cat: CategoryId; qty: number }
export interface QueuedCustomer { id: number; arrivedAt: number; patience: number; basket: BasketLine[] }
export interface Order { id: number; arrivesAt: number; items: Partial<CatMap<number>>; cost: number; via: 'mayorista' | 'cedis'; delayed?: boolean }

export interface DayStats {
  sales: number; commissions: number; cogs: number; fees: number
  arrivals: number; tickets: number; abandoned: number; lostItems: number
  waitSum: number; maxQueue: number
  catUnits: Partial<CatMap<number>>
}
export interface DayReport {
  day: number
  sales: number; commissions: number; cogs: number; payroll: number; rent: number; power: number
  shrink: number; upkeep: number; fees: number; interest: number; logistics: number; profit: number
  tickets: number; abandoned: number; satisfaction: number
}

export interface Store {
  id: number
  label: string // dirección corta del local
  cityId: string
  colonyId: string
  formatId: FormatId
  openedDay: number
  margins: CatMap<number>
  cashiers: Cashier[]
  selfCheckouts: number
  remodel?: number
  equipment?: string[]
  works?: { to: number; start: number; end: number } | null
  riders?: number
  deliveries?: number // remodelación en obra
  security: number // 0–2
  cleaning: number // 0–2
  bonus: boolean
  autoReorder: boolean
  inventory: CatMap<number>
  orders: Order[]
  queue: QueuedCustomer[]
  serviceCarry: number
  satisfaction: number // 0–100
  reputation: number // 0–5 estrellas
  today: DayStats
  history: DayReport[]
}

export interface LogEntry { minute: number; text: string; kind: 'info' | 'good' | 'bad' }

export interface ColonyMarket { traffic: number; wealth: number; trend: number; events: { text: string; traffic: number; days: number }[]; war: number }
export interface RivalChain { id: string; name: string; color: string; style: 'precio' | 'expansion' | 'premium' | 'barrio'; stores: Record<string, number>; aggression: number }
export interface FundState { nav: number; hist: number[]; units: number; invested: number }
export interface MarketState { colonies: Record<string, ColonyMarket>; rivals: RivalChain[]; funds: Record<string, FundState>; regime: number; insightsDay: number }

export interface GameState {
  version: number
  startYear: number
  cities: string[] // ciudades desbloqueadas
  seed: number
  rng: number
  company: string
  profile?: CompanyProfile
  here?: string // ciudad donde estás (para operar otra ciudad hay que viajar)
  trip?: { to: string; arrive: number; mode: 'bus' | 'avion' } | null
  tutorial?: number
  products?: { id: string; quality: number; sold: number }[]
  dilemma?: { id: string; colonies: string[] } | null
  offer?: { who: number; pct: number; amount: number; tries: number } | null
  equity?: number // parte de la empresa que sigue siendo tuya (1 = 100 %)
  investors?: { who: number; pct: number; amount: number }[]
  lifestyle?: string[]
  stocks?: Record<string, { price: number; hist: number[]; shares: number; cost: number }>
  founder?: { age: number; skin: string; street: boolean }
  ipo?: { day: number; price0: number; hist: number[]; price: number; own: number } | null
  weekly?: WeeklyReport | null
  milestone?: number | null
  milestonesHit?: number
  directors?: Partial<Record<'ops' | 'com' | 'rh' | 'dg', boolean>>
  dgBudget?: boolean
  social?: string[]
  morale?: number
  world?: import('./world').WorldState
  lab?: import('./lab').LabState
  subsidiaries?: { name: string; color: string; stores: number; day: number }[]
  minute: number // minutos de juego desde el inicio (entero)
  carry: number // fracción de minuto pendiente
  cash: number
  loan: number
  office?: number // nivel de oficina corporativa
  terms?: { id: string; balance: number; daily: number; rate: number }[] // créditos a plazo
  stores: Store[]
  candidates: Candidate[]
  nextId: number
  log: LogEntry[]
  reports: DayReport[]
  todayFees: number
  cedis: { level: number; trucks: number; builtDay: number } | null
  labels: string[]
  tripsToday: number
  market: MarketState
}

export type GameEvent =
  | { type: 'arrive'; storeId: number; customerId: number }
  | { type: 'balk'; storeId: number }
  | { type: 'sale'; storeId: number; customerId: number; amount: number; items: number; happy: boolean }
  | { type: 'abandon'; storeId: number; customerId: number }
  | { type: 'delivery'; storeId: number; via: 'mayorista' | 'cedis' }
  | { type: 'stockout'; storeId: number; cat: CategoryId }
  | { type: 'dayEnd'; report: DayReport }
  | { type: 'log'; entry: LogEntry }

export interface Result<T = undefined> { ok: boolean; msg: string; data?: T }

export type Difficulty = 'facil' | 'normal' | 'dificil'
export interface CompanyProfile { icon: string; color: string; founder: 'h' | 'm'; perk: 'ventas' | 'logistica'; difficulty: Difficulty; street?: boolean; age?: number; skin?: string; character?: string; capital?: number }

export interface WeeklyReport {
  week: number; sales: number; profit: number; prevProfit: number | null; tickets: number; abandoned: number
  best: { id: number; name: string; profit: number } | null; worst: { id: number; name: string; profit: number } | null
  cash: number; worth: number; satisfaction: number; tips: string[]
}
