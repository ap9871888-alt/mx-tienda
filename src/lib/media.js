import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

// Núcleo de ffmpeg de un solo hilo: no necesita cabeceras COOP/COEP, así que funciona en Vercel sin configuración extra
const CORE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

let ffmpegPromise

export function getFFmpeg() {
  ffmpegPromise ??= (async () => {
    const ffmpeg = new FFmpeg()
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    return ffmpeg
  })().catch(e => {
    ffmpegPromise = null
    throw e
  })
  return ffmpegPromise
}

async function withFiles(file, fn) {
  const ffmpeg = await getFFmpeg()
  const ext = (file.name.split('.').pop() || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'mp4'
  const input = `input.${ext}`
  await ffmpeg.writeFile(input, await fetchFile(file))
  try {
    return await fn(ffmpeg, input)
  } finally {
    await ffmpeg.deleteFile(input).catch(() => {})
  }
}

// Extrae el audio del video en MP3 (con calidad elegida) o WAV (sin pérdida)
export function extractAudio(file, format, bitrate = '192k') {
  return withFiles(file, async (ffmpeg, input) => {
    const output = `output.${format}`
    const codec = format === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', bitrate] : ['-c:a', 'pcm_s16le']
    await ffmpeg.exec(['-i', input, '-vn', ...codec, output])
    const data = await ffmpeg.readFile(output)
    await ffmpeg.deleteFile(output).catch(() => {})
    return new Blob([data], { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' })
  })
}

// Audio mono a 16 kHz en Float32, lo que pide Whisper
export function toSpeechSamples(file) {
  return withFiles(file, async (ffmpeg, input) => {
    await ffmpeg.exec(['-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', 'speech.wav'])
    const data = await ffmpeg.readFile('speech.wav')
    await ffmpeg.deleteFile('speech.wav').catch(() => {})
    return wavToFloat32(data)
  })
}

// Lee el chunk "data" de un WAV PCM 16 bits y lo convierte a -1..1
function wavToFloat32(bytes) {
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
