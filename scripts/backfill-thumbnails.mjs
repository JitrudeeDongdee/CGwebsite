/**
 * Creates the missing small copies for images already in the `catalog` bucket.
 *
 * Thumbnails are written at upload time, but everything uploaded before that
 * existed has none — and Storage answers 404 rather than falling back, so those
 * rows keep serving 250-450 kB originals into a listing screen until this runs.
 *
 *   node scripts/backfill-thumbnails.mjs [--dry-run] [--force]
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (CLI only — the key bypasses
 * RLS and must never reach the browser). Safe to re-run: an object that already
 * has a thumbnail is skipped unless --force.
 */
import { BUCKET, THUMB_PREFIX, THUMB_WIDTH, thumbPath, storageConfigured } from './lib/storage.mjs'
import { downscaleJpeg } from './lib/image.mjs'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

function credentials() {
  let url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const envFile = join(root, '.env.local')
  if ((!url || !key) && existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (!m) continue
      const v = m[2].replace(/^['"]|['"]$/g, '')
      if (!url && (m[1] === 'SUPABASE_URL' || m[1] === 'VITE_SUPABASE_URL')) url = v
      if (!key && m[1] === 'SUPABASE_SERVICE_ROLE_KEY') key = v
    }
  }
  return { url: url?.replace(/\/+$/, ''), key }
}

const { url, key } = credentials()
if (!storageConfigured()) {
  console.error('backfill: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
  process.exit(1)
}
const headers = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }

/** Lists one folder. Storage's list API is per-prefix, so this walks the tree. */
async function listFolder(prefix) {
  const out = []
  let offset = 0
  for (;;) {
    const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`list ${prefix} failed: ${res.status} ${await res.text()}`)
    const page = await res.json()
    out.push(...page)
    if (page.length < 100) break
    offset += page.length
  }
  return out
}

/** A folder entry has no id; a real object does. */
async function walk(prefix = '') {
  const files = []
  for (const entry of await listFolder(prefix)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id) files.push(path)
    else files.push(...(await walk(path)))
  }
  return files
}

const all = await walk()
const originals = all.filter((p) => !p.startsWith(THUMB_PREFIX) && /\.(jpe?g|png|webp|avif)$/i.test(p))
const existing = new Set(all.filter((p) => p.startsWith(THUMB_PREFIX)))

console.log(`backfill: ${originals.length} images, ${existing.size} thumbnails already present`)

let made = 0
let skipped = 0
let failed = 0
for (const path of originals) {
  const target = thumbPath(path)
  if (!force && existing.has(target)) {
    skipped += 1
    continue
  }
  if (dryRun) {
    console.log(`  would create ${target}`)
    made += 1
    continue
  }
  try {
    const res = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${path}`)
    if (!res.ok) throw new Error(`download ${res.status}`)
    const body = Buffer.from(await res.arrayBuffer())
    const small = downscaleJpeg(body, THUMB_WIDTH)
    const put = await fetch(`${url}/storage/v1/object/${BUCKET}/${target}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
      body: small,
    })
    if (!put.ok) throw new Error(`upload ${put.status} ${await put.text()}`)
    console.log(`  ${target}  ${(body.length / 1024) | 0} kB -> ${(small.length / 1024) | 0} kB`)
    made += 1
  } catch (e) {
    console.warn(`  ! ${path}: ${e.message}`)
    failed += 1
  }
}

console.log(`backfill: ${made} created${dryRun ? ' (dry run)' : ''}, ${skipped} skipped, ${failed} failed`)
if (failed > 0) process.exitCode = 1
