import type { CategoryId } from '../data/categories'
import type { FormatId } from '../data/formats'

export type CatMap<T> = Record<CategoryId, T>

export interface Cashier { id: number; name: string; stars: number; salary: number }
export type Candidate = Omit<Cashier, 'id'>

export interface BasketLine { cat: CategoryId; qty: number }
export interface QueuedCustomer { id: number; arrivedAt: number; patience: number; basket: BasketLine[] }
export interface Order { id: number; arrivesAt: number; items: Partial<CatMap<number>>; cost: number }

export interface DayStats {
  sales: number; commissions: number; cogs: number; fees: number
  arrivals: number; tickets: number; abandoned: number; lostItems: number
  waitSum: number; maxQueue: number
  catUnits: Partial<CatMap<number>>
}
export interface DayReport {
  day: number
  sales: number; commissions: number; cogs: number; payroll: number; rent: number; power: number
  shrink: number; upkeep: number; fees: number; interest: number; profit: number
  tickets: number; abandoned: number; satisfaction: number
}

export interface Store {
  id: number
  cityId: string
  colonyId: string
  formatId: FormatId
  openedDay: number
  margins: CatMap<number>
  cashiers: Cashier[]
  selfCheckouts: number
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

export interface GameState {
  version: number
  seed: number
  rng: number
  company: string
  minute: number // minutos de juego desde el inicio (entero)
  carry: number // fracción de minuto pendiente
  cash: number
  loan: number
  stores: Store[]
  candidates: Candidate[]
  nextId: number
  log: LogEntry[]
  reports: DayReport[]
  todayFees: number
}

export type GameEvent =
  | { type: 'arrive'; storeId: number; customerId: number }
  | { type: 'balk'; storeId: number }
  | { type: 'sale'; storeId: number; customerId: number; amount: number; items: number; happy: boolean }
  | { type: 'abandon'; storeId: number; customerId: number }
  | { type: 'delivery'; storeId: number }
  | { type: 'stockout'; storeId: number; cat: CategoryId }
  | { type: 'dayEnd'; report: DayReport }
  | { type: 'log'; entry: LogEntry }

export interface Result<T = undefined> { ok: boolean; msg: string; data?: T }
