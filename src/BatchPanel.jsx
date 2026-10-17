import { useRef, useState } from 'react'
import { processBatch } from './lib/batch'
import { extractAudio, toSpeechSamples } from './lib/media'
import { transcribe } from './lib/transcribe'
import { download } from './lib/export'
import { toSRT, toVTT } from './lib/audioFormat'

const STATUS_TEXT = {
  'en cola': 'En cola',
  'extrayendo audio': 'Extrayendo audio…',
  transcribiendo: 'Transcribiendo…',
  listo: 'Listo',
  cancelado: 'Cancelado',
  error: 'Error',
}

const baseName = name => name.replace(/\.[^.]+$/, '') || 'audio'

// Procesa varios videos en fila: cada uno queda con su audio, transcripción y subtítulos
function BatchPanel({ format, bitrate, model, language, onUse }) {
  const [items, setItems] = useState([])
  const [running, setRunning] = useState(false)
  const controllerRef = useRef(null)

  const update = (i, patch) =>
    setItems(prev => {
      const next = [...prev]
      const extra = patch.audioBlob ? { audioUrl: URL.createObjectURL(patch.audioBlob) } : {}
      next[i] = { ...next[i], ...patch, ...extra }
      return next
    })

  const start = async e => {
    const files = [...e.target.files]
    if (!files.length) return
    setItems(files.map(f => ({ name: f.name, file: f, status: 'en cola' })))
    setRunning(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      await processBatch(
        files,
        { format, bitrate, model, language },
        update,
        controller.signal,
        { extract: extractAudio, speech: toSpeechSamples, transcribe },
      )
    } finally {
      controllerRef.current = null
      setRunning(false)
    }
  }

  const cancel = () => controllerRef.current?.abort()

  return (
    <div className="studio-card">
      <h3>Lote: varios videos</h3>
      <p className="muted">Se procesan uno por uno con la configuración de arriba. Si un video falla, los demás siguen.</p>
      <div className="row">
        <input type="file" multiple accept="video/*,audio/*" aria-label="Elegir varios videos" onChange={start} disabled={running} />
        {running && <button onClick={cancel}>Cancelar lote</button>}
      </div>

      {items.length > 0 && (
        <ul className="batch">
          {items.map((item, i) => (
            <li key={i}>
              <div className="batch-head">
                <strong>{item.name}</strong>
                <span className={`badge ${item.status}`}>
                  {STATUS_TEXT[item.status] || item.status}
                  {item.progress ? ` · ${item.progress}` : ''}
                </span>
              </div>
              {item.error && <p className="status error">⚠️ {item.error}</p>}
              {item.status === 'listo' && (
                <div className="row">
                  {item.audioUrl && (
                    <a className="primary" href={item.audioUrl} download={`${baseName(item.name)}.${format}`}>
                      ⬇ Audio
                    </a>
                  )}
                  <button onClick={() => download(item.transcript, `${baseName(item.name)}.txt`)}>⬇ TXT</button>
                  <button onClick={() => download(toSRT(item.segments), `${baseName(item.name)}.srt`)}>⬇ SRT</button>
                  <button onClick={() => download(toVTT(item.segments), `${baseName(item.name)}.vtt`, 'text/vtt;charset=utf-8')}>
                    ⬇ VTT
                  </button>
                  <button onClick={() => onUse(item)}>✏️ Usar para el guion</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default BatchPanel
