// Cliente del worker de IA: manda trabajos, recibe progreso y resultados, y reenvía las cancelaciones.
let worker
let seq = 0
const pending = new Map() // id -> { resolve, reject, onProgress }

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/ai.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id)
      if (!job) return
      if (data.type === 'progress') return job.onProgress?.(data.text)
      pending.delete(data.id)
      if (data.type === 'error') {
        const err = new Error(data.message)
        err.name = data.name
        job.reject(err)
      } else {
        job.resolve(data.result)
      }
    }
    worker.onerror = e => {
      // Un fallo no capturado del worker deja sin respuesta a los trabajos en curso
      for (const [id, job] of pending) {
        job.reject(new Error(e.message || 'Falló el procesamiento en segundo plano'))
        pending.delete(id)
      }
      worker = null
    }
  }
  return worker
}

// `transfer` pasa los buffers sin copiarlos (más rápido con audio largo)
export function runInWorker(request, { onProgress, signal, transfer = [] } = {}) {
  const id = ++seq
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('Cancelado'), { name: 'AbortError' }))
    pending.set(id, { resolve, reject, onProgress })
    signal?.addEventListener('abort', () => getWorker().postMessage({ type: 'cancel', id }), { once: true })
    getWorker().postMessage({ ...request, id }, transfer)
  })
}
