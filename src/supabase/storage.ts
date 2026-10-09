import { supabase } from './client'

/**
 * Where catalog images live once Supabase is configured: a public bucket, so a
 * plain <img src> works with no signing and no request per image.
 * Created by supabase/migrations/20260907090000_catalog_storage.sql.
 */
export const CATALOG_BUCKET = 'catalog'

/**
 * Resolves an image path to a URL the browser can load.
 *
 * The SAME relative path (`portfolio/ban-chaiyaphum-2f.jpg`) works in both
 * worlds: it's a key in the Storage bucket when Supabase is configured, and a
 * file under `public/` when it isn't. That keeps a fresh checkout, CI and a
 * preview build rendering without any Supabase project at all — the seed
 * catalog and the committed images just keep working.
 *
 * An absolute URL is passed through untouched, so a row can point anywhere.
 * Anything missing returns undefined and `SmartImage` shows its placeholder.
 */
export function imageUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path

  const clean = path.replace(/^\/+/, '')
  if (!supabase) return `${import.meta.env.BASE_URL}${clean}`

  return supabase.storage.from(CATALOG_BUCKET).getPublicUrl(clean).data.publicUrl
}

/**
 * Thumbnails live under a `thumbs/` prefix mirroring the original's path:
 * `portfolio/foo.jpg` -> `thumbs/portfolio/foo.jpg`.
 *
 * A prefix rather than a `-thumb` suffix so the two never interleave in the
 * bucket browser, a whole folder can be regenerated or dropped in one go, and —
 * the reason that actually matters — the uploader can tell a thumbnail from an
 * original by its path alone and not try to make a thumbnail of a thumbnail.
 *
 * ⚠️ The same rule is implemented for the CLI in `scripts/lib/storage.mjs`
 * (scripts are plain .mjs and cannot import this module). Change both.
 */
export const THUMB_PREFIX = 'thumbs/'

/** Where the thumbnail of `path` lives, or undefined when `path` has none. */
export function thumbPath(path?: string): string | undefined {
  if (!path) return undefined
  // An absolute URL is somebody else's image; we never made a thumbnail of it.
  if (/^https?:\/\//i.test(path)) return undefined
  const clean = path.replace(/^\/+/, '')
  if (clean.startsWith(THUMB_PREFIX)) return clean
  return `${THUMB_PREFIX}${clean}`
}

/**
 * URL of the small version of `path` — a few tens of kB instead of the
 * 250-450 kB original, which matters on a listing screen showing thirty of them.
 *
 * Objects uploaded before thumbnails existed have none, and Storage answers 404
 * rather than falling back, so **every caller must handle the error** and swap
 * in `imageUrl(path)`. `scripts/backfill-thumbnails.mjs` fills in the gap for
 * what is already in the bucket.
 */
export function thumbUrl(path?: string): string | undefined {
  const thumb = thumbPath(path)
  if (!thumb) return imageUrl(path)
  return imageUrl(thumb)
}

/**
 * Certificate scans and PDFs (see the company_info migration). Separate from
 * `catalog` because that bucket only accepts images.
 */
export const DOCUMENTS_BUCKET = 'documents'

/** Public URL of a file in the documents bucket, or undefined without Supabase. */
export function documentUrl(path: string): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return supabase?.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path.replace(/^\/+/, '')).data.publicUrl
}
