import { supabase } from '../supabase/client'

/**
 * The admin screens talk to Supabase **directly**, as the signed-in staff user.
 *
 * There is no admin server, and that is deliberate: every table policy and every
 * object in the `catalog` bucket already goes through `public.is_staff()`, so a
 * browser holding a staff JWT can be trusted with the writes and a browser
 * without one is refused by Postgres. Putting a server in the middle would add a
 * second place to get authorisation wrong without adding a check.
 *
 * The one thing this cannot do is read facebook.com — a browser is blocked by
 * CORS. That import stays in `vite-dev-api.mts`, i.e. on the owner's machine
 * under `pnpm run dev`; see `unfurlAvailable`.
 */
export function db() {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase — ตั้ง VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY')
  return supabase
}

export const BUCKET = 'catalog'

/** Facebook import needs a server, so it only exists on a dev machine. */
export const unfurlAvailable = import.meta.env.DEV

/**
 * Turns a PostgREST error into something a person can act on.
 *
 * RLS refusals surface as an empty result or a permission error rather than
 * anything self-explanatory, and "new row violates row-level security policy"
 * in a UI means nothing to the person reading it.
 */
export function explain(error: { message?: string; code?: string } | null, action: string): Error {
  const raw = error?.message ?? 'unknown error'
  if (error?.code === '42501' || /row-level security/i.test(raw)) {
    return new Error(`${action}ไม่ได้: บัญชีนี้ไม่มีสิทธิ์พนักงาน (ติดต่อผู้ดูแลเพื่อขอสิทธิ์)`)
  }
  if (/JWT|not authenticated|401/i.test(raw)) {
    return new Error(`${action}ไม่ได้: เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่`)
  }
  return new Error(`${action}ไม่ได้: ${raw}`)
}

const MAX_WIDTH = 1600
const JPEG_QUALITY = 0.85

/**
 * Shrinks a picked file to at most `MAX_WIDTH` and re-encodes it as JPEG.
 *
 * Phone photos are 3–8 MB and 4000px wide; the bucket caps objects at 10 MB and
 * the site never renders anything above ~1600px, so uploading the original
 * wastes the visitor's bandwidth on every page view. Downscale-ONLY — enlarging
 * a small image just makes a bigger file out of the same pixels (the same bug
 * the import script hit with `sips -Z`).
 *
 * Falls back to the untouched file if anything goes wrong: a slightly large
 * photo that uploads beats a clever resize that loses someone's work.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

/** A storage key that cannot collide, keeps the extension, and stays readable. */
function objectPath(folder: string, filename: string, kind: 'portfolio' | 'products'): string {
  const stamp = Date.now().toString(36)
  const safe = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${kind}/${folder}/${stamp}-${safe || 'image'}.jpg`
}

/** Uploads one picked file and returns its path inside the bucket. */
export async function uploadToBucket(
  folder: string,
  file: File,
  kind: 'portfolio' | 'products',
): Promise<string> {
  const blob = await downscaleImage(file)
  const path = objectPath(folder, file.name, kind)
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      // Matches the CLI uploader: short enough that a corrected photo appears,
      // long enough that the CDN does the work. NOT immutable.
      cacheControl: '3600',
      upsert: false,
    })
  if (error) throw explain(error, 'อัปโหลดรูป')
  return path
}

export async function removeFromBucket(path: string): Promise<void> {
  const { error } = await db().storage.from(BUCKET).remove([path])
  // A photo that is already gone is the state we wanted; only surface real
  // failures, or removing a stale thumbnail blocks the whole save.
  if (error && !/not found/i.test(error.message)) throw explain(error, 'ลบรูป')
}
