import { splitText, encodeWav } from './audioFormat'

// Modelo de voz abierto (Kokoro 82M, Apache-2.0). Corre en el navegador; la primera vez descarga ~80 MB.
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const PAUSE_S = 0.35 // silencio entre fragmentos

export const VOICES = {
  ef_dora: 'Español · Dora (mujer)',
  em_alex: 'Español · Alex (hombre)',
  em_santa: 'Español · Santa (hombre)',
  af_heart: 'Inglés · Heart (mujer)',
  am_adam: 'Inglés · Adam (hombre)',
}

let ttsPromise

export function getTTS() {
  ttsPromise ??= import('kokoro-js')
    .then(({ KokoroTTS }) => KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'wasm' }))
    .catch(e => {
      ttsPromise = null
      throw e
    })
  return ttsPromise
}

// Genera el audio completo y lo devuelve como WAV (Blob)
export async function speak(text, { voice = 'ef_dora', speed = 1 } = {}, onProgress, signal) {
  const tts = await getTTS()
  const parts = splitText(text)
  if (!parts.length) throw new Error('No hay texto para convertir en audio')

  const pieces = []
  let rate = 24000
  for (let i = 0; i < parts.length; i++) {
    if (signal?.aborted) throw new DOMException('Generación de voz cancelada', 'AbortError')
    onProgress?.(`parte ${i + 1} de ${parts.length}`)
    const out = await tts.generate(parts[i], { voice, speed })
    rate = out.sampling_rate
    pieces.push(out.audio, new Float32Array(Math.round(PAUSE_S * rate)))
  }
  return new Blob([encodeWav(concat(pieces), rate)], { type: 'audio/wav' })
}

function concat(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

// Vista previa gratis con la voz del sistema: no descarga nada, pero no se puede exportar a archivo
export function previewWithSystemVoice(text) {
  if (!('speechSynthesis' in window)) throw new Error('Tu navegador no tiene síntesis de voz del sistema')
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'es-ES'
  speechSynthesis.speak(utterance)
}

export function stopSystemVoice() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}
