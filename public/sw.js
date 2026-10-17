// Service worker: deja usar la app sin conexión después de la primera visita.
// Los modelos de IA los guarda aparte la propia librería (Cache Storage), así que siguen disponibles sin red.
const CACHE = 'audio-studio-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  // Solo se guardan respuestas del mismo sitio; CDN y modelos externos pasan directo
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: primero la red (para tener la última versión) y, si no hay, la copia guardada
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(cache => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  // Archivos del sitio (con hash en el nombre): primero la copia guardada
  event.respondWith(
    caches.match(event.request).then(hit => {
      if (hit) return hit
      return fetch(event.request).then(res => {
        if (res.ok) caches.open(CACHE).then(cache => cache.put(event.request, res.clone()))
        return res
      })
    }),
  )
})
