import { test } from 'node:test'
import assert from 'node:assert/strict'
import { processBatch } from './batch.js'

const files = [{ name: 'uno.mp4' }, { name: 'dos.mp4' }, { name: 'tres.mp4' }]
const options = { format: 'mp3', bitrate: '192k', model: 'tiny', language: 'spanish' }

// Simula el estado de cada video a partir de las actualizaciones
function harness() {
  const items = files.map(f => ({ name: f.name, status: 'en cola' }))
  const onUpdate = (i, patch) => Object.assign(items[i], patch)
  return { items, onUpdate }
}

const fakeDeps = (overrides = {}) => ({
  extract: async () => ({ size: 10 }),
  speech: async () => new Float32Array(16),
  transcribe: async () => ({ text: 'hola', segments: [{ start: 0, end: 1, text: 'hola' }] }),
  ...overrides,
})

test('processes every video and stores its transcript', async () => {
  const { items, onUpdate } = harness()
  await processBatch(files, options, onUpdate, undefined, fakeDeps())
  for (const item of items) {
    assert.equal(item.status, 'listo')
    assert.equal(item.transcript, 'hola')
    assert.equal(item.segments.length, 1)
  }
})

test('an error in one video does not stop the rest', async () => {
  const { items, onUpdate } = harness()
  let calls = 0
  const deps = fakeDeps({
    transcribe: async () => {
      calls++
      if (calls === 1) throw new Error('modelo no disponible')
      return { text: 'ok', segments: [] }
    },
  })
  await processBatch(files, options, onUpdate, undefined, deps)
  assert.equal(items[0].status, 'error')
  assert.equal(items[0].error, 'modelo no disponible')
  assert.equal(items[1].status, 'listo')
  assert.equal(items[2].status, 'listo')
})

test('cancelling mid-transcription marks the current and remaining videos as cancelled', async () => {
  const { items, onUpdate } = harness()
  const controller = new AbortController()
  const deps = fakeDeps({
    transcribe: async () => {
      controller.abort()
      throw Object.assign(new Error('Transcripción cancelada'), { name: 'AbortError' })
    },
  })
  await processBatch(files, options, onUpdate, controller.signal, deps)
  assert.deepEqual(items.map(i => i.status), ['cancelado', 'cancelado', 'cancelado'])
})

test('a batch cancelled before starting processes nothing', async () => {
  const { items, onUpdate } = harness()
  const controller = new AbortController()
  controller.abort()
  await processBatch(files, options, onUpdate, controller.signal, fakeDeps())
  assert.deepEqual(items.map(i => i.status), ['cancelado', 'cancelado', 'cancelado'])
})

test('progress is reported with the current status', async () => {
  const { items, onUpdate } = harness()
  const seen = []
  const deps = fakeDeps({
    extract: async (file, f, b, onProgress) => {
      onProgress(50)
      seen.push(items[0].progress)
      return { size: 1 }
    },
  })
  await processBatch([files[0]], options, onUpdate, undefined, deps)
  assert.deepEqual(seen, ['50%'])
  assert.equal(items[0].status, 'listo')
})
