// Sprites procedurales fotograma a fotograma: personas (caminar 6 fotogramas, 4 direcciones isométricas),
// cajero (4 fotogramas), repartidor (4 fotogramas) y vehículos. Todo se dibuja con contorno oscuro y colores planos.
import { box, shade, OUTLINE, type Camera, toScreen, TH } from './iso'

export type Dir = 'SE' | 'SW' | 'NW' | 'NE' // SE: +x · SW: +y · NW: −x · NE: −y
export interface Look { skin: string; shirt: string; pants: string; hair: string; long: boolean }

const SKINS = ['#8D5524', '#A0673D', '#C68642', '#B5784A', '#7A4A2A', '#D19A6A']
const SHIRTS = ['#D63B2F', '#1B4D8F', '#2E7D5B', '#F2B705', '#7A5BA6', '#E8E4DA', '#E26D5A', '#3E8DA8', '#5B5F6B', '#C44E8A']
const PANTS = ['#2F4A7A', '#3A3D45', '#5A4632', '#2F5C4A', '#4B4F8F']
const HAIRS = ['#1E1712', '#2E2118', '#3B2A1E', '#5A3A22', '#141414']
export function randomLook (r: () => number): Look {
  const p = <T>(a: T[]) => a[Math.floor(r() * a.length)]
  return { skin: p(SKINS), shirt: p(SHIRTS), pants: p(PANTS), hair: p(HAIRS), long: r() < 0.45 }
}

export function dirFrom (dx: number, dy: number): Dir {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'SE' : 'NW'
  return dy >= 0 ? 'SW' : 'NE'
}

function limb (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + 1.6
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
  ctx.strokeStyle = color; ctx.lineWidth = w
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
}
function blob (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke()
}
function rect (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, r = 1.5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1; ctx.stroke()
}

export interface PersonOpts { bag?: boolean; carry?: 'box' | 'dolly' | null; uniform?: boolean }

// Persona con los pies en (sx, sy). frame: 0–5 caminando, −1 parada.
export function drawPerson (ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, dir: Dir, frame: number, look: Look, opts: PersonOpts = {}) {
  const front = dir === 'SE' || dir === 'SW'
  const mirror = dir === 'SW' || dir === 'NW'
  const swing = frame < 0 ? 0 : Math.sin((frame / 6) * Math.PI * 2)
  const bob = frame < 0 ? 0 : Math.abs(Math.cos((frame / 6) * Math.PI * 2)) * 0.8 * s
  const shirt = opts.uniform ? '#E9DCC4' : look.shirt
  const pants = opts.uniform ? '#2F4A7A' : look.pants
  ctx.save()
  ctx.translate(sx, sy)
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.22)'
  ctx.beginPath(); ctx.ellipse(0, 0, 6 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill()
  if (mirror) ctx.scale(-1, 1)
  ctx.translate(0, -bob)
  const hipY = -11 * s; const shY = -21 * s
  const legW = 2.6 * s; const armW = 2.1 * s
  const fwd = 3.6 * s
  // pierna y brazo de atrás
  limb(ctx, -0.6 * s, hipY, -swing * fwd - 0.6 * s, -0.6 * s, legW, shade(pants, -0.25))
  if (!opts.carry) limb(ctx, -1.5 * s, shY + 1.5 * s, swing * 3 * s - 1.5 * s, -12.5 * s, armW, shade(shirt, -0.2))
  // torso
  rect(ctx, -4.2 * s, -23.5 * s, 8.4 * s, 13.5 * s, shirt, 3 * s)
  if (opts.uniform) { ctx.fillStyle = '#D63B2F'; ctx.fillRect(-4.2 * s, -23.5 * s, 8.4 * s, 2.4 * s) }
  // cabeza
  blob(ctx, 0.6 * s, -28 * s, 4.3 * s, 4.6 * s, look.skin)
  ctx.fillStyle = look.hair
  ctx.beginPath()
  if (front) ctx.ellipse(-0.2 * s, -30.6 * s, 4.4 * s, 2.6 * s, 0, Math.PI, Math.PI * 2)
  else ctx.ellipse(0.4 * s, -29 * s, 4.5 * s, 4.2 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  if (look.long) { ctx.fillRect(-4 * s, -30 * s, 2.6 * s, front ? 6 * s : 8 * s) }
  if (opts.uniform) { ctx.fillStyle = '#1B4D8F'; ctx.beginPath(); ctx.ellipse(0.4 * s, -31.4 * s, 4.7 * s, 2 * s, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(1 * s, -31.6 * s, 5.4 * s, 1.4 * s) }
  if (front) { ctx.fillStyle = OUTLINE; ctx.fillRect(2.4 * s, -28.6 * s, 1.1 * s, 1.3 * s) }
  // pierna y brazo de enfrente
  limb(ctx, 0.8 * s, hipY, swing * fwd + 0.8 * s, -0.4 * s, legW, pants)
  ctx.fillStyle = '#2B2D33'
  ctx.fillRect(swing * fwd + 0.8 * s - 1.4 * s, -1.4 * s, 3.6 * s, 1.6 * s) // zapato
  if (opts.carry === 'box') {
    limb(ctx, 1 * s, shY + 1.5 * s, 6 * s, -17 * s, armW, shirt)
    rect(ctx, 2.5 * s, -22 * s, 8 * s, 7 * s, '#C8955A', 1)
    ctx.strokeStyle = '#8A5F33'; ctx.beginPath(); ctx.moveTo(6.5 * s, -22 * s); ctx.lineTo(6.5 * s, -15 * s); ctx.stroke()
  } else if (opts.carry === 'dolly') {
    limb(ctx, 1 * s, shY + 1.5 * s, 7 * s, -15 * s, armW, shirt)
    ctx.strokeStyle = '#5B5F6B'; ctx.lineWidth = 1.6 * s
    ctx.beginPath(); ctx.moveTo(7 * s, -15 * s); ctx.lineTo(11 * s, -1 * s); ctx.lineTo(17 * s, -1 * s); ctx.stroke()
    rect(ctx, 10 * s, -14 * s, 7 * s, 6 * s, '#C8955A', 1)
    rect(ctx, 10.5 * s, -8 * s, 7 * s, 6.5 * s, '#B9864C', 1)
    blob(ctx, 11 * s, 0, 1.7 * s, 1.7 * s, '#2B2D33')
  } else {
    const hx = -swing * 3 * s + 1.5 * s; const hy = -12.5 * s
    limb(ctx, 1.5 * s, shY + 1.5 * s, hx, hy, armW, shirt)
    if (opts.bag) {
      rect(ctx, hx - 2.8 * s, hy + 0.5 * s, 5.6 * s, 6.5 * s, '#D63B2F', 1)
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(hx, hy + 0.8 * s, 1.6 * s, Math.PI, 0); ctx.stroke()
    }
  }
  ctx.restore()
}

// Cajero detrás del mostrador, 4 fotogramas: escaneo, terminal, ticket, despedida.
export function drawCashier (ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, frame: number) {
  ctx.save(); ctx.translate(sx, sy)
  const look: Look = { skin: '#B5784A', shirt: '#E9DCC4', pants: '#333', hair: '#1E1712', long: false }
  rect(ctx, -5 * s, -14 * s, 10 * s, 12 * s, look.shirt, 3 * s)
  ctx.fillStyle = '#D63B2F'; ctx.fillRect(-5 * s, -14 * s, 10 * s, 2.2 * s)
  blob(ctx, 0, -18.5 * s, 4.2 * s, 4.4 * s, look.skin)
  ctx.fillStyle = look.hair; ctx.beginPath(); ctx.ellipse(-0.4 * s, -21 * s, 4.3 * s, 2.4 * s, 0, Math.PI, Math.PI * 2); ctx.fill()
  ctx.fillStyle = OUTLINE; ctx.fillRect(1.6 * s, -19 * s, 1 * s, 1.2 * s)
  // mostrador
  rect(ctx, -9 * s, -5 * s, 20 * s, 6 * s, '#E6E0D4', 1)
  rect(ctx, 6 * s, -10 * s, 4 * s, 5 * s, '#2B2D33', 1) // terminal
  const arm = (x: number, y: number) => limb(ctx, 2 * s, -11 * s, x * s, y * s, 2 * s, look.shirt)
  if (frame === 0) {
    arm(6, -8); ctx.strokeStyle = 'rgba(255,40,40,.85)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(6 * s, -8 * s); ctx.lineTo(10 * s, -3 * s); ctx.stroke()
    rect(ctx, 3 * s, -8 * s, 3 * s, 3 * s, '#F2B705', 0.5)
  } else if (frame === 1) arm(7.5, -8.5)
  else if (frame === 2) { arm(9, -12); ctx.fillStyle = '#fff'; ctx.fillRect(8.4 * s, -15 * s, 2.4 * s, 4 * s) } else { arm(4.5, -22); blob(ctx, 4.5 * s, -22.5 * s, 1.4 * s, 1.4 * s, look.skin) }
  ctx.restore()
}

export type VehicleKind = 'car' | 'taxi' | 'van' | 'bus' | 'moto' | 'vocho'
export interface VehicleLook { kind: VehicleKind; color: string }
const CAR_COLORS = ['#C0392B', '#2E86C1', '#F2F3F4', '#5D6D7E', '#1E8449', '#7D3C98', '#D4AC0D', '#A04000']
export function randomVehicle (r: () => number): VehicleLook {
  const x = r()
  if (x < 0.25) return { kind: 'taxi', color: '#E5649B' }
  if (x < 0.38) return { kind: 'vocho', color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] }
  if (x < 0.5) return { kind: 'moto', color: '#F28C05' }
  return { kind: 'car', color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] }
}
export function vehicleLength (k: VehicleKind) { return k === 'bus' ? 2.6 : k === 'van' ? 1.25 : k === 'moto' ? 0.55 : 0.95 }

// Vehículo centrado en (x, y), sobre el eje 'x' o 'y'.
export function drawVehicle (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, axis: 'x' | 'y', v: VehicleLook, lightsOn: boolean) {
  const L = vehicleLength(v.kind)
  const W = v.kind === 'bus' ? 0.62 : v.kind === 'moto' ? 0.22 : v.kind === 'van' ? 0.55 : 0.48
  const H = v.kind === 'bus' ? 0.72 : v.kind === 'van' ? 0.62 : v.kind === 'moto' ? 0.2 : 0.26
  const [w, d] = axis === 'x' ? [L, W] : [W, L]
  const bx = x - w / 2; const by = y - d / 2
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.2)'
  const p = [toScreen(cam, bx, by), toScreen(cam, bx + w, by), toScreen(cam, bx + w, by + d), toScreen(cam, bx, by + d)]
  ctx.beginPath(); ctx.moveTo(p[0].sx, p[0].sy + 2); for (const q of p.slice(1)) ctx.lineTo(q.sx, q.sy + 2); ctx.fill()
  if (v.kind === 'moto') {
    box(ctx, cam, bx, by, w, d, H, '#2B2D33', { lw: 0.8 })
    box(ctx, cam, x - 0.1, y - 0.1, 0.2, 0.2, H + 0.32, v.color, { lw: 0.8 }) // caja de reparto
    const s = toScreen(cam, x, y, H * TH)
    drawPerson(ctx, s.sx, s.sy + 6 * cam.zoom, cam.zoom * 0.7, axis === 'x' ? 'SE' : 'SW', -1, { skin: '#A0673D', shirt: '#2B2D33', pants: '#2B2D33', hair: '#111', long: false })
    return
  }
  const body = v.kind === 'taxi' ? '#E5649B' : v.color
  box(ctx, cam, bx, by, w, d, H, body, { lw: 0.9 })
  if (v.kind === 'taxi') box(ctx, cam, bx, by, w, d, H * 0.45, '#F7F5F0', { lw: 0.6 })
  if (v.kind === 'van') {
    // franja corporativa
    if (axis === 'x') box(ctx, cam, bx, by, w, d, H * 0.35, '#FFFFFF', { lw: 0.6, top: false })
    const cab = axis === 'x' ? { x: bx + w * 0.72, y: by, w: w * 0.28, d } : { x: bx, y: by + d * 0.72, w, d: d * 0.28 }
    box(ctx, cam, cab.x, cab.y, cab.w, cab.d, H * 0.95, '#BFD7EA', { lw: 0.6, top: false, left: axis === 'x', right: axis === 'y' })
    box(ctx, cam, bx, by, w, d, H, v.color, { left: false, right: false, lw: 0.8 })
  } else if (v.kind === 'bus') {
    box(ctx, cam, bx, by, w, d, H * 0.55, body, { lw: 0.6, top: false })
    const s1 = toScreen(cam, bx, by + d, H * 0.6 * TH); const s2 = toScreen(cam, bx + w, by + d, H * 0.6 * TH)
    ctx.strokeStyle = '#BFD7EA'; ctx.lineWidth = 5 * cam.zoom; ctx.beginPath(); ctx.moveTo(s1.sx, s1.sy - 6 * cam.zoom); ctx.lineTo(s2.sx, s2.sy - 6 * cam.zoom); ctx.stroke()
  } else {
    const cw = axis === 'x' ? w * 0.55 : w * 0.9; const cd = axis === 'x' ? d * 0.9 : d * 0.55
    box(ctx, cam, x - cw / 2, y - cd / 2, cw, cd, H + (v.kind === 'vocho' ? 0.2 : 0.18), '#BFD7EA', { lw: 0.8 })
    box(ctx, cam, x - cw / 2, y - cd / 2, cw, cd, H + (v.kind === 'vocho' ? 0.2 : 0.18), body, { left: false, right: false, lw: 0.8 })
  }
  if (lightsOn) {
    const f = toScreen(cam, axis === 'x' ? bx + w : x, axis === 'x' ? y : by + d, 0.15 * TH)
    ctx.fillStyle = '#FFF3B0'; ctx.beginPath(); ctx.arc(f.sx, f.sy, 2 * cam.zoom, 0, Math.PI * 2); ctx.fill()
  }
}

export function drawJacaranda (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number) {
  const b = toScreen(cam, x, y)
  const z = cam.zoom
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(b.sx, b.sy, 16 * z, 7 * z, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5 * z; ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx, b.sy - 22 * z); ctx.stroke()
  ctx.strokeStyle = '#6B4A2E'; ctx.lineWidth = 3.4 * z; ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx, b.sy - 22 * z); ctx.stroke()
  const blobs: [number, number, number, string][] = [[-9, -30, 10, '#8E63C9'], [9, -31, 10, '#9B6FD1'], [0, -40, 12, '#A97FDB'], [-4, -27, 8, '#B48BE0'], [6, -24, 7, '#8E63C9']]
  for (const [dx, dy, r, c] of blobs) {
    ctx.beginPath(); ctx.arc(b.sx + dx * z, b.sy + dy * z, r * z, 0, Math.PI * 2)
    ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke()
  }
}
export function drawLamp (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number) {
  const b = toScreen(cam, x, y); const z = cam.zoom
  ctx.strokeStyle = '#4A4E57'; ctx.lineWidth = 2.2 * z
  ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx, b.sy - 46 * z); ctx.lineTo(b.sx + 8 * z, b.sy - 48 * z); ctx.stroke()
  ctx.fillStyle = '#E6E0D4'; ctx.fillRect(b.sx + 5 * z, b.sy - 49 * z, 7 * z, 3 * z)
  return { sx: b.sx + 8 * z, sy: b.sy - 46 * z }
}
export function drawTrafficLight (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, state: 'green' | 'yellow' | 'red') {
  const b = toScreen(cam, x, y); const z = cam.zoom
  ctx.strokeStyle = '#3A3D45'; ctx.lineWidth = 2.2 * z
  ctx.beginPath(); ctx.moveTo(b.sx, b.sy); ctx.lineTo(b.sx, b.sy - 34 * z); ctx.stroke()
  rect(ctx, b.sx - 3.5 * z, b.sy - 50 * z, 7 * z, 17 * z, '#2B2D33', 2)
  const cols: Record<string, string> = { red: '#FF3B30', yellow: '#FFCC00', green: '#34C759' }
  ;(['red', 'yellow', 'green'] as const).forEach((c, i) => {
    ctx.fillStyle = state === c ? cols[c] : '#4A4A4A'
    ctx.beginPath(); ctx.arc(b.sx, b.sy - (46 - i * 5) * z, 1.8 * z, 0, Math.PI * 2); ctx.fill()
  })
  return { sx: b.sx, sy: b.sy - (state === 'red' ? 46 : state === 'yellow' ? 41 : 36) * z, color: cols[state] }
}
export function drawBusStop (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number) {
  box(ctx, cam, x, y, 1.2, 0.12, 0.9, '#BFD7EA', { top: false, lw: 0.8 })
  box(ctx, cam, x - 0.05, y - 0.1, 1.3, 0.45, 0.08, '#D63B2F', { lw: 0.8 })
  const z = cam.zoom; const p = toScreen(cam, x + 0.05, y - 0.1, 0.9 * TH)
  ctx.fillStyle = '#D63B2F'; ctx.fillRect(p.sx, p.sy - 2 * z, 10 * z, 3 * z)
  box(ctx, cam, x + 0.2, y + 0.15, 0.8, 0.2, 0.25, '#8A6A4A', { lw: 0.7 })
}
export function drawVendor (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, t: number) {
  box(ctx, cam, x, y, 0.9, 0.6, 0.45, '#8A6A4A', { lw: 0.8 })
  const z = cam.zoom
  const corners = [toScreen(cam, x - 0.1, y - 0.1, 1.05 * TH), toScreen(cam, x + 1, y - 0.1, 1.05 * TH), toScreen(cam, x + 1, y + 0.7, 1.05 * TH), toScreen(cam, x - 0.1, y + 0.7, 1.05 * TH)]
  ctx.beginPath(); ctx.moveTo(corners[0].sx, corners[0].sy); for (const c of corners.slice(1)) ctx.lineTo(c.sx, c.sy); ctx.closePath()
  ctx.fillStyle = '#E6007E'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke()
  const v = toScreen(cam, x + 0.45, y + 0.75)
  drawPerson(ctx, v.sx, v.sy, z * 0.9, 'SW', Math.floor(t * 2) % 2 ? -1 : -1, { skin: '#8D5524', shirt: '#F2B705', pants: '#2F4A7A', hair: '#111', long: true })
  const steam = toScreen(cam, x + 0.3, y + 0.3, 0.5 * TH)
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5 * z
  ctx.beginPath(); ctx.moveTo(steam.sx, steam.sy); ctx.quadraticCurveTo(steam.sx + 4 * z * Math.sin(t * 3), steam.sy - 8 * z, steam.sx, steam.sy - 14 * z); ctx.stroke()
}
