/**
 * Uploading to the Supabase Storage "catalog" bucket from the command line.
 *
 * Uses the **service role key**, which bypasses RLS — that is why this lives in
 * a CLI script and never in `src/`. Pass it per command or keep it in a local
 * `.env.local` (gitignored); never commit it and never expose it to the browser:
 *
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node scripts/upload-catalog-images.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { downscaleJpeg } from './image.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const BUCKET = 'catalog'

/**
 * Thumbnails mirror the original's path under a `thumbs/` prefix:
 * `portfolio/foo.jpg` -> `thumbs/portfolio/foo.jpg`.
 *
 * ⚠️ The same rule lives in `src/supabase/storage.ts` for the browser — scripts
 * are plain .mjs and cannot import the TypeScript module. Change both.
 */
export const THUMB_PREFIX = 'thumbs/'
export const THUMB_WIDTH = 400

export function thumbPath(path) {
  const clean = String(path).replace(/^\/+/, '')
  return clean.startsWith(THUMB_PREFIX) ? clean : `${THUMB_PREFIX}${clean}`
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** Reads SUPABASE_* from the environment, falling back to a local .env.local. */
function credentials() {
  let url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const envFile = join(root, '.env.local')
  if ((!url || !key) && existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (!match) continue
      const [, name, value] = match
      const clean = value.replace(/^['"]|['"]$/g, '')
      if (!url && (name === 'SUPABASE_URL' || name === 'VITE_SUPABASE_URL')) url = clean
      if (!key && name === 'SUPABASE_SERVICE_ROLE_KEY') key = clean
    }
  }
  return { url: url?.replace(/\/+$/, ''), key }
}

export function storageConfigured() {
  const { url, key } = credentials()
  return Boolean(url && key)
}

/**
 * How long the CDN may serve a catalog image before revalidating.
 *
 * NOT `immutable` / one year: these objects are addressed by a stable path
 * (`portfolio/<slug>.jpg`), so re-importing a job with a corrected photo writes
 * over the same key. With an immutable year-long TTL the CDN would keep serving
 * the old photo — verified: after deleting an object, the public URL still
 * returned it with `cf-cache-status: HIT`. An hour of caching plus a day of
 * stale-while-revalidate keeps images fast without making a correction invisible.
 */
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400'

/**
 * Uploads one object, replacing whatever was there (`x-upsert`), so re-running
 * an import after fixing a photo is safe rather than a duplicate.
 * Returns the public URL.
 */
export async function uploadCatalogImage(path, body, contentType) {
  const publicUrl = await putObject(path, body, contentType)

  // Every CLI importer goes through here, so writing the thumbnail at this one
  // point means `import-from-post`, `import-project`, `seed-products` and the
  // bulk uploader all produce one without knowing about it.
  if (!String(path).startsWith(THUMB_PREFIX)) {
    try {
      const small = downscaleJpeg(body, THUMB_WIDTH)
      await putObject(thumbPath(path), small, 'image/jpeg')
    } catch (e) {
      // Best-effort: the full image is already stored and readers fall back to
      // it. Losing an import over a thumbnail would be the worse trade.
      console.warn(`  ! thumbnail for ${path} failed: ${e.message}`)
    }
  }
  return publicUrl
}

async function putObject(path, body, contentType) {
  const { url, key } = credentials()
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to upload')

  const endpoint = `${url}/storage/v1/object/${BUCKET}/${path}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'Cache-Control': CACHE_CONTROL,
    },
    body,
  })
  if (!response.ok) {
    throw new Error(`upload ${path} failed: ${response.status} ${await response.text()}`)
  }
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`
}

/** Removes one object from the bucket. Missing objects are not an error. */
export async function deleteCatalogImage(path) {
  const { url, key } = credentials()
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to delete')
  // The thumbnail goes with the original — nothing lists the bucket, so an
  // orphan under thumbs/ would never be found again.
  const targets = String(path).startsWith(THUMB_PREFIX) ? [path] : [path, thumbPath(path)]
  for (const target of targets) {
    const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${target}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`delete ${target} failed: ${response.status} ${await response.text()}`)
    }
  }
}

export function contentTypeFor(file) {
  if (/\.png$/i.test(file)) return 'image/png'
  if (/\.webp$/i.test(file)) return 'image/webp'
  if (/\.avif$/i.test(file)) return 'image/avif'
  return 'image/jpeg'
}
