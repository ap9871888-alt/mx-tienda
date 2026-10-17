import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { wavToFloat32 } from './audioFormat'

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

// Ejecuta ffmpeg con el archivo de entrada cargado; reporta el porcentaje y, si falla, la última línea del log
async function run(file, args, output, onProgress) {
  const ffmpeg = await getFFmpeg()
  const ext = (file.name.split('.').pop() || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'mp4'
  const input = `input.${ext}`
  let lastLog = ''
  const onLog = ({ message }) => (lastLog = message)
  const onProg = ({ progress }) => onProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))))

  await ffmpeg.writeFile(input, await fetchFile(file))
  ffmpeg.on('log', onLog)
  ffmpeg.on('progress', onProg)
  try {
    const code = await ffmpeg.exec(['-i', input, ...args, output])
    if (code !== 0) throw new Error(`ffmpeg no pudo convertir el video (${lastLog || `código ${code}`})`)
    const data = await ffmpeg.readFile(output)
    return data
  } finally {
    ffmpeg.off('log', onLog)
    ffmpeg.off('progress', onProg)
    await ffmpeg.deleteFile(input).catch(() => {})
    await ffmpeg.deleteFile(output).catch(() => {})
  }
}

// Extrae el audio del video en MP3 (con calidad elegida) o WAV (sin pérdida)
export async function extractAudio(file, format, bitrate = '192k', onProgress) {
  const output = `output.${format}`
  const codec = format === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', bitrate] : ['-c:a', 'pcm_s16le']
  const data = await run(file, ['-vn', ...codec], output, onProgress)
  return new Blob([data], { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' })
}

// Audio mono a 16 kHz en Float32, lo que pide Whisper
export async function toSpeechSamples(file, onProgress) {
  const data = await run(file, ['-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le'], 'speech.wav', onProgress)
  return wavToFloat32(data)
}

// Convierte un audio (Blob) a MP3 o WAV usando ffmpeg
export async function convertAudio(blob, format, bitrate = '192k') {
  const file = new File([blob], 'input.wav', { type: blob.type })
  const codec = format === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', bitrate] : ['-c:a', 'pcm_s16le']
  const data = await run(file, ['-vn', ...codec], `output.${format}`)
  return new Blob([data], { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' })
}
