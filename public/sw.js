// Guarda TODO el juego en el teléfono la primera vez que se abre con internet;
// después funciona completo sin conexión. La lista de archivos la llena el build.
const VERSION = '__VERSION__'
const CACHE = 'tienda-mx-' + VERSION
const FILES = __FILES__
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    // de a poco para no saturar la conexión; si alguno falla, se reintenta al usarse
    for (let i = 0; i < FILES.length; i += 20) await Promise.all(FILES.slice(i, i + 20).map(f => c.add(f).catch(() => {})))
  }).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tienda-mx-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())))
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  // abrir el juego: primero lo guardado (funciona sin internet)
  if (req.mode === 'navigate') { e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req))); return }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)) } return r })))
})
