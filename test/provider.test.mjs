import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchRegionalForecast, freshCurrentReading, parseForecast } from '../lib/provider.mjs'

const now = Date.parse('2026-11-24T16:00+05:30')

test('forecast includes zero, orders hours and excludes invalid or out-of-horizon readings', () => {
  const result = parseForecast(
    {
      current: { time: '2026-11-24T15:30', pm2_5: 7 },
      hourly: {
        time: [
          '2026-11-24T18:00',
          '2026-11-24T16:00',
          '2026-11-25T16:00',
          '2026-11-24T17:00',
          '2026-11-24T19:00',
          '2026-11-24T20:00',
          null,
        ],
        pm2_5: [38, 0, 5, -1, null, '3', 20],
      },
    },
    now,
  )
  assert.deepEqual(
    result.hours.map((row) => [row.hour, row.pm]),
    [
      [16, 0],
      [18, 38],
    ],
  )
  assert.deepEqual(result.current, { time: '2026-11-24T15:30', pm2_5: 7 })
})

test('omits stale and future current estimates; incomplete feeds degrade independently', () => {
  assert.equal(freshCurrentReading({ time: '2026-11-24T14:00', pm2_5: 5 }, now), null)
  assert.equal(freshCurrentReading({ time: '2026-11-24T16:30', pm2_5: 5 }, now), null)
  assert.deepEqual(parseForecast(null, now), { hours: [], current: null })
  const current = { time: '2026-11-24T16:00', pm2_5: 0 }
  assert.deepEqual(parseForecast({ current }, now), { hours: [], current })
})

test('requests a fixed provider URL with the supported city coordinates', async () => {
  const forecast = await fetchRegionalForecast('Delhi', now, {
    fetchImpl: async (url, options) => {
      assert.equal(url.origin, 'https://air-quality-api.open-meteo.com')
      assert.equal(url.searchParams.get('latitude'), '28.61')
      assert.equal(url.searchParams.get('timezone'), 'Asia/Kolkata')
      assert.equal(options.signal.aborted, false)
      return Response.json({ hourly: { time: ['2026-11-24T16:00'], pm2_5: [8] } })
    },
  })
  assert.equal(forecast.hours[0].pm, 8)
  await assert.rejects(fetchRegionalForecast('unsupported', now), /Unknown city/)
  await assert.rejects(
    fetchRegionalForecast('Delhi', now, {
      fetchImpl: async () => new Response(null, { status: 503 }),
    }),
    /Regional forecast unavailable/,
  )
})

test('cancelling a pending provider request propagates to fetch', async () => {
  const controller = new AbortController()
  const result = fetchRegionalForecast('Delhi', now, {
    signal: controller.signal,
    fetchImpl: (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
      }),
  })
  controller.abort()
  await assert.rejects(result, /cancelled/)
})
