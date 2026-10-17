// Corre Whisper (transcripción) y Kokoro (voz) fuera del hilo principal, para que la página no se congele.
import { pipeline } from '@huggingface/transformers'
import { KokoroTTS } from 'kokoro-js'
import { splitWindows, splitText, encodeWav, WINDOW_S, SAMPLE_RATE } from '../lib/audioFormat.js'
import { WHISPER_MODELS, KOKORO_MODEL } from '../lib/models.js'

const PAUSE_S = 0.35
const asrCache = new Map() // un pipeline por modelo
let ttsPromise
const cancelled = new Set() // ids cancelados; se revisan entre ventanas y fragmentos

const abortError = msg => Object.assign(new Error(msg), { name: 'AbortError' })

function getTranscriber(modelKey, report) {
  if (!asrCache.has(modelKey)) {
    const id = WHISPER_MODELS[modelKey].id
    const load = (async () => {
      // WebGPU es más rápido; si no arranca, se usa WASM
      if (self.navigator?.gpu) {
        try {
          return await pipeline('automatic-speech-recognition', id, { device: 'webgpu', progress_callback: report })
        } catch {
          // Sin WebGPU utilizable: seguimos con WASM
        }
      }
      return pipeline('automatic-speech-recognition', id, { device: 'wasm', dtype: 'q8', progress_callback: report })
    })()
    asrCache.set(modelKey, load.catch(e => {
      asrCache.delete(modelKey)
      throw e
    }))
  }
  return asrCache.get(modelKey)
}

async function transcribe({ id, samples, model, language, words }) {
  const report = p => p.status === 'progress' && post(id, 'progress', { text: `descargando modelo ${Math.round(p.progress)}%` })
  const asr = await getTranscriber(model, report)
  // 'word' da un tiempo por palabra; true da un tiempo por frase
  const options = { task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: words ? 'word' : true }
  if (language !== 'auto') options.language = language

  const windows = splitWindows(samples)
  const texts = []
  const segments = []
  for (let i = 0; i < windows.length; i++) {
    if (cancelled.has(id)) throw abortError('Transcripción cancelada')
    const offset = i * WINDOW_S
    post(id, 'progress', { text: `parte ${i + 1} de ${windows.length}` })
    const out = await asr(windows[i], options)
    for (const c of out.chunks || []) {
      segments.push({
        start: offset + (c.timestamp[0] ?? 0),
        end: offset + (c.timestamp[1] ?? c.timestamp[0] ?? 0),
        text: c.text.trim(),
      })
    }
    texts.push(out.text.trim())
  }
  return { text: texts.join(' ').trim(), segments }
}

function getTTS() {
  ttsPromise ??= KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: 'q8', device: 'wasm' }).catch(e => {
    ttsPromise = null
    throw e
  })
  return ttsPromise
}

async function speak({ id, text, voice, speed }) {
  const parts = splitText(text)
  if (!parts.length) throw new Error('No hay texto para convertir en audio')
  const tts = await getTTS()
  const pieces = []
  let rate = 24000
  for (let i = 0; i < parts.length; i++) {
    if (cancelled.has(id)) throw abortError('Generación de voz cancelada')
    post(id, 'progress', { text: `parte ${i + 1} de ${parts.length}` })
    const out = await tts.generate(parts[i], { voice, speed })
    rate = out.sampling_rate
    pieces.push(out.audio, new Float32Array(Math.round(PAUSE_S * rate)))
  }
  const total = pieces.reduce((n, a) => n + a.length, 0)
  const samples = new Float32Array(total)
  let offset = 0
  for (const a of pieces) {
    samples.set(a, offset)
    offset += a.length
  }
  return encodeWav(samples, rate).buffer
}

function post(id, type, payload = {}) {
  self.postMessage({ id, type, ...payload })
}

self.onmessage = async ({ data }) => {
  const { id, type } = data
  if (type === 'cancel') return cancelled.add(id)
  try {
    const result = type === 'transcribe' ? await transcribe(data) : await speak(data)
    // El WAV se transfiere sin copiarlo; el resto son objetos pequeños
    self.postMessage({ id, type: 'result', result }, result instanceof ArrayBuffer ? [result] : [])
  } catch (e) {
    post(id, 'error', { name: e.name, message: e.message })
  } finally {
    cancelled.delete(id)
  }
}
