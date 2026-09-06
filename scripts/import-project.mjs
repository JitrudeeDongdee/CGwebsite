/**
 * Adds one portfolio item from a Facebook post — WITHOUT scraping Facebook.
 *
 * You save the post's photo yourself (right-click → Save image) and copy its
 * text; this script does the mechanical part: resizes the photo, uploads it to
 * the Supabase Storage bucket (or writes it under public/ when Storage isn't
 * configured) and prints the SQL to insert the row into Supabase — plus the
 * equivalent seed entry, if you'd rather paste it into src/catalog/projects.ts.
 *
 * Uploading needs two env vars, which must NOT be committed:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # bypasses RLS — CLI only
 *
 * Why not fetch the post automatically: Meta's terms don't allow scraping,
 * personal profiles have no read API at all, and a post's photo URLs expire
 * within hours — so an imported copy is the only thing that keeps working.
 *
 * Usage:
 *   node scripts/import-project.mjs \
 *     --slug ban-2-chan-phetchabun \
 *     --image ~/Desktop/post.jpg \
 *     --title-th "บ้าน 2 ชั้น เพชรบูรณ์" --title-en "Two-storey house, Phetchabun" \
 *     --location-th "เพชรบูรณ์" --location-en "Phetchabun" \
 *     --year 2567 --category house --area "120 ตร.ม." \
 *     --desc-th "..." --desc-en "..." \
 *     --source-url "https://www.facebook.com/..." \
 *     [--featured]
 *
 * Everything except --slug and --image is optional; missing bilingual halves
 * fall back to the other language so nothing renders empty.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { downscaleJpeg } from './lib/image.mjs'
import { uploadCatalogImage, storageConfigured } from './lib/storage.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATEGORIES = ['house', 'electronics', 'furniture', 'rental']
/** Portfolio cards are 4:3 and detail heroes 16:9; 1600px wide covers both. */
const MAX_WIDTH = 1600

function parseArgs(argv) {
  const out = { featured: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    if (key === 'featured') {
      out.featured = true
      continue
    }
    out[key] = argv[++i]
  }
  return out
}

function fail(message) {
  console.error(`import-project: ${message}`)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.slug) fail('--slug is required (lowercase-with-dashes; it becomes the URL and the image name)')
if (!/^[a-z0-9][a-z0-9-]*$/.test(args.slug)) fail(`--slug "${args.slug}" must be lowercase letters, digits and dashes`)
if (!args.image) fail('--image is required — save the photo from the post first, then pass its path')

const source = resolve(args.image.replace(/^~/, process.env.HOME ?? '~'))
if (!existsSync(source)) fail(`no such image: ${source}`)

const category = args.category ?? 'house'
if (!CATEGORIES.includes(category)) fail(`--category must be one of ${CATEGORIES.join(', ')}`)

if (args['source-url'] && !/^https?:\/\//.test(args['source-url'])) fail('--source-url must start with http(s)://')

// Bilingual fields: whichever half is given stands in for the missing one, so a
// half-filled record still renders instead of showing a blank in one language.
const pair = (th, en) => {
  const both = { th: th ?? en ?? '', en: en ?? th ?? '' }
  return both
}
const title = pair(args['title-th'], args['title-en'])
if (!title.th) fail('--title-th (or --title-en) is required')
const location = pair(args['location-th'], args['location-en'])
const description = pair(args['desc-th'], args['desc-en'])

// Resize into a temp-ish location first; where it ends up depends on whether
// Storage is configured.
const storagePath = `portfolio/${args.slug}.jpg`
const outDir = join(root, 'public/portfolio')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, `${args.slug}.jpg`)

// Only ever downscales; a photo already narrower than MAX_WIDTH is written as
// it is, and a machine without sips falls back to a plain copy.
writeFileSync(outFile, downscaleJpeg(readFileSync(source), MAX_WIDTH))

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`
const nullable = (value) => (value ? sqlString(value) : 'null')

if (storageConfigured()) {
  await uploadCatalogImage(storagePath, readFileSync(outFile), 'image/jpeg')
  // The repo copy would be a second, silently diverging source of the same
  // photo — Storage is the one that the deployed site reads.
  rmSync(outFile)
  console.log(`\nimage → Storage: catalog/${storagePath}\n`)
} else {
  console.log(`\nimage → public/${storagePath}  (Storage not configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to upload instead)\n`)
}
console.log('--- Supabase → SQL Editor -------------------------------------------------')
console.log(`insert into public.projects
  (slug, title, location, year, category, area, description, featured, published, image_path, source_url)
values
  (${sqlString(args.slug)},
   ${sqlJson(title)},
   ${sqlJson(location)},
   ${nullable(args.year)},
   ${sqlString(category)},
   ${nullable(args.area)},
   ${sqlJson(description)},
   ${args.featured},
   true,
   ${sqlString(`portfolio/${args.slug}.jpg`)},
   ${nullable(args['source-url'])})
on conflict (slug) do update set
  title = excluded.title, location = excluded.location, year = excluded.year,
  category = excluded.category, area = excluded.area, description = excluded.description,
  featured = excluded.featured, image_path = excluded.image_path,
  source_url = excluded.source_url, updated_at = now();`)

console.log('\n--- or paste into src/catalog/projects.ts (PROJECTS) -----------------------')
const seed = {
  id: `j-${args.slug}`,
  slug: args.slug,
  title,
  location,
  year: args.year ?? '',
  category,
  ...(args.area ? { area: args.area } : {}),
  description,
  featured: args.featured,
  ...(args['source-url'] ? { sourceUrl: args['source-url'] } : {}),
}
console.log(
  JSON.stringify(seed, null, 2)
    .replace(/"([a-zA-Z]+)":/g, '$1:')
    .replace(/"/g, "'") + ',',
)
console.log('\nRemember: only publish photos you have the right to use — get the')
console.log("homeowner's consent before putting their house or face on the site.\n")
