import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { relative, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// The host accepts a single Worker. Bundle the same API modules used by Next.js
// and ship its prerendered document and fingerprinted browser assets alongside them.
const html = await readFile('.next/server/app/index.html', 'utf8')
const staticRoot = new URL('../.next/static/', import.meta.url)
const assets = { '/': html }

for (const file of await readdir(staticRoot, { recursive: true, withFileTypes: true })) {
  if (!file.isFile() || !/\.(css|js)$/.test(file.name)) continue

  const path = join(file.parentPath, file.name)

  const key = relative(fileURLToPath(staticRoot), path).split(sep).join('/')
  assets['/_next/static/' + key] = await readFile(path, 'utf8')
}

// Next embeds its hydration data in inline scripts. Authorize only the exact
// scripts emitted by this build, rather than allowing arbitrary inline script.
const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter(Boolean)
  .map((script) => "'sha256-" + createHash('sha256').update(script).digest('base64') + "'")

await build({
  stdin: {
    contents: `import { createWorker } from './hosting/worker.mjs';
export default createWorker(${JSON.stringify(assets)}, ${JSON.stringify(hashes)});`,
    resolveDir: process.cwd(),
    sourcefile: 'packaged-worker.mjs',
  },
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
})
