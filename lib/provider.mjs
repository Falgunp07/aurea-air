import { cities } from './planner.mjs'

const HOUR_MS = 3_600_000
const IST_OFFSET = '+05:30'
const ISO_MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

function instant(time) {
  return typeof time === 'string' && ISO_MINUTE.test(time) ? Date.parse(time + IST_OFFSET) : NaN
}

function concentration(value) {
  return Number.isFinite(value) && value >= 0
}

export function freshCurrentReading(current, now = Date.now()) {
  const age = now - instant(current?.time)
  if (!(age >= 0 && age < 2 * HOUR_MS) || !concentration(current.pm2_5)) return null
  return { time: current.time, pm2_5: current.pm2_5 }
}

export function parseForecast(data, now) {
  const hours = []
  const times = data?.hourly?.time
  const values = data?.hourly?.pm2_5

  if (Array.isArray(times) && Array.isArray(values)) {
    for (const [index, time] of times.entries()) {
      const timestamp = instant(time)
      const pm = values[index]
      if (timestamp >= now && timestamp < now + 24 * HOUR_MS && concentration(pm)) {
        hours.push({ time, hour: Number(time.slice(11, 13)), pm })
      }
    }
    hours.sort((first, second) => first.time.localeCompare(second.time))
  }
  return { hours, current: freshCurrentReading(data?.current, now) }
}

export async function fetchRegionalForecast(city, now = Date.now(), options = {}) {
  if (!Object.hasOwn(cities, city)) throw new RangeError('Unknown city')
  const [latitude, longitude] = cities[city]
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: 'pm2_5',
    hourly: 'pm2_5',
    forecast_days: '3',
    timezone: 'Asia/Kolkata',
  })
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = setTimeout(abort, 6500)
  if (options.signal?.aborted) abort()
  else options.signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { signal: controller.signal })
    if (!response.ok) throw new Error('Regional forecast unavailable')
    return parseForecast(await response.json(), now)
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}
