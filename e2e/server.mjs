// Run the exact packaged Worker on loopback. Replace only its external forecast
// dependency so browser tests never spend API credit or depend on today's air.
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import worker from '../dist/server/index.js'

function forecastFixture(now) {
  const hour = 3_600_000
  const localTime = (instant) => new Date(instant + 5.5 * hour).toISOString().slice(0, 16)
  const currentHour = Math.floor((now + 5.5 * hour) / hour) * hour - 5.5 * hour
  const time = Array.from({ length: 25 }, (_, index) => localTime(currentHour + index * hour))
  return {
    current: { time: localTime(currentHour), pm2_5: 42 },
    hourly: { time, pm2_5: time.map((_, index) => 42 + index) },
  }
}

globalThis.fetch = async (input) => {
  if (new URL(input).hostname !== 'air-quality-api.open-meteo.com') {
    throw new Error('Unexpected outbound request during browser test')
  }
  return Response.json(forecastFixture(Date.now()))
}

const origin = 'http://127.0.0.1:4287'
createServer(async (incoming, outgoing) => {
  try {
    const init = { method: incoming.method, headers: incoming.headers }
    if (!['GET', 'HEAD'].includes(incoming.method)) {
      init.body = Readable.toWeb(incoming)
      init.duplex = 'half'
    }
    const response = await worker.fetch(new Request(new URL(incoming.url, origin), init), {})
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    outgoing.writeHead(500).end()
  }
}).listen(4287, '127.0.0.1')
