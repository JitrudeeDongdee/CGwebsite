/**
 * Paste a Facebook post link → the post's photo and text land in Supabase.
 *
 *   node scripts/import-from-post.mjs --url "https://www.facebook.com/..." \
 *     --slug pai-chaloem-abt-sadiang --category electronics \
 *     --title-th "ป้ายเฉลิมพระเกียรติ อบต.สะเดียง" [--location-th "เพชรบูรณ์"] \
 *     [--year 2567] [--publish] [--dry-run]
 *
 * What it does: reads the post's Open Graph preview (see lib/facebook.mjs — the
 * link-preview metadata, not a scrape), downloads that photo, resizes it,
 * uploads it to the `catalog` Storage bucket, and upserts a row in
 * public.projects with `source_url` set to the post.
 *
 * The row is a DRAFT (`published = false`) unless you pass --publish, because
 * Facebook only gives us two of the fields the site needs: the photo and a
 * truncated caption. Title, province, year, category and the English half still
 * have to be written by a person — that's a review step, not a limitation to
 * work around.
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (CLI only; see lib/storage.mjs).
 */
import { readFileSync } from 'node:fs'
import { downloadImage, fetchPostPreview } from './lib/facebook.mjs'
import { downscaleJpeg } from './lib/image.mjs'
import { storageConfigured, uploadCatalogImage } from './lib/storage.mjs'

/** Read from the app rather than copied here, so a new category needs one edit. */
const CATEGORIES = [
  ...new Set(
    [...readFileSync(new URL('../src/catalog/categories.tsx', import.meta.url), 'utf8')
      .matchAll(/^\s{2}(\w+):\s*\{ labelKey/gm)].map((m) => m[1]),
  ),
]
const MAX_WIDTH = 1600

function parseArgs(argv) {
  const out = { publish: false, 'dry-run': false }
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    if (key === 'publish' || key === 'dry-run') {
      out[key] = true
      continue
    }
    out[key] = argv[++i]
  }
  return out
}

function fail(message) {
  console.error(`import-from-post: ${message}`)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
const dryRun = args['dry-run']

if (!args.url) fail('--url is required (the public Facebook post link)')
if (!args.slug) fail('--slug is required (lowercase-with-dashes; it becomes the portfolio URL)')
if (!/^[a-z0-9][a-z0-9-]*$/.test(args.slug)) fail(`--slug "${args.slug}" must be lowercase letters, digits and dashes`)

const category = args.category ?? 'house'
if (!CATEGORIES.includes(category)) fail(`--category must be one of ${CATEGORIES.join(', ')}`)
if (!dryRun && !storageConfigured()) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (see .env.example)')

console.log(`reading the post preview…`)
const preview = await fetchPostPreview(args.url)
console.log(`  caption : ${preview.description ? `${preview.description.slice(0, 80)}…` : '(none)'}`)
console.log(`  image   : ${preview.imageUrl ? 'found' : 'NONE — the post may have no photo'}`)
if (preview.description?.endsWith('...') || preview.description?.endsWith('…')) {
  console.log('  note    : Facebook truncates the caption — paste the full text later if you need it.')
}

// Facebook's og:title is only the profile name, so a real title must be given.
const title = {
  th: args['title-th'] ?? args['title-en'] ?? '',
  en: args['title-en'] ?? args['title-th'] ?? '',
}
if (!title.th) fail('--title-th (or --title-en) is required — og:title is just the profile name, not a headline')

const description = {
  th: args['desc-th'] ?? preview.description ?? '',
  en: args['desc-en'] ?? args['desc-th'] ?? preview.description ?? '',
}
const location = {
  th: args['location-th'] ?? args['location-en'] ?? '',
  en: args['location-en'] ?? args['location-th'] ?? '',
}

const storagePath = `portfolio/${args.slug}.jpg`
let imageStored = false

if (preview.imageUrl && !dryRun) {
  const { body, contentType } = await downloadImage(preview.imageUrl)
  const toUpload = downscaleJpeg(body, MAX_WIDTH)
  await uploadCatalogImage(storagePath, toUpload, contentType.startsWith('image/') ? contentType : 'image/jpeg')
  imageStored = true
  console.log(`  stored  : catalog/${storagePath} (${(toUpload.length / 1024).toFixed(0)} kB)`)
}

const row = {
  slug: args.slug,
  title,
  location,
  year: args.year ?? '',
  category,
  ...(args.area ? { area: args.area } : {}),
  description,
  featured: false,
  published: Boolean(args.publish),
  image_path: imageStored ? storagePath : null,
  // The canonical og:url is the same post with a readable path; keep what the
  // person actually pasted, so it matches what they see in their browser.
  source_url: args.url,
}

if (dryRun) {
  console.log('\n--dry-run: nothing uploaded or written. The row would be:\n')
  console.log(JSON.stringify(row, null, 2))
  process.exit(0)
}

const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const credentialsFromEnvFile = !url || !key
if (credentialsFromEnvFile) {
  // lib/storage.mjs already read .env.local for the upload; do the same here.
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const pick = (name) => new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm').exec(env)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  var restUrl = (url || pick('SUPABASE_URL') || pick('VITE_SUPABASE_URL') || '').replace(/\/+$/, '')
  var restKey = key || pick('SUPABASE_SERVICE_ROLE_KEY')
} else {
  var restUrl = url
  var restKey = key
}

const response = await fetch(`${restUrl}/rest/v1/projects?on_conflict=slug`, {
  method: 'POST',
  headers: {
    apikey: restKey,
    Authorization: `Bearer ${restKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(row),
})
if (!response.ok) fail(`writing the row failed: HTTP ${response.status} ${await response.text()}`)

const [saved] = await response.json()
console.log(`\nsaved  projects/${saved.slug}  (published: ${saved.published})`)
console.log(`       ${saved.source_url}`)
if (!saved.published) {
  console.log('\nIt is a DRAFT — the site will not show it yet. Fill in the title/province/')
  console.log('year/English text, then set published = true (or re-run with --publish).')
}
