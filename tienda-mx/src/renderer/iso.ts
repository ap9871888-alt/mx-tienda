// Proyección isométrica 2:1 y primitivas de dibujo con contorno oscuro (estilo vector limpio).
export const TW = 64
export const TH = 32
export const OUTLINE = '#2B2D33'

export interface Camera { ox: number; oy: number; zoom: number }

export function toScreen (cam: Camera, x: number, y: number, z = 0) {
  return {
    sx: cam.ox + (x - y) * (TW / 2) * cam.zoom,
    sy: cam.oy + ((x + y) * (TH / 2) - z) * cam.zoom
  }
}

export function shade (hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

export function poly (ctx: CanvasRenderingContext2D, pts: { sx: number; sy: number }[], fill: string, stroke: string | null = OUTLINE, lw = 1) {
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke() }
}

// rombo de piso
export function tile (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, fill: string, stroke: string | null = null) {
  poly(ctx, [toScreen(cam, x, y), toScreen(cam, x + 1, y), toScreen(cam, x + 1, y + 1), toScreen(cam, x, y + 1)], fill, stroke, 0.6)
}

// caja isométrica con caras visibles (+x a la derecha, +y a la izquierda)
export function box (ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, w: number, d: number, h: number, color: string,
  opts: { left?: boolean; right?: boolean; top?: boolean; lw?: number } = {}) {
  const { left = true, right = true, top = true, lw = 1 } = opts
  const hz = h * TH
  if (left) poly(ctx, [toScreen(cam, x, y + d), toScreen(cam, x + w, y + d), toScreen(cam, x + w, y + d, hz), toScreen(cam, x, y + d, hz)], shade(color, -0.12), OUTLINE, lw)
  if (right) poly(ctx, [toScreen(cam, x + w, y + d), toScreen(cam, x + w, y), toScreen(cam, x + w, y, hz), toScreen(cam, x + w, y + d, hz)], shade(color, -0.28), OUTLINE, lw)
  if (top) poly(ctx, [toScreen(cam, x, y, hz), toScreen(cam, x + w, y, hz), toScreen(cam, x + w, y + d, hz), toScreen(cam, x, y + d, hz)], shade(color, 0.12), OUTLINE, lw)
}

// cuadrilátero sobre la cara izquierda (plano y = yFace), de x0 a x1 y de z0 a z1 (en "tiles" de altura)
export function leftFaceQuad (ctx: CanvasRenderingContext2D, cam: Camera, yFace: number, x0: number, x1: number, z0: number, z1: number, fill: string, stroke: string | null = OUTLINE) {
  poly(ctx, [toScreen(cam, x0, yFace, z0 * TH), toScreen(cam, x1, yFace, z0 * TH), toScreen(cam, x1, yFace, z1 * TH), toScreen(cam, x0, yFace, z1 * TH)], fill, stroke, 0.8)
}
export function rightFaceQuad (ctx: CanvasRenderingContext2D, cam: Camera, xFace: number, y0: number, y1: number, z0: number, z1: number, fill: string, stroke: string | null = OUTLINE) {
  poly(ctx, [toScreen(cam, xFace, y0, z0 * TH), toScreen(cam, xFace, y1, z0 * TH), toScreen(cam, xFace, y1, z1 * TH), toScreen(cam, xFace, y0, z1 * TH)], fill, stroke, 0.8)
}

export function roundRect (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
