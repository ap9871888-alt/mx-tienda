// Funciones puras de formato: no usan el DOM ni librerías de IA, así se pueden probar en Node.

export const SAMPLE_RATE = 16000 // lo que espera Whisper
export const WINDOW_S = 240 // ventanas de 4 minutos para transcribir por partes

// Parte el texto en fragmentos por oración para no pasar el límite del modelo de voz
export function splitText(text, max = 300) {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean)
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

// Corta las muestras en ventanas de `seconds`; cada una se transcribe aparte
export function splitWindows(samples, seconds = WINDOW_S, rate = SAMPLE_RATE) {
  const size = seconds * rate
  const windows = []
  for (let start = 0; start < samples.length; start += size) {
    windows.push(samples.subarray(start, start + size))
  }
  return windows.length ? windows : [samples]
}

// WAV PCM 16 bits mono a partir de muestras en -1..1
export function encodeWav(samples, rate) {
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
  return new Uint8Array(buffer)
}

// Lee el chunk "data" de un WAV PCM 16 bits y lo convierte a -1..1
export function wavToFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 12
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4))
    const size = view.getUint32(offset + 4, true)
    if (id === 'data') {
      const start = offset + 8
      const count = Math.min(size, view.byteLength - start) >> 1
      const samples = new Float32Array(count)
      for (let i = 0; i < count; i++) samples[i] = view.getInt16(start + i * 2, true) / 32768
      return samples
    }
    offset += 8 + size + (size % 2)
  }
  throw new Error('No se encontró el audio en el archivo convertido')
}

// Formatea segundos como 00:00:00,000 (SRT) o 00:00:00.000 (VTT)
export function timecode(seconds, sep) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const f = ms % 1000
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(f, 3)}`
}

export function toSRT(segments) {
  return segments
    .map((seg, i) => `${i + 1}\n${timecode(seg.start, ',')} --> ${timecode(seg.end, ',')}\n${seg.text}\n`)
    .join('\n')
}

export function toVTT(segments) {
  const cues = segments.map(seg => `${timecode(seg.start, '.')} --> ${timecode(seg.end, '.')}\n${seg.text}\n`)
  return `WEBVTT\n\n${cues.join('\n')}`
}
