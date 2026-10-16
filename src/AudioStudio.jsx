import { useState } from 'react'
import { extractAudio, toSpeechSamples } from './lib/media'
import { transcribe, writeScript, STYLES } from './lib/ai'
import './AudioStudio.css'

const FORMATS = ['mp3', 'wav']
const STYLE_NAMES = {
  youtube: 'Video de YouTube',
  short: 'Video corto (Reels/TikTok)',
  podcast: 'Podcast',
  resumen: 'Resumen',
  articulo: 'Artículo de blog',
}

const mb = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`

function AudioStudio() {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('192k')
  const [audio, setAudio] = useState(null) // { url, filename, size }
  const [transcript, setTranscript] = useState('')
  const [style, setStyle] = useState('youtube')
  const [notes, setNotes] = useState('')
  const [script, setScript] = useState('')
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

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
    setTranscript('')
    setScript('')
    setError('')
  }

  const extract = () =>
    run('Extrayendo audio… (la primera vez carga el conversor, ~30 MB)', async () => {
      const blob = await extractAudio(file, format, bitrate, p => setProgress(`${p}%`))
      const base = file.name.replace(/\.[^.]+$/, '') || 'audio'
      setAudio({
        url: URL.createObjectURL(blob),
        filename: `${base}.${format}`,
        size: blob.size,
      })
    })

  const doTranscribe = () =>
    run('Transcribiendo… (la primera vez descarga el modelo, ~80 MB; los videos largos tardan)', async () => {
      const samples = await toSpeechSamples(file, p => setProgress(`${p}%`))
      setTranscript(await transcribe(samples, setProgress))
    })

  const generate = () =>
    run('Generando guion… (la primera vez descarga el modelo, ~1 GB)', async () => {
      setScript(await writeScript({ transcript, style, notes }, setProgress))
    })

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
              {['64k', '96k', '128k', '192k', '256k', '320k'].map(b => <option key={b}>{b}</option>)}
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
          <h3>3. Transcribe y crea el guion</h3>
          <button onClick={doTranscribe} disabled={!!busy}>
            📝 Transcribir audio
          </button>
          <textarea
            placeholder="La transcripción aparecerá aquí. También puedes pegar la tuya."
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            rows={8}
          />
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
              <button onClick={() => navigator.clipboard?.writeText(script)}>📋 Copiar guion</button>
            </>
          )}
        </div>
      )}

      {busy && <p className="status">{busy} {progress}</p>}
      {error && <p className="status error">⚠️ {error}</p>}
    </section>
  )
}

export default AudioStudio
