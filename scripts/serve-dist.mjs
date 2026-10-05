/**
 * Serves `dist/` the way Cloudflare Pages does, for checking a prerendered
 * build locally. `pnpm run preview` cannot be used for this: Vite applies its
 * own SPA fallback first and returns index.html for every route, so prerendered
 * pages look broken (or, worse, look fine while being wrong).
 *
 * The rules that matter, in order:
 *   1. an exact file            → serve it
 *   2. `<path>.html`            → serve it, 200, no redirect
 *   3. `<path>/index.html`      → **308 to `<path>/`** — this is the trap. A
 *      directory index makes Pages enforce the trailing slash, which puts a
 *      redirect in front of every internal link and makes the canonical
 *      disagree with the URL serving the page. Modelled here so it is caught
 *      before a deploy, not after.
 *   4. otherwise                → the `/* → /index.html` SPA fallback
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const dist = process.argv[2] ?? 'dist'
const port = Number(process.argv[3] ?? 4175)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.xml': 'application/xml', '.txt': 'text/plain',
}
const isFile = (p) => existsSync(p) && statSync(p).isFile()

createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0])
  const direct = join(dist, path)

  if (isFile(direct)) return send(res, direct)
  if (isFile(`${direct}.html`)) return send(res, `${direct}.html`)
  if (!path.endsWith('/') && isFile(join(direct, 'index.html'))) {
    res.writeHead(308, { location: `${path}/` })
    return res.end()
  }
  if (isFile(join(direct, 'index.html'))) return send(res, join(direct, 'index.html'))
  send(res, join(dist, 'index.html'))
}).listen(port, () => console.log(`serving ${dist} like Cloudflare Pages on http://localhost:${port}`))

function send(res, file) {
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
}
