import { useEffect, useState } from 'react'
import { extractAudio, toSpeechSamples, convertAudio } from './lib/media'
import { transcribe, writeScript, STYLES, WHISPER_MODELS, LANGUAGES } from './lib/ai'
import { speak, VOICES, previewWithSystemVoice, stopSystemVoice } from './lib/tts'
import { toSRT, toVTT, download } from './lib/export'
import './AudioStudio.css'

const FORMATS = ['mp3', 'wav']
const BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k']
const STYLE_NAMES = {
  youtube: 'Video de YouTube',
  short: 'Video corto (Reels/TikTok)',
  podcast: 'Podcast',
  resumen: 'Resumen',
  articulo: 'Artículo de blog',
}

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`
const baseName = name => name.replace(/\.[^.]+$/, '') || 'audio'

// El borrador se guarda en el navegador para no perderlo al recargar; si no hay localStorage, la app sigue funcionando
const DRAFT_KEY = 'audio-studio:draft'
function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}
  } catch {
    return {}
  }
}

function AudioStudio() {
  const [draft] = useState(loadDraft)
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('192k')
  const [audio, setAudio] = useState(null) // { url, filename, size }
  const [model, setModel] = useState('base')
  const [language, setLanguage] = useState('spanish')
  const [transcript, setTranscript] = useState(draft.transcript || '')
  const [autoText, setAutoText] = useState('') // lo que devolvió Whisper; los subtítulos salen de aquí
  const [segments, setSegments] = useState([]) // [{ start, end, text }] para subtítulos
  const [style, setStyle] = useState('youtube')
  const [notes, setNotes] = useState('')
  const [script, setScript] = useState(draft.script || '')
  const [voiceText, setVoiceText] = useState('')
  const [voice, setVoice] = useState('ef_dora')
  const [speed, setSpeed] = useState(1)
  const [voiceAudio, setVoiceAudio] = useState(null) // { url, wav }
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ transcript, script }))
    } catch {
      // Sin almacenamiento disponible, el borrador solo vive mientras la pestaña esté abierta
    }
  }, [transcript, script])

  const run = async (label, fn) => {
    setBusy(label)
    setProgress('')
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
      setProgress('')
    }
  }

  const onFile = f => {
    if (audio) URL.revokeObjectURL(audio.url)
    setFile(f)
    setAudio(null)
    // La transcripción y el guion del borrador se conservan; los subtítulos sí se reinician porque eran del video anterior
    setAutoText('')
    setSegments([])
    setError('')
  }

  const extract = () =>
    run('Extrayendo audio… (la primera vez carga el conversor, ~30 MB)', async () => {
      const blob = await extractAudio(file, format, bitrate, p => setProgress(`${p}%`))
      setAudio({
        url: URL.createObjectURL(blob),
        filename: `${baseName(file.name)}.${format}`,
        size: blob.size,
      })
    })

  const doTranscribe = () =>
    run(`Transcribiendo… (la primera vez descarga el modelo ${WHISPER_MODELS[model].label}; los videos largos tardan)`, async () => {
      const samples = await toSpeechSamples(file, p => setProgress(`${p}%`))
      const result = await transcribe(samples, { model, language }, setProgress)
      setTranscript(result.text)
      setAutoText(result.text)
      setSegments(result.segments)
    })

  const generate = () =>
    run('Generando guion… (la primera vez descarga el modelo, ~1 GB)', async () => {
      setScript(await writeScript({ transcript, style, notes }, setProgress))
    })

  const makeVoice = () =>
    run('Generando voz… (la primera vez descarga el modelo de voz, ~80 MB)', async () => {
      stopSystemVoice()
      const wav = await speak(voiceText, { voice, speed }, p => setProgress(p))
      if (voiceAudio) URL.revokeObjectURL(voiceAudio.url)
      setVoiceAudio({ wav, url: URL.createObjectURL(wav) })
    })

  const downloadVoice = format => {
    run(`Convirtiendo a ${format.toUpperCase()}…`, async () => {
      const blob = format === 'wav' ? voiceAudio.wav : await convertAudio(voiceAudio.wav, 'mp3')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name}-voz.${format}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })
  }

  const name = file ? baseName(file.name) : 'transcripcion'

  return (
    <section className="studio">
      <h2>🎬 Video → Audio → Guion</h2>
      <p className="intro">Todo corre en tu navegador: no se sube nada a ningún servidor y no necesitas llaves.</p>

      <div className="studio-card">
        <h3>1. Elige tu video</h3>
        <input
          type="file"
          accept="video/*,audio/*"
          onChange={e => e.target.files[0] && onFile(e.target.files[0])}
        />
        {file && <p className="muted">{file.name} · {mb(file.size)}</p>}

        <div className="row">
          <label>
            Formato
            <select value={format} onChange={e => setFormat(e.target.value)}>
              {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </label>
          <label>
            Calidad
            <select value={bitrate} onChange={e => setBitrate(e.target.value)} disabled={format === 'wav'}>
              {BITRATES.map(b => <option key={b}>{b}</option>)}
            </select>
          </label>
          <button className="primary" onClick={extract} disabled={!file || !!busy}>
            Extraer audio
          </button>
        </div>
      </div>

      {audio && (
        <div className="studio-card">
          <h3>2. Descarga</h3>
          <div className="download">
            <audio controls src={audio.url} />
            <a className="primary" href={audio.url} download={audio.filename}>
              ⬇ Descargar {audio.filename} ({mb(audio.size)})
            </a>
          </div>
        </div>
      )}

      {file && (
        <div className="studio-card">
          <h3>3. Transcribe</h3>
          <div className="row">
            <label>
              Modelo
              <select value={model} onChange={e => setModel(e.target.value)}>
                {Object.entries(WHISPER_MODELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label>
              Idioma del audio
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button onClick={doTranscribe} disabled={!!busy}>
              📝 Transcribir audio
            </button>
          </div>
          <textarea
            placeholder="La transcripción aparecerá aquí. También puedes pegar la tuya."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={8}
          />
          {transcript && (
            <div className="row">
              {segments.length > 0 && transcript !== autoText && (
                <p className="muted">Editaste el texto: los subtítulos usan la transcripción original de Whisper.</p>
              )}
              <button onClick={() => download(transcript, `${name}.txt`)}>⬇ TXT</button>
              <button onClick={() => download(toSRT(segments), `${name}.srt`)} disabled={!segments.length}>
                ⬇ Subtítulos SRT
              </button>
              <button onClick={() => download(toVTT(segments), `${name}.vtt`, 'text/vtt;charset=utf-8')} disabled={!segments.length}>
                ⬇ Subtítulos VTT
              </button>
            </div>
          )}
        </div>
      )}

      {transcript && (
        <div className="studio-card">
          <h3>4. Crea el guion</h3>
          <div className="row">
            <label>
              Tipo de guion
              <select value={style} onChange={e => setStyle(e.target.value)}>
                {Object.keys(STYLES).map(k => <option key={k} value={k}>{STYLE_NAMES[k]}</option>)}
              </select>
            </label>
            <label className="grow">
              Indicaciones (opcional)
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tono, duración, público…" />
            </label>
            <button className="primary" onClick={generate} disabled={!transcript.trim() || !!busy}>
              ✨ Generar guion
            </button>
          </div>
          {script && (
            <>
              <textarea value={script} onChange={e => setScript(e.target.value)} rows={14} />
              <div className="row">
                <button onClick={() => navigator.clipboard?.writeText(script)}>📋 Copiar guion</button>
                <button onClick={() => download(script, `${name}-guion.txt`)}>⬇ Descargar guion</button>
              </div>
            </>
          )}
        </div>
      )}

      {(script || transcript) && (
        <div className="studio-card">
          <h3>5. Convierte el texto en voz</h3>
          <p className="muted">Escribe o pega un texto, o usa el guion o la transcripción.</p>
          <div className="row">
            <button onClick={() => setVoiceText(script)} disabled={!script}>Usar guion</button>
            <button onClick={() => setVoiceText(transcript)} disabled={!transcript}>Usar transcripción</button>
          </div>
          <textarea
            placeholder="Texto que quieres escuchar"
            value={voiceText}
            onChange={e => setVoiceText(e.target.value)}
            rows={6}
          />
          <div className="row">
            <label>
              Voz
              <select value={voice} onChange={e => setVoice(e.target.value)}>
                {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>
              Velocidad: {speed.toFixed(1)}×
              <input type="range" min="0.7" max="1.3" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </label>
            <button className="primary" onClick={makeVoice} disabled={!voiceText.trim() || !!busy}>
              🎙 Generar audio
            </button>
            <button onClick={() => previewWithSystemVoice(voiceText)} disabled={!voiceText.trim()}>
              🔊 Vista previa (voz del sistema)
            </button>
          </div>
          {voiceAudio && (
            <div className="download">
              <audio controls src={voiceAudio.url} />
              <button className="primary" onClick={() => downloadVoice('mp3')} disabled={!!busy}>⬇ MP3</button>
              <button onClick={() => downloadVoice('wav')} disabled={!!busy}>⬇ WAV</button>
            </div>
          )}
        </div>
      )}

      {busy && <p className="status">{busy} {progress}</p>}
      {error && <p className="status error">⚠️ {error}</p>}
    </section>
  )
}

export default AudioStudio
