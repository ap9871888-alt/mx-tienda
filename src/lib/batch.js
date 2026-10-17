// Procesa varios videos uno por uno: audio, transcripción y tiempos.
// `deps` = { extract, speech, transcribe }: las funciones reales se pasan desde la interfaz,
// así esta lógica se puede probar en Node sin ffmpeg ni el worker.
export async function processBatch(files, options, onUpdate, signal, { extract, speech, transcribe }) {

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const update = patch => onUpdate(i, patch)
    if (signal?.aborted) {
      update({ status: 'cancelado' })
      continue
    }
    try {
      update({ status: 'extrayendo audio', progress: '' })
      const blob = await extract(file, options.format, options.bitrate, p => update({ progress: `${p}%` }))
      update({ audioBlob: blob, status: 'transcribiendo', progress: '' })

      const samples = await speech(file, p => update({ progress: `${p}%` }))
      const result = await transcribe(samples, { model: options.model, language: options.language }, text => update({ progress: text }), signal)
      update({ status: 'listo', transcript: result.text, segments: result.segments, progress: '' })
    } catch (e) {
      if (e.name === 'AbortError') {
        update({ status: 'cancelado', progress: '' })
        // El resto de la cola también se cancela
        for (let j = i + 1; j < files.length; j++) onUpdate(j, { status: 'cancelado' })
        return
      }
      update({ status: 'error', error: e.message, progress: '' })
    }
  }
}
