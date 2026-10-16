// Modelo de voz abierto (Kokoro 82M, Apache-2.0). Corre en el navegador; la primera vez descarga ~80 MB.
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const PAUSE_S = 0.35 // silencio entre fragmentos
const MAX_CHARS = 300 // Kokoro procesa mejor fragmentos cortos

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

// Parte el texto en fragmentos por oración para no pasar el límite del modelo
export function splitText(text, max = MAX_CHARS) {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/)
  const parts = []
  let current = ''
  for (const sentence of sentences) {
    if (current && (current + ' ' + sentence).length > max) {
      parts.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) parts.push(current)
  return parts
}

// Genera el audio completo y lo devuelve como WAV (Blob)
export async function speak(text, { voice = 'ef_dora', speed = 1 } = {}, onProgress) {
  const tts = await getTTS()
  const parts = splitText(text)
  if (!parts.length) throw new Error('No hay texto para convertir en audio')

  const pieces = []
  let rate = 24000
  for (let i = 0; i < parts.length; i++) {
    onProgress?.(`parte ${i + 1} de ${parts.length}`)
    const out = await tts.generate(parts[i], { voice, speed })
    rate = out.sampling_rate
    pieces.push(out.audio, new Float32Array(Math.round(PAUSE_S * rate)))
  }
  return encodeWav(concat(pieces), rate)
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

// WAV PCM 16 bits mono
function encodeWav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
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
