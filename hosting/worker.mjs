import { handle } from '../lib/service.mjs'

const apiRoutes = new Set(['/api/forecast', '/api/plan'])

export function createWorker(assets, scriptHashes) {
  const policy = [
    "default-src 'self'",
    ["script-src 'self'", ...scriptHashes].join(' '),
    "style-src 'self'",
    "connect-src 'self' https://air-quality-api.open-meteo.com",
    "img-src 'self' data:",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
  ].join('; ')

  return {
    async fetch(request, env) {
      const path = new URL(request.url).pathname
      if (apiRoutes.has(path)) return handle(request, env)
      if (!Object.hasOwn(assets, path)) return new Response('Not found', { status: 404 })

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
      }

      const isDocument = path === '/'
      const type = isDocument ? 'text/html' : path.endsWith('.css') ? 'text/css' : 'text/javascript'
      return new Response(request.method === 'HEAD' ? null : assets[path], {
        headers: {
          'Content-Type': type + '; charset=utf-8',
          'Content-Security-Policy': policy,
          'Cache-Control': isDocument ? 'no-cache' : 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        },
      })
    },
  }
}
