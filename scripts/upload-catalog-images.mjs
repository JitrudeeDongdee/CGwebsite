/**
 * One-off migration: pushes the catalog photos that currently live in
 * `public/products/` and `public/portfolio/` into the Supabase Storage
 * "catalog" bucket, keeping the same relative paths the app already asks for.
 *
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node scripts/upload-catalog-images.mjs [--delete-local] [--dry-run]
 *
 * --dry-run      list what would be uploaded, touch nothing
 * --delete-local remove the file from public/ after a successful upload, so the
 *                repo stops carrying a second copy that can drift. Left off by
 *                default: run it once without, check the site, then re-run with.
 *
 * Brand assets (public/brand, public/team) are NOT touched — they ship with the
 * build on purpose, so the header logo can't depend on a Storage round trip.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { BUCKET, contentTypeFor, storageConfigured, uploadCatalogImage } from './lib/storage.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FOLDERS = ['products', 'portfolio']
const IMAGE = /\.(jpe?g|png|webp|avif)$/i

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const deleteLocal = args.includes('--delete-local')

if (!dryRun && !storageConfigured()) {
  console.error(
    'upload-catalog-images: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
      '  Supabase → Project Settings → API. The service_role key bypasses RLS: keep it\n' +
      '  in your shell or .env.local (gitignored), never in the repo or the browser.',
  )
  process.exit(1)
}

const files = []
for (const folder of FOLDERS) {
  const dir = join(root, 'public', folder)
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    if (!IMAGE.test(name)) continue
    const full = join(dir, name)
    if (!statSync(full).isFile()) continue
    files.push({ path: `${folder}/${name}`, full })
  }
}

if (files.length === 0) {
  console.log('upload-catalog-images: nothing to upload — public/products and public/portfolio have no images.')
  process.exit(0)
}

let uploaded = 0
for (const file of files) {
  const size = (statSync(file.full).size / 1024).toFixed(0)
  if (dryRun) {
    console.log(`would upload  ${file.path}  (${size} kB)`)
    continue
  }
  const url = await uploadCatalogImage(file.path, readFileSync(file.full), contentTypeFor(file.full))
  uploaded++
  console.log(`uploaded  ${BUCKET}/${file.path}  (${size} kB)\n          ${url}`)
  if (deleteLocal) rmSync(file.full)
}

if (dryRun) {
  console.log(`\n${files.length} file(s) would be uploaded. Re-run without --dry-run to do it.`)
} else {
  console.log(`\n${uploaded} file(s) uploaded to the "${BUCKET}" bucket.`)
  console.log(
    deleteLocal
      ? 'Local copies removed — Storage is now the only source. Commit the deletions.'
      : 'Local copies kept. Check the site, then re-run with --delete-local to drop them.',
  )
}
