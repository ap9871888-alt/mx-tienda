import { runInWorker } from './worker'

export const VOICES = {
  ef_dora: 'Español · Dora (mujer)',
  em_alex: 'Español · Alex (hombre)',
  em_santa: 'Español · Santa (hombre)',
  af_heart: 'Inglés · Heart (mujer)',
  am_adam: 'Inglés · Adam (hombre)',
}

// Genera el audio completo en el worker y lo devuelve como WAV (Blob)
export async function speak(text, { voice = 'ef_dora', speed = 1 } = {}, onProgress, signal) {
  const buffer = await runInWorker({ type: 'speak', text, voice, speed }, { onProgress, signal })
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
