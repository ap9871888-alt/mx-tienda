import { runInWorker } from './worker'

// Devuelve { text, segments: [{ start, end, text }] } con tiempos en segundos.
// Corre en el worker: `samples` (Float32Array a 16 kHz) se transfiere, no se copia.
export function transcribe(samples, { model = 'base', language = 'spanish', words = false } = {}, onProgress, signal) {
  return runInWorker(
    { type: 'transcribe', samples, model, language, words },
    { onProgress, signal, transfer: [samples.buffer] },
  )
}
