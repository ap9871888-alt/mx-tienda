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
