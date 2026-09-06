/**
 * Pushes the bundled seed catalogue (`src/catalog/products.ts`) into the
 * Supabase `products` table, so the site reads real rows instead of the
 * fallback array — and the admin screens have something to edit.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-products.mjs [--mock-images]
 *
 * Placeholder photos, uploaded to `products/<slug>.jpg`:
 *   --mock-images   a flat brand-colour card with the product's name
 *   --drawn-images  a flat vector illustration of the product (scripts/lib/draw-product.py)
 *   --web-images    a stock photo matching the product, fetched from LoremFlickr
 *
 * ⚠️ `--web-images` pulls other people's Flickr photos through a placeholder
 * service. They are stand-ins for layout only — NOT licensed as this company's
 * marketing images. Every one carries a small "ภาพตัวอย่าง" tag, and they must be
 * replaced with real photos of real work before the site goes public.
 *
 * Re-running is safe: rows are matched on `slug` and updated in place.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { downscaleJpeg } from './lib/image.mjs'
import { storageConfigured, uploadCatalogImage } from './lib/storage.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const withMockImages = process.argv.includes('--mock-images')
const withWebImages = process.argv.includes('--web-images')
const withDrawnImages = process.argv.includes('--drawn-images')

/** What each product should look like, for the stock-photo search. */
const PHOTO_KEYWORDS = {
  // One strong noun beats a phrase here: LoremFlickr matches ANY tag, so
  // "modern,house" happily returns a modern car park. Comma lists are only used
  // where both words are needed to pin the subject down.
  'studio-6x4': 'tinyhouse',
  'one-bed-6x6': 'bungalow',
  'two-bed-8x6': 'house',
  'three-bed-9x6': 'cottage',
  'smart-home-system': 'thermostat',
  'electrical-control-cabinet': 'fusebox',
  'built-in-kitchen': 'kitchen,interior',
  'built-in-wardrobe': 'wardrobe,furniture',
  'backhoe-rental': 'excavator',
  'crane-truck-rental': 'crane',
  'fiber-optic-cabling': 'fiberoptic',
  'electrical-systems': 'electrician',
}

/** Changes which photo each keyword returns, for when one comes back unusable. */
const photoLock = Number(/--lock=(\d+)/.exec(process.argv.join(' '))?.[1] ?? 1)
/** Limits the run to certain slugs, for re-rolling just the photos that missed. */
const onlySlugs = (/--only=([^\s]+)/.exec(process.argv.join(' '))?.[1] ?? '').split(',').filter(Boolean)

/**
 * The seed array, read straight out of the TS file: the literal between the
 * brackets is plain JavaScript. The `const` declarations above it (shorthands
 * like `perDay`) come along too, since the literal references them.
 */
function seedProducts() {
  const src = readFileSync(join(root, 'src/catalog/products.ts'), 'utf8')
  const start = src.indexOf('export const PRODUCTS')
  const open = src.indexOf('[', start)
  const end = src.indexOf('\n]', open)
  if (start < 0 || open < 0 || end < 0) throw new Error('could not find PRODUCTS in products.ts')

  const preamble = src
    .slice(0, start)
    .split('\n')
    .filter((line) => /^const\s/.test(line))
    .join('\n')
  return new Function(`${preamble}\nreturn ${src.slice(open, end + 2)}`)()
}

function credentials() {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  const pick = (name) => new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm').exec(env)?.[1].trim()
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? pick('VITE_SUPABASE_URL') ?? '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? pick('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  return { url, key }
}

const { url, key } = credentials()
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

/** Flat placeholder: brand colour block, the product name, and the word MOCK. */
function mockImage(product) {
  const colours = {
    house: '#1B4965',
    electronics: '#3B6D11',
    furniture: '#C1663F',
    rental: '#854F0B',
    contracting: '#0F6E56',
  }
  const script = `
from PIL import Image, ImageDraw, ImageFont
import sys
w, h = 1200, 900
img = Image.new('RGB', (w, h), '${colours[product.category] ?? '#1B4965'}')
d = ImageDraw.Draw(img)
d.rectangle([0, h - 120, w, h], fill='#00000033')
thai = '/System/Library/Fonts/Supplemental/Ayuthaya.ttf'
try:
    name = ImageFont.truetype(thai, 54)
    small = ImageFont.truetype(thai, 30)
except OSError:
    name = small = ImageFont.load_default()
d.text((60, 360), sys.argv[1][:34], font=name, fill='#FFFFFF')
d.text((60, h - 92), 'MOCK IMAGE — ' + sys.argv[2], font=small, fill='#FFFFFFCC')
img.save(sys.argv[3], quality=85)
`
  const out = `/tmp/mock-${product.slug}.jpg`
  execFileSync('python3', ['-c', script, product.name.th, product.slug, out], { stdio: ['ignore', 'ignore', 'pipe'] })
  return readFileSync(out)
}

/**
 * A flat illustration of the product, drawn by us — on-topic by construction,
 * with no licence question, unlike the stock photos below. Only some slugs have
 * a drawing; the rest fall back to the flat colour card.
 */
function drawnImage(product) {
  const out = `/tmp/drawn-${product.slug}.jpg`
  try {
    execFileSync('python3', [join(root, 'scripts/lib/draw-product.py'), product.slug, product.name.th, out], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  } catch {
    return mockImage(product)
  }
  return readFileSync(out)
}

/**
 * A stock photo for this product, tagged so it can't be mistaken for real work.
 * LoremFlickr keeps the keyword relevant; Picsum is the fallback when it fails.
 */
async function webImage(product) {
  const keywords = PHOTO_KEYWORDS[product.slug] ?? product.category
  const sources = [
    // A comma list means "must match ALL of these" (`/all`), which is the only
    // way to keep a two-word subject from drifting — "kitchen,interior" without
    // it happily returns a photo tagged only "interior".
    `https://loremflickr.com/1200/900/${keywords}${keywords.includes(',') ? '/all' : ''}?lock=${photoLock}`,
    `https://picsum.photos/seed/${product.slug}/1200/900`,
  ]
  for (const source of sources) {
    try {
      const response = await fetch(source, { redirect: 'follow' })
      if (!response.ok) continue
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length < 5000) continue
      return tagAsSample(bytes)
    } catch {
      // try the next source
    }
  }
  throw new Error(`could not fetch a photo for ${product.slug}`)
}

/** Writes a small "ภาพตัวอย่าง" (sample) tag into the corner. */
function tagAsSample(bytes) {
  const inPath = `/tmp/web-in-${Date.now().toString(36)}.jpg`
  const outPath = inPath.replace('-in-', '-out-')
  writeFileSync(inPath, bytes)
  const script = `
from PIL import Image, ImageDraw, ImageFont
import sys
img = Image.open(sys.argv[1]).convert('RGB')
d = ImageDraw.Draw(img, 'RGBA')
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Ayuthaya.ttf', max(18, img.width // 46))
except OSError:
    font = ImageFont.load_default()
text = 'ภาพตัวอย่าง'
box = d.textbbox((0, 0), text, font=font)
pad = box[3] // 2 + 6
w, h = box[2] - box[0] + pad * 2, box[3] - box[1] + pad * 2
d.rectangle([12, img.height - h - 12, 12 + w, img.height - 12], fill=(0, 0, 0, 130))
d.text((12 + pad, img.height - h - 12 + pad - box[1]), text, font=font, fill=(255, 255, 255, 235))
img.save(sys.argv[2], quality=85)
`
  execFileSync('python3', ['-c', script, inPath, outPath], { stdio: ['ignore', 'ignore', 'pipe'] })
  return readFileSync(outPath)
}

const rows = seedProducts()
console.log(`seeding ${rows.length} products…`)

for (const product of rows) {
  if (onlySlugs.length > 0 && !onlySlugs.includes(product.slug)) continue
  let imagePath = null
  if ((withMockImages || withWebImages || withDrawnImages) && storageConfigured()) {
    const source = withWebImages ? await webImage(product) : withDrawnImages ? drawnImage(product) : mockImage(product)
    const bytes = downscaleJpeg(source, 1600)
    // The filename carries a hash of the bytes. Re-running with a different photo
    // writes a NEW url, so a browser that cached the old one still sees the change
    // — overwriting `products/<slug>.jpg` left viewers on the stale copy for an hour.
    const version = createHash('sha1').update(bytes).digest('hex').slice(0, 8)
    imagePath = `products/${product.slug}-${version}.jpg`
    await uploadCatalogImage(imagePath, bytes, 'image/jpeg')
  }

  const payload = {
    slug: product.slug,
    category: product.category,
    name: product.name,
    short_desc: product.shortDesc,
    price_from: product.priceFrom,
    price_unit: product.priceUnit ?? null,
    specs: product.specs ?? [],
    featured: Boolean(product.featured),
    best_seller: Boolean(product.bestSeller),
    published: true,
    ...(imagePath ? { image_path: imagePath, images: [imagePath] } : {}),
  }

  const [existing] = await (
    await fetch(`${url}/rest/v1/products?slug=eq.${product.slug}&select=id`, { headers })
  ).json()

  const response = await fetch(
    existing ? `${url}/rest/v1/products?id=eq.${existing.id}` : `${url}/rest/v1/products`,
    {
      method: existing ? 'PATCH' : 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) throw new Error(`${product.slug}: ${response.status} ${await response.text()}`)
  console.log(
    `  ${existing ? 'updated' : 'inserted'}  ${product.slug}${imagePath ? (withWebImages ? '  + stock photo' : withDrawnImages ? '  + drawing' : '  + mock image') : ''}`,
  )
}

console.log(
  withWebImages
    ? '\nDone. These are STOCK photos standing in for real ones — not licensed as this\n' +
        "company's own work. Replace them in /admin/products before the site is public."
    : '\nDone. The mock images are placeholders — replace them in /admin/products.',
)
