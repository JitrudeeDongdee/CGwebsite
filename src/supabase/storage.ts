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
