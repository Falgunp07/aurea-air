import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorker } from '../hosting/worker.mjs'

const asset = '/_next/static/chunks/abc.js'
const site = createWorker({ '/': '<html></html>', [asset]: 'void 0' }, ["'sha256-test'"])
const get = (path, method = 'GET') =>
  site.fetch(new Request('https://example.test' + path, { method }), {})

test('documents revalidate and only authorize the generated inline scripts', async () => {
  const document = await get('/')
  assert.equal(document.status, 200)
  assert.equal(document.headers.get('Cache-Control'), 'no-cache')
  const policy = document.headers.get('Content-Security-Policy')
  assert.match(policy, /script-src 'self' 'sha256-test'/)
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/)
})

test('hashed JS has a strict MIME type and can be cached between visits', async () => {
  const response = await get(asset, 'HEAD')
  assert.equal(await response.text(), '')
  assert.match(response.headers.get('Content-Type'), /javascript/)
  assert.match(response.headers.get('Cache-Control'), /immutable/)
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
})

test('unpublished paths and unsupported document methods are rejected', async () => {
  assert.equal((await get('/.env.local')).status, 404)
  assert.equal((await get('/constructor')).status, 404)
  const response = await get('/', 'POST')
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('Allow'), 'GET, HEAD')
})
