// Comprueba en Node que el núcleo de ffmpeg que usa la app extrae MP3, WAV y el audio de 16 kHz para Whisper.
// Uso: npm run check:ffmpeg
import { encodeWav, wavToFloat32, SAMPLE_RATE } from '../src/lib/audioFormat.js'

const createFFmpegCore = (await import(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', import.meta.url).href)).default

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

// Tono de 3 segundos a 44.1 kHz como entrada
const RATE = 44100
const tone = new Float32Array(RATE * 3)
for (let i = 0; i < tone.length; i++) tone[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / RATE)
const input = new Uint8Array(await new Response(encodeWav(tone, RATE)).arrayBuffer())

const logs = []
const core = await createFFmpegCore({ print: m => logs.push(m), printErr: m => logs.push(m) })
core.FS.writeFile('input.wav', input)

async function convert(args, output) {
  logs.length = 0
  const code = await core.exec('-i', 'input.wav', ...args, output)
  if (code !== 0) return { error: logs.slice(-3).join(' | ') || `código ${code}` }
  return { data: core.FS.readFile(output) }
}

// MP3 como en extractAudio()
const mp3 = await convert(['-vn', '-c:a', 'libmp3lame', '-b:a', '192k'], 'out.mp3')
check('MP3 (libmp3lame)', !mp3.error && mp3.data.length > 1000, mp3.error || `${mp3.data.length} bytes`)
const hasId3OrFrame = mp3.data && ((mp3.data[0] === 0x49 && mp3.data[1] === 0x44) || (mp3.data[0] === 0xff && (mp3.data[1] & 0xe0) === 0xe0))
check('MP3 tiene cabecera válida', Boolean(hasId3OrFrame))

// WAV sin pérdida
const wav = await convert(['-vn', '-c:a', 'pcm_s16le'], 'out.wav')
check('WAV (pcm_s16le)', !wav.error && wav.data.length > 1000, wav.error || `${wav.data.length} bytes`)

// Audio para Whisper como en toSpeechSamples()
const speech = await convert(['-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-c:a', 'pcm_s16le'], 'speech.wav')
if (speech.error) {
  check('Audio 16 kHz mono para Whisper', false, speech.error)
} else {
  const samples = wavToFloat32(speech.data)
  const seconds = samples.length / SAMPLE_RATE
  check('Audio 16 kHz mono para Whisper', Math.abs(seconds - 3) < 0.05, `${seconds.toFixed(2)} s`)
  const peak = Math.max(...samples.map(Math.abs))
  check('Señal sin silencio', peak > 0.4, `pico ${peak.toFixed(2)}`)
}

if (failures.length) {
  console.error(`\n${failures.length} comprobación(es) fallaron: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('\nTodas las comprobaciones de ffmpeg pasaron.')
