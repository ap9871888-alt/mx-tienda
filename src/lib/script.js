import { CreateMLCEngine } from '@mlc-ai/web-llm'

// Modelo de lenguaje abierto que corre en el navegador (WebGPU). La primera vez descarga ~1 GB.
const LLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

// Textos muy largos no caben en el contexto del modelo pequeño
const MAX_TRANSCRIPT_CHARS = 9000

export const STYLES = {
  youtube: 'un guion para video de YouTube con gancho inicial, desarrollo por secciones y cierre con llamada a la acción',
  short: 'un guion para video corto vertical (TikTok, Reels, Shorts) de máximo 60 segundos, con gancho en los primeros 3 segundos',
  podcast: 'un guion de episodio de podcast con introducción, segmentos y cierre',
  resumen: 'un resumen estructurado con puntos clave',
  articulo: 'un artículo de blog con título, subtítulos y conclusión',
}

let llmPromise

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

// Proveedores con API compatible con OpenAI y plan gratuito. La llave se guarda solo en tu navegador.
export const PROVIDERS = {
  local: { label: 'Local (gratis, sin llave)' },
  groq: { label: 'Groq (llave gratuita)', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
  gemini: { label: 'Gemini (llave gratuita)', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
}

const SYSTEM = 'Eres un guionista profesional. Escribes en el mismo idioma que la transcripción. Usas solo la información de la transcripción; no inventas datos.'

function buildUserPrompt({ transcript, style, notes }) {
  const text = transcript.slice(0, MAX_TRANSCRIPT_CHARS)
  return `Con base en esta transcripción, escribe ${STYLES[style]}.${
    notes ? `\n\nIndicaciones adicionales: ${notes}` : ''
  }\n\n<transcripcion>\n${text}\n</transcripcion>`
}

async function writeWithProvider({ transcript, style, notes }, { provider, key }) {
  const config = PROVIDERS[provider]
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildUserPrompt({ transcript, style, notes }) },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error?.message || `error ${res.status}`
    throw new Error(`${config.label}: ${msg}. Revisa tu llave o cambia a Local.`)
  }
  return data.choices[0].message.content
}

export async function writeScript({ transcript, style, notes, llm = { provider: 'local' } }, onProgress) {
  if (llm.provider !== 'local' && llm.key) return writeWithProvider({ transcript, style, notes }, llm)

  const engine = await getWriter(r => onProgress?.(r))
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildUserPrompt({ transcript, style, notes }) },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  })
  return reply.choices[0].message.content
}
