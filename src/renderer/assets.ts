// Carga del arte generado (WebP). En el build de un solo archivo se incrustan como data URI.
const urls = import.meta.glob('../assets/**/*.{webp,png,jpg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function assetUrl (path: string) {
  return urls[`../assets/${path}`] ?? ''
}
const cache = new Map<string, HTMLImageElement>()
// devuelve la imagen solo cuando ya cargó; mientras tanto el renderer usa su dibujo de respaldo
export function sprite (path: string): HTMLImageElement | null {
  let im = cache.get(path)
  if (!im) {
    im = new Image()
    im.decoding = 'async'
    im.src = assetUrl(path)
    cache.set(path, im)
  }
  return im.complete && im.naturalWidth ? im : null
}
export function preload (paths: string[]) { for (const p of paths) sprite(p) }
