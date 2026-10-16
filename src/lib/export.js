// Formatea segundos como 00:00:00,000 (SRT) o 00:00:00.000 (VTT)
function timecode(seconds, sep) {
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

// Descarga un texto como archivo en el navegador
export function download(content, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
