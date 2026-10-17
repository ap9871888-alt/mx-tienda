// Modelos abiertos que corren en el navegador. La primera vez se descargan y quedan en caché.
export const WHISPER_MODELS = {
  tiny: { id: 'onnx-community/whisper-tiny', label: 'Rápido (tiny, ~40 MB)' },
  base: { id: 'onnx-community/whisper-base', label: 'Equilibrado (base, ~80 MB)' },
  small: { id: 'onnx-community/whisper-small', label: 'Mejor calidad (small, ~250 MB)' },
}

export const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'

export const LANGUAGES = {
  spanish: 'Español',
  english: 'Inglés',
  auto: 'Detectar automáticamente',
}
