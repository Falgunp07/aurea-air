import { baseline, cities, valid } from './planner.mjs'
import { fetchRegionalForecast, freshCurrentReading } from './provider.mjs'
import { generateSummary } from './gemini.mjs'
import { readProfile, RequestError } from './request-body.mjs'

const FORECAST_TTL_MS = 10 * 60_000
const EMPTY_TTL_MS = 15_000
const AI_BURST_PER_MINUTE = 12

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders },
  })
}

function methodError(allowed) {
  return json({ error: 'Method not allowed.' }, 405, { Allow: allowed })
}

function crossOrigin(request, url) {
  const origin = request.headers.get('origin')
  return (
    (origin !== null && origin !== url.origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
}

export function createAirService({
  clock = Date.now,
  loadForecast = fetchRegionalForecast,
  summarize = generateSummary,
} = {}) {
  const forecastCache = new Map()
  const inFlight = new Map()
  let resetAt = 0
  let calls = 0

  async function refresh(city, now) {
    let data
    try {
      data = await loadForecast(city, now)
    } catch {
      data = { hours: [], current: null }
    }
    const ttl = data.hours.length || data.current ? FORECAST_TTL_MS : EMPTY_TTL_MS
    const entry = { data, expires: clock() + ttl }
    forecastCache.set(city, entry)
    return entry
  }

  // Only plain forecast records cross the cache boundary. Concurrent visitors share
  // one refresh per city; the response stream belongs to the originating fetch.
  async function forecast(city) {
    let entry = forecastCache.get(city)
    const now = clock()
    if (!entry || now >= entry.expires) {
      if (!inFlight.has(city)) {
        const pending = refresh(city, now).finally(() => inFlight.delete(city))
        inFlight.set(city, pending)
      }
      entry = await inFlight.get(city)
    }
    const timestamp = clock()
    const hours = entry.data.hours.filter((row) => Date.parse(row.time + '+05:30') >= timestamp)
    return { hours, current: freshCurrentReading(entry.data.current, timestamp) }
  }

  // Cap optional, paid generations per running instance. A caller can always receive
  // the deterministic plan, even when model capacity is temporarily exhausted.
  function takeModelSlot() {
    const now = clock()
    if (now >= resetAt) {
      calls = 0
      resetAt = now + 60_000
    }
    if (calls >= AI_BURST_PER_MINUTE) return false
    calls += 1
    return true
  }

  return async function handle(request, env = {}) {
    const url = new URL(request.url)
    if (url.pathname === '/api/forecast') {
      if (request.method !== 'GET') return methodError('GET')
      const city = url.searchParams.get('city')
      if (!Object.hasOwn(cities, city)) return json({ error: 'Unknown city.' }, 400)
      return json(await forecast(city))
    }
    if (url.pathname !== '/api/plan') return json({ error: 'Unknown endpoint.' }, 404)
    if (request.method !== 'POST') return methodError('POST')
    if (crossOrigin(request, url)) return json({ error: 'Use the planner on this site.' }, 403)

    let profile
    try {
      profile = await readProfile(request)
    } catch (error) {
      if (!(error instanceof RequestError)) throw error
      return json({ error: error.message }, error.status)
    }
    if (!valid(profile))
      return json({ error: 'Please check your routine, city and time window.' }, 400)

    const air = await forecast(profile.city)
    const plan = baseline(profile, air.hours, clock())
    plan.forecastAvailable = air.hours.length > 0
    if (env.GEMINI_API_KEY && takeModelSlot()) {
      const summary = await summarize(profile, plan, env)
      if (summary) return json({ ...plan, summary, source: 'Gemini-assisted plan' })
    }
    return json(plan)
  }
}

export const handle = createAirService()
