import { pipeline } from '@huggingface/transformers'
import { CreateMLCEngine } from '@mlc-ai/web-llm'

// Modelos abiertos que corren en el navegador. La primera vez se descargan y quedan en caché.
export const WHISPER_MODELS = {
  tiny: { id: 'onnx-community/whisper-tiny', label: 'Rápido (tiny, ~40 MB)' },
  base: { id: 'onnx-community/whisper-base', label: 'Equilibrado (base, ~80 MB)' },
  small: { id: 'onnx-community/whisper-small', label: 'Mejor calidad (small, ~250 MB)' },
}
export const LANGUAGES = {
  spanish: 'Español',
  english: 'Inglés',
  auto: 'Detectar automáticamente',
}
const LLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

// Textos muy largos no caben en el contexto del modelo pequeño
const MAX_TRANSCRIPT_CHARS = 9000

const asrCache = new Map() // un pipeline por modelo
let llmPromise

// WebGPU es más rápido; si el navegador no lo tiene o no arranca, se usa WASM
function getTranscriber(modelKey, onProgress) {
  if (!asrCache.has(modelKey)) {
    const id = WHISPER_MODELS[modelKey].id
    const load = (async () => {
      if (navigator.gpu) {
        try {
          return await pipeline('automatic-speech-recognition', id, { device: 'webgpu', progress_callback: onProgress })
        } catch {
          // Sin WebGPU utilizable: seguimos con WASM
        }
      }
      return pipeline('automatic-speech-recognition', id, { device: 'wasm', dtype: 'q8', progress_callback: onProgress })
    })()
    asrCache.set(modelKey, load.catch(e => {
      asrCache.delete(modelKey)
      throw e
    }))
  }
  return asrCache.get(modelKey)
}

// Devuelve { text, segments: [{ start, end, text }] } con tiempos en segundos
export async function transcribe(samples, { model = 'base', language = 'spanish' } = {}, onProgress) {
  const asr = await getTranscriber(model, p => p.status === 'progress' && onProgress?.(`${Math.round(p.progress)}%`))
  const options = {
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  }
  if (language !== 'auto') options.language = language
  const out = await asr(samples, options)
  const segments = (out.chunks || []).map(c => ({
    start: c.timestamp[0] ?? 0,
    end: c.timestamp[1] ?? c.timestamp[0] ?? 0,
    text: c.text.trim(),
  }))
  return { text: out.text.trim(), segments }
}

export function getWriter(onProgress) {
  if (!navigator.gpu) {
    throw new Error('Tu navegador no tiene WebGPU. Usa Chrome o Edge de escritorio para generar guiones, o pega tu propia transcripción.')
  }
  llmPromise ??= CreateMLCEngine(LLM_MODEL, {
    initProgressCallback: r => onProgress?.(r.text),
  }).catch(e => {
    llmPromise = null
    throw e
  })
  return llmPromise
}

export const STYLES = {
  youtube: 'un guion para video de YouTube con gancho inicial, desarrollo por secciones y cierre con llamada a la acción',
  short: 'un guion para video corto vertical (TikTok, Reels, Shorts) de máximo 60 segundos, con gancho en los primeros 3 segundos',
  podcast: 'un guion de episodio de podcast con introducción, segmentos y cierre',
  resumen: 'un resumen estructurado con puntos clave',
  articulo: 'un artículo de blog con título, subtítulos y conclusión',
}

export async function writeScript({ transcript, style, notes }, onProgress) {
  const engine = await getWriter(r => onProgress?.(r))
  const text = transcript.slice(0, MAX_TRANSCRIPT_CHARS)
  const reply = await engine.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'Eres un guionista profesional. Escribes en el mismo idioma que la transcripción. Usas solo la información de la transcripción; no inventas datos.',
      },
      {
        role: 'user',
        content: `Con base en esta transcripción, escribe ${STYLES[style]}.${
          notes ? `\n\nIndicaciones adicionales: ${notes}` : ''
        }\n\n<transcripcion>\n${text}\n</transcripcion>`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  })
  return reply.choices[0].message.content
}
