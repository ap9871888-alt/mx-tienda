import { START_DATE, MONTHS, WEEKDAYS, QUINCENA_BOOST, WEEKEND_BOOST } from '../data/calendar'

export const MIN_PER_DAY = 1440
export const dayOf = (minute: number) => Math.floor(minute / MIN_PER_DAY)
export const minuteOfDay = (minute: number) => ((minute % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY
export const hourOf = (minute: number) => Math.floor(minuteOfDay(minute) / 60)
// año de fundación de la partida en curso (lo fija el motor al crear, cargar o avanzar una partida)
let epochYear = START_DATE.year
export const setEpoch = (year: number) => { epochYear = year }
export const getEpoch = () => epochYear
export const dateOfDay = (day: number) => new Date(Date.UTC(epochYear, START_DATE.month, START_DATE.day + day))

export function clockLabel (minute: number) {
  const m = minuteOfDay(minute)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
export function dateLabel (day: number) {
  const d = dateOfDay(day)
  return { date: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, weekday: WEEKDAYS[d.getUTCDay()] }
}
export function isQuincena (day: number) {
  const d = dateOfDay(day); const dd = d.getUTCDate()
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  return dd === 15 || dd === Math.min(30, last)
}
export function dayMultiplier (day: number) {
  const dow = dateOfDay(day).getUTCDay()
  let m = 1
  const tags: string[] = []
  if (isQuincena(day)) { m *= 1 + QUINCENA_BOOST; tags.push('Quincena +35 %') }
  if (dow === 0 || dow === 6) { m *= 1 + WEEKEND_BOOST; tags.push('Fin de semana') }
  return { mult: m, tags }
}
// 0 = medianoche, 0.5 = mediodía. Para el ciclo día/noche del renderer.
export const daylight = (minute: number) => {
  const h = minuteOfDay(minute) / 60
  if (h < 5.5 || h > 20.5) return 0
  if (h < 7.5) return (h - 5.5) / 2
  if (h > 18.5) return (20.5 - h) / 2
  return 1
}
