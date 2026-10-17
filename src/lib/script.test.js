import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeScript, PROVIDERS } from './script.js'

const realFetch = globalThis.fetch
const restore = () => (globalThis.fetch = realFetch)

test('uses the chosen provider with the user key', async () => {
  let call
  globalThis.fetch = async (url, init) => {
    call = { url, init, body: JSON.parse(init.body) }
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Guion listo' } }] }), { status: 200 })
  }
  try {
    const text = await writeScript({ transcript: 'Hola mundo', style: 'short', notes: '', llm: { provider: 'groq', key: 'k123' } })
    assert.equal(text, 'Guion listo')
    assert.equal(call.url, PROVIDERS.groq.url)
    assert.equal(call.init.headers.Authorization, 'Bearer k123')
    assert.equal(call.body.model, PROVIDERS.groq.model)
    assert.match(call.body.messages[1].content, /<transcripcion>\nHola mundo\n<\/transcripcion>/)
  } finally {
    restore()
  }
})

test('a rejected key gives a clear message that points to the local option', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'invalid api key' } }), { status: 401 })
  try {
    await assert.rejects(
      writeScript({ transcript: 'Hola', style: 'youtube', notes: '', llm: { provider: 'gemini', key: 'mala' } }),
      /invalid api key.*Local/,
    )
  } finally {
    restore()
  }
})

test('a remote provider without a key does not call the network', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return new Response('{}', { status: 200 })
  }
  try {
    // Sin llave cae al modelo local, que en Node no tiene WebGPU: debe fallar con ese mensaje, no llamar a la red
    await assert.rejects(writeScript({ transcript: 'Hola', style: 'youtube', notes: '', llm: { provider: 'groq', key: '' } }), /WebGPU/)
    assert.equal(called, false)
  } finally {
    restore()
  }
})
