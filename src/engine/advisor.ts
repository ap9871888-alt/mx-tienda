// Asesor "¿qué hago ahora?": revisa toda la empresa y devuelve las acciones más importantes, en orden.
import { formatOf } from '../data/formats'
import { PRODUCT_CATEGORIES } from '../data/categories'
import { dateOfDay, dayOf } from './time'
import { shelfCapacity } from './pricing'
import { upcomingEvents } from './empire'
import { storeShort } from './game'
import { isSealed, missingPermits } from './upkeep'
import type { GameState } from './types'

export interface Todo { prio: number; icon: string; text: string; tab: string; storeId?: number }

export function whatToDo (s: GameState): Todo[] {
  const out: Todo[] = []
  if (!s.stores.length) out.push({ prio: 100, icon: 'ic-mapa', text: 'Abre tu primera tienda en una colonia con mucha gente.', tab: 'mapa' })
  for (const st of s.stores) {
    const f = formatOf(st.formatId); const last = st.history[st.history.length - 1]
    if (!st.cashiers.length && !f.ownerSells) out.push({ prio: 95, icon: 'ic-personal', text: `${storeShort(st)} no tiene cajero: nadie puede pagar.`, tab: 'tienda', storeId: st.id })
    if (last && last.abandoned > Math.max(4, last.tickets * 0.08)) out.push({ prio: 80, icon: 'ic-personal', text: `En ${storeShort(st)} se fueron ${last.abandoned} clientes por la fila. Contrata o pon autocobro.`, tab: 'tienda', storeId: st.id })
    if (PRODUCT_CATEGORIES.some(c => st.inventory[c.id] < shelfCapacity(st) * 0.12) && !st.orders.length) out.push({ prio: 75, icon: 'ic-logistica', text: `A ${storeShort(st)} se le acaba la mercancía.`, tab: 'tienda', storeId: st.id })
    if (isSealed(s, st)) out.push({ prio: 97, icon: 'px-candado', text: `${storeShort(st)} está clausurada. Tramita sus permisos para que no vuelva a pasar.`, tab: 'tienda', storeId: st.id })
    else if (!f.ownerSells && missingPermits(s, st).some(p => st.permits?.[p.id] == null)) out.push({ prio: 78, icon: 'pi-libreta_tareas', text: `${storeShort(st)} no tiene todos sus permisos: un inspector podría clausurarla.`, tab: 'tienda', storeId: st.id })
    if ((st.dirt ?? 0) > 55) out.push({ prio: 65, icon: 'px-brillos_nuevo', text: `${storeShort(st)} está sucia y los clientes lo notan: mándala limpiar.`, tab: 'tienda', storeId: st.id })
    if ((st.wear ?? 0) > 70) out.push({ prio: 40, icon: 'px-cono_obra', text: `La fachada de ${storeShort(st)} se ve vieja: píntala.`, tab: 'tienda', storeId: st.id })
    const week = st.history.slice(-7).reduce((a, h) => a + h.profit, 0)
    if (st.history.length >= 7 && week < 0) out.push({ prio: 60, icon: 'ic-precios', text: `${storeShort(st)} perdió dinero esta semana: revisa precios o equipo.`, tab: 'tienda', storeId: st.id })
  }
  if (s.cash < 30000 && s.stores.length) out.push({ prio: 85, icon: 'ic-banco', text: 'Tu efectivo está muy bajo: pide un crédito o baja gastos.', tab: 'banco' })
  if (s.offer) out.push({ prio: 70, icon: 'ic-trato', text: 'Un inversionista quiere comprar parte de tu empresa.', tab: 'inversion' })
  const ev = upcomingEvents(dateOfDay(dayOf(s.minute)), 10).filter(e => e.mult > 0.1)[0]
  if (ev) out.push({ prio: 50, icon: 'ic-calendario', text: `Pronto viene ${ev.name}: ten mercancía y cajeros de sobra.`, tab: 'calendario' })
  if (s.cash > 1_500_000 && s.stores.length < 40) out.push({ prio: 45, icon: 'ic-mapa', text: 'Tienes dinero de sobra: abre otra tienda.', tab: 'mapa' })
  if (s.cash > 800000 && !s.lab?.active && (s.lab?.done.length ?? 0) < 7) out.push({ prio: 35, icon: 'ic-interior', text: 'Tu laboratorio está libre: inventa algo nuevo.', tab: 'laboratorio' })
  if ((s.world?.deals ?? []).some(d => !d.invested && d.result == null) && s.cash > 500000) out.push({ prio: 30, icon: 'ic-dinero', text: 'Hay proyectos nuevos buscando inversión.', tab: 'inversion' })
  if (s.stores.length >= 3 && !(s.social ?? []).length) out.push({ prio: 25, icon: 'ic-personal', text: 'Apoya a tu comunidad: los programas sociales suben tu reputación.', tab: 'directivos' })
  return out.sort((a, b) => b.prio - a.prio).slice(0, 3)
}
