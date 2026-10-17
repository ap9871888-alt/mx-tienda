import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitText, splitWindows, encodeWav, wavToFloat32, timecode, toSRT, toVTT, SAMPLE_RATE } from './audioFormat.js'

test('splitText keeps short text as one fragment', () => {
  assert.deepEqual(splitText('Hola mundo.'), ['Hola mundo.'])
})

test('splitText returns nothing for empty or blank text', () => {
  assert.deepEqual(splitText(''), [])
  assert.deepEqual(splitText('   \n  '), [])
})

test('splitText cuts long text by sentence and respects the limit', () => {
  const sentence = 'Esta es una oración de prueba un poco larga.'
  const text = Array(20).fill(sentence).join(' ')
  const parts = splitText(text, 300)
  assert.ok(parts.length > 1)
  for (const part of parts) {
    assert.ok(part.length <= 300, `fragmento de ${part.length} caracteres`)
    assert.ok(part.endsWith('.'), 'cada fragmento termina en oración completa')
  }
  assert.equal(parts.join(' '), text)
})

test('splitText collapses extra whitespace', () => {
  assert.deepEqual(splitText('Uno.\n\n   Dos.'), ['Uno. Dos.'])
})

test('splitWindows makes 4-minute windows at 16 kHz', () => {
  const samples = new Float32Array(SAMPLE_RATE * 600) // 10 minutos
  const windows = splitWindows(samples)
  assert.equal(windows.length, 3)
  assert.equal(windows[0].length, SAMPLE_RATE * 240)
  assert.equal(windows[1].length, SAMPLE_RATE * 240)
  assert.equal(windows[2].length, SAMPLE_RATE * 120)
})

test('splitWindows keeps short audio in a single window', () => {
  const samples = new Float32Array(SAMPLE_RATE * 5)
  const windows = splitWindows(samples)
  assert.equal(windows.length, 1)
  assert.equal(windows[0].length, samples.length)
})

test('splitWindows never returns an empty list', () => {
  const windows = splitWindows(new Float32Array(0))
  assert.equal(windows.length, 1)
})

test('WAV encodes and decodes back to nearly the same samples', () => {
  const input = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25])
  const wav = encodeWav(input, 16000)
  const output = wavToFloat32(wav)
  assert.equal(output.length, input.length)
  input.forEach((v, i) => assert.ok(Math.abs(v - output[i]) < 1 / 32768 + 1e-9, `muestra ${i}`))
})

test('WAV header has the expected sample rate and size', () => {
  const wav = encodeWav(new Float32Array(100), 24000)
  const view = new DataView(wav.buffer)
  assert.equal(String.fromCharCode(...wav.subarray(0, 4)), 'RIFF')
  assert.equal(view.getUint32(24, true), 24000)
  assert.equal(view.getUint32(40, true), 200)
})

test('wavToFloat32 rejects data without a data chunk', () => {
  const junk = new Uint8Array(44)
  assert.throws(() => wavToFloat32(junk), /No se encontró el audio/)
})

test('timecode formats hours, minutes, seconds and milliseconds', () => {
  assert.equal(timecode(0, ','), '00:00:00,000')
  assert.equal(timecode(3661.25, '.'), '01:01:01.250')
  assert.equal(timecode(-3, ','), '00:00:00,000')
})

test('toSRT numbers cues with comma timestamps', () => {
  const srt = toSRT([
    { start: 0, end: 1.5, text: 'Hola' },
    { start: 2, end: 3, text: 'Mundo' },
  ])
  assert.equal(srt, '1\n00:00:00,000 --> 00:00:01,500\nHola\n\n2\n00:00:02,000 --> 00:00:03,000\nMundo\n')
})

test('toVTT starts with the header and uses dot timestamps', () => {
  const vtt = toVTT([{ start: 0, end: 1.5, text: 'Hola' }])
  assert.equal(vtt, 'WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHola\n')
})
