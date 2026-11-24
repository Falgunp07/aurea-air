import assert from 'node:assert/strict'
import test from 'node:test'
import { initial } from '../lib/planner.mjs'
import { createAirService } from '../lib/service.mjs'
import { generateSummary } from '../lib/gemini.mjs'

const origin = 'https://aurea.example'
const start = Date.parse('2026-11-24T15:59+05:30')
const air = {
  current: { time: '2026-11-24T15:30', pm2_5: 27 },
  hours: [{ time: '2026-11-24T16:00', hour: 16, pm: 23 }],
}
function post(body, headers = {}) {
  return new Request(origin + '/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}
const forecastRequest = () => new Request(origin + '/api/forecast?city=Delhi')
const noNetwork = () => assert.fail('Invalid requests must stop before calling providers')

test('cached regional data never returns a past hour and is refreshed after ten minutes', async () => {
  let now = start
  let calls = 0
  const handle = createAirService({
    clock: () => now,
    loadForecast: async () => {
      calls += 1
      return air
    },
  })
  const first = await handle(forecastRequest())
  assert.equal(first.headers.get('cache-control'), 'no-store')
  assert.equal((await first.json()).hours.length, 1)
  now += 2 * 60_000
  assert.equal((await (await handle(forecastRequest())).json()).hours.length, 0)
  assert.equal(calls, 1)
  now += 8 * 60_000
  await handle(forecastRequest())
  assert.equal(calls, 2)
})

test('recovers from a provider outage without representing missing data as a reading', async () => {
  let now = start
  let calls = 0
  const handle = createAirService({
    clock: () => now,
    loadForecast: async () => {
      if (++calls === 1) throw new Error('unavailable')
      return air
    },
  })
  const plan = await (await handle(post(JSON.stringify(initial)))).json()
  assert.equal(plan.forecastAvailable, false)
  assert.equal(plan.source, 'Standard plan')
  now += 16_000
  assert.equal((await (await handle(forecastRequest())).json()).current.pm2_5, 27)
})

test('rejects cross-origin, malformed, oversized and invalid profile requests before provider access', async () => {
  const handle = createAirService({ loadForecast: noNetwork })
  const body = JSON.stringify(initial)
  const cases = [
    [post(body, { origin: 'https://elsewhere.example' }), 403],
    [post(body, { 'sec-fetch-site': 'cross-site' }), 403],
    [post(body, { 'content-type': 'text/plain' }), 415],
    [post(body, { 'content-length': '9000' }), 413],
    [post('界'.repeat(3000)), 413],
    [post('{'), 400],
    [post(JSON.stringify({ ...initial, city: ['Delhi'] })), 400],
    [post(JSON.stringify({ ...initial, indoor: {} })), 400],
    [new Request(origin + '/api/forecast?city=constructor'), 400],
    [new Request(origin + '/api/plan'), 405],
    [new Request(origin + '/api/forecast?city=Delhi', { method: 'POST' }), 405],
    [new Request(origin + '/missing'), 404],
  ]
  for (const [request, status] of cases) {
    assert.equal((await handle(request)).status, status)
  }
})

test('only complete Gemini text is used, with allowlisted user fields and a server-only key', async () => {
  const profile = { ...initial, unrequestedPrivateField: 'PRIVATE_SENTINEL' }
  const plan = { timing: 'Keep 3 pm fixed', travel: 'Combine errands', indoor: 'Use a damp cloth' }
  const env = { GEMINI_API_KEY: 'test-fixture', GEMINI_MODEL: 'model-for-test' }
  const text = await generateSummary(profile, plan, env, async (url, options) => {
    assert.equal(new URL(url).origin, 'https://generativelanguage.googleapis.com')
    assert.ok(url.includes('model-for-test'))
    assert.doesNotMatch(url, /test-fixture/)
    assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY)
    assert.doesNotMatch(options.body, /PRIVATE_SENTINEL|test-fixture/)
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ thought: true, text: 'internal' }, { text: 'Keep pickup fixed.' }] },
        },
      ],
    })
  })
  assert.equal(text, 'Keep pickup fixed.')
  for (const fetchImpl of [
    async () => new Response('bad response', { status: 429 }),
    async () => {
      throw new Error('timeout')
    },
    async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] }),
    async () =>
      Response.json({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: ' ' }] } }],
      }),
  ])
    assert.equal(await generateSummary(profile, plan, env, fetchImpl), null)
})

test('model capacity degrades to standard planning and resets after one minute', async () => {
  let now = start
  let calls = 0
  const handle = createAirService({
    clock: () => now,
    loadForecast: async () => air,
    summarize: async () => {
      calls += 1
      return 'Take an existing trip.'
    },
  })
  const run = async () => {
    const request = post(JSON.stringify(initial), {
      origin,
      'content-type': 'application/json; charset=utf-8',
    })
    return (await handle(request, { GEMINI_API_KEY: 'fixture' })).json()
  }
  for (let i = 0; i < 12; i++) assert.equal((await run()).source, 'Gemini-assisted plan')
  assert.equal((await run()).source, 'Standard plan')
  assert.equal(calls, 12)
  now += 60_000
  assert.equal((await run()).source, 'Gemini-assisted plan')
})
test('a city shares a pending fetch while other cities can load independently', async () => {
  const started = []
  const { promise, resolve } = Promise.withResolvers()
  const handle = createAirService({
    clock: () => start,
    loadForecast: (city) => {
      started.push(city)
      return promise
    },
  })
  const first = handle(forecastRequest())
  const second = handle(forecastRequest())
  const third = handle(new Request(origin + '/api/forecast?city=Chennai'))
  assert.deepEqual(started, ['Delhi', 'Chennai'])
  resolve(air)
  for (const r of await Promise.all([first, second, third])) assert.equal(r.status, 200)
})
