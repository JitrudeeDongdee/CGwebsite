/**
 * Prerenders every content route to its own HTML file, after `vite build`.
 *
 * The problem it solves: this is a client-rendered SPA, so every URL shipped the
 * same `index.html` with an empty `<div id="root">` and one site-wide `<title>`
 * / OG card. Google renders JS and coped. **Facebook and LINE do not run JS**,
 * so every shared link — a product, a project, the About page — previewed as the
 * same generic card. Per-page `<head>` is the whole point; the rendered body is
 * the bonus (and what a non-JS crawler reads).
 *
 * How it runs:
 *   1. `vite build`             → the client bundle + dist/index.html template
 *   2. `vite build --ssr`       → a Node build of src/entry-server.tsx
 *   3. this script              → fetch the catalogue, render each route, write
 *                                 dist/<route>/index.html
 *
 * Cloudflare Pages serves a matching static file BEFORE the `/* → /index.html`
 * rule in `_redirects`, so `dist/about/index.html` is what `/about` returns and
 * the SPA fallback still covers everything else.
 *
 * Routes deliberately NOT prerendered: `/design` (a three.js canvas — nothing
 * useful in HTML and it would pull three.js into the build's Node process),
 * `/admin/*` and `/login` (private, and robots.txt already disallows them).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ARTICLES = JSON.parse(readFileSync(join(root, 'src/content/articles.json'), 'utf8'))
const dist = join(root, 'dist')
const serverEntry = join(root, 'dist-ssr/entry-server.js')

const site = (process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? '').replace(/\/+$/, '')
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!existsSync(serverEntry)) {
  throw new Error(`[prerender] missing ${serverEntry} — run the SSR build first (pnpm run build:ssr)`)
}

// Without Supabase there is no catalogue to render, and `fetch('/rest/v1/…')`
// dies on "Invalid URL" and takes the whole build with it. That is what broke
// every Cloudflare *preview* build: Pages keeps Preview and Production env vars
// separately, and only Production had VITE_SUPABASE_*.
//
// Skipping is safe there — the SPA fallback still serves every route, just
// without per-page HTML. On a production deploy it is not: shipping without
// prerender silently undoes the SEO work, so that case still fails loudly.
const branch = process.env.CF_PAGES_BRANCH ?? process.env.WORKERS_CI_BRANCH
if (!supabaseUrl || !supabaseKey) {
  if (branch === 'main') {
    throw new Error('[prerender] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set on a production build')
  }
  console.warn(
    '[prerender] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — skipped prerendering.\n' +
      '            Every route still works through the SPA fallback, without per-page HTML.',
  )
  process.exit(0)
}

/** Published rows only — RLS decides that, not a filter here. */
async function rows(table, columns) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  })
  if (!response.ok) throw new Error(`[prerender] ${table}: ${response.status} ${await response.text()}`)
  return response.json()
}

/** Shapes a DB row the way `catalog/types.ts` expects it. */
const toProduct = (r) => ({
  id: r.id,
  slug: r.slug ?? undefined,
  category: r.category,
  name: r.name,
  shortDesc: r.short_desc ?? { th: '', en: '' },
  priceFrom: r.price_from === null ? null : Number(r.price_from),
  priceUnit: r.price_unit ?? undefined,
  specs: r.specs ?? [],
  featured: Boolean(r.featured),
  bestSeller: Boolean(r.best_seller),
  imagePath: r.image_path ?? undefined,
  images: r.images ?? undefined,
})

const toProject = (r) => ({
  id: r.id,
  slug: r.slug ?? undefined,
  title: r.title,
  location: r.location ?? { th: '', en: '' },
  year: r.year ?? '',
  category: r.category,
  area: r.area ?? undefined,
  description: r.description ?? { th: '', en: '' },
  featured: Boolean(r.featured),
  imagePath: r.image_path ?? undefined,
  images: r.images ?? undefined,
  sourceUrl: r.source_url ?? undefined,
  sources: r.sources ?? undefined,
  productId: r.product_id ?? undefined,
  kind: r.kind ?? 'project',
})

const ref = (row) => row.slug || row.id

async function loadCatalog() {
  const [products, allProjects] = await Promise.all([
    rows('products', '*'),
    rows('projects', '*'),
  ])
  const mapped = allProjects.map(toProject)
  return {
    products: products.map(toProduct),
    projects: mapped.filter((p) => p.kind !== 'community'),
    community: mapped.filter((p) => p.kind === 'community'),
  }
}

/** Replaces a `<meta>`/`<title>` in the template, or appends it when absent. */
function setTag(head, pattern, replacement) {
  return pattern.test(head) ? head.replace(pattern, replacement) : head + `\n    ${replacement}`
}

/**
 * The per-page head. This is the half crawlers that don't run JS actually read,
 * so it is built from the same data the page renders rather than from the
 * rendered markup.
 */
function buildHead(template, { title, description, path, image }) {
  const url = site ? `${site}${path}` : path
  // Same shape `useSeo` produces on the client, or the title would change the
  // moment the SPA boots — and the search result would not match the page.
  title = withBrand(title)
  const esc = (v) =>
    String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  let head = template
  head = setTag(head, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  head = setTag(head, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`)
  head = setTag(head, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`)
  head = setTag(
    head,
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${esc(description)}">`,
  )
  head = setTag(head, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}">`)
  head = setTag(
    head,
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${esc(description)}">`,
  )
  if (site) {
    head = setTag(head, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}">`)
    // A canonical per page, so the SPA's redirect aliases (`/`, `/home`,
    // `/portfolio/<slug>` without a category) cannot read as duplicates.
    head = setTag(head, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}">`)
    if (image) {
      const abs = image.startsWith('http') ? image : `${site}${image.startsWith('/') ? '' : '/'}${image}`
      head = setTag(head, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(abs)}">`)
      head = setTag(head, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(abs)}">`)
    }
  }
  return head
}

const BRAND = 'ไทยดวงดี เอ็นจิเนียริ่ง'
const withBrand = (t) => `${t} | ${BRAND}`
const text = (value) => (typeof value === 'string' ? value : (value?.th ?? ''))
/**
 * Google renders ~155 characters of a description and drops the rest, so a
 * 300-char one was two-thirds invisible and ended mid-sentence. Same rule as
 * `clampDescription` in `src/seo/useSeo.ts`, so a page's prerendered head and
 * the one the SPA sets after boot agree.
 */
const DESCRIPTION_MAX = 155
function trim(value) {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= DESCRIPTION_MAX) return clean
  const cut = clean.slice(0, DESCRIPTION_MAX)
  // Thai is written without spaces, so there may be no word boundary to cut on.
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > DESCRIPTION_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** The image a shared link should preview with. */
function imageFor(row) {
  const path = row.imagePath ?? row.images?.[0]
  if (!path) return ''
  // Catalog images live in Supabase Storage; the site resolves the same
  // relative path, so build the public URL the same way `storage.ts` does.
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/catalog/${path}` : ''
}

/** The service home pages — `/home/:service`. These are the highest-value pages
 *  on the site and the first version of this script skipped them entirely. The
 *  copy is duplicated from `src/marketing/i18n.ts` rather than imported: this is
 *  a plain Node script and pulling the TS i18n module in would drag React with
 *  it. If a headline changes there, change it here. */
const SERVICE_PAGES = [
  { slug: 'house', title: 'บ้านน็อคดาวน์ บ้านสำเร็จรูป เพชรบูรณ์', description: 'บ้านน็อคดาวน์สำเร็จรูปที่ออกแบบแปลนเองได้ตั้งแต่ต้น เห็นภาพ 3 มิติและราคาประเมินทันที แล้วเราผลิต ขนส่ง และติดตั้งให้ถึงหน้างาน ทั่วจังหวัดเพชรบูรณ์' },
  { slug: 'electronics', title: 'สินค้าอิเล็กทรอนิกส์ เครื่องใช้ไฟฟ้า เพชรบูรณ์', description: 'เครื่องใช้ไฟฟ้า ตู้ควบคุมไฟฟ้า ระบบโซลาร์เซลล์ และงานติดตั้งระบบไฟฟ้า พร้อมทีมช่างของเราเอง จ.เพชรบูรณ์' },
  { slug: 'furniture', title: 'เฟอร์นิเจอร์บิลต์อิน เพชรบูรณ์', description: 'เฟอร์นิเจอร์บิลต์อินและลอยตัว ชุดครัว ตู้เสื้อผ้า เตียง จัดชุดให้เข้ากับแบบบ้านของคุณ จ.เพชรบูรณ์' },
  { slug: 'rental', title: 'รถก่อสร้างและเครื่องจักรให้เช่า เพชรบูรณ์', description: 'รถแบคโฮ รถเครน และเครื่องจักรก่อสร้างให้เช่า พร้อมคนขับและทีมสนับสนุนหน้างาน จ.เพชรบูรณ์' },
  { slug: 'contracting', title: 'รับเหมาก่อสร้าง งานระบบไฟฟ้า เพชรบูรณ์', description: 'รับเหมาก่อสร้าง งานรื้อถอน เดินสายไฟเบอร์ออปติก งานระบบไฟฟ้าและสาธารณูปโภค ครบในทีมเดียว จ.เพชรบูรณ์' },
]

function routesFor(catalog) {
  const list = [
    ...SERVICE_PAGES.map((s) => ({
      path: `/home/${s.slug}`,
      title: s.title,
      description: trim(s.description),
    })),
    { path: '/about', title: 'เกี่ยวกับเรา', description: 'TDD (หจก. ไทย ดวงดี เอ็นจิเนียริ่ง) — งานก่อสร้าง งานระบบ และเฟอร์นิเจอร์ จบได้ในทีมเดียว' },
    { path: '/contact', title: 'ติดต่อเรา', description: 'ปรึกษาหรือขอใบเสนอราคา — โทร อีเมล หรือเข้ามาที่ร้านได้เลย' },
    { path: '/privacy', title: 'นโยบายความเป็นส่วนตัว', description: 'เว็บไซต์นี้เก็บข้อมูลอะไรของคุณบ้าง ใช้ทำอะไร ส่งให้ใคร และสิทธิของคุณตาม PDPA' },
    { path: '/products', title: 'สินค้าและบริการ', description: 'บ้านน็อคดาวน์ อิเล็กทรอนิกส์ เฟอร์นิเจอร์ และรถก่อสร้างให้เช่า' },
    { path: '/portfolio', title: 'ผลงานที่เราสร้างจริง', description: 'ตัวอย่างบ้านและงานติดตั้งที่ส่งมอบแล้ว' },
    { path: '/community', title: 'ผลงานสาธารณประโยชน์และการบริจาค', description: 'กิจกรรมเพื่อชุมชนและการบริจาคที่ทีมงานของเรามีส่วนร่วม' },
    { path: '/articles', title: 'บทความเรื่องบ้าน งานรับเหมา และงานไฟฟ้า', description: 'ตอบคำถามที่ลูกค้าถามบ่อย ก่อนสร้าง ต่อเติม หรือติดตั้งระบบ — เขียนจากงานจริงของทีมงานในเพชรบูรณ์' },
    // Articles are static content (src/content/articles.json), read here as JSON
    // so the title/description in the static <head> are the article's own.
    ...ARTICLES.map((a) => ({ path: `/articles/${a.slug}`, title: a.title.th, description: trim(a.description.th) })),
  ]

  for (const p of catalog.products) {
    list.push({
      path: `/products/${ref(p)}`,
      title: text(p.name),
      description: trim(text(p.shortDesc)),
      image: imageFor(p),
    })
  }
  for (const p of catalog.projects) {
    list.push({
      path: `/portfolio/${p.category}/${ref(p)}`,
      title: text(p.title),
      description: trim(text(p.description)),
      image: imageFor(p),
    })
  }
  return list
}

const template = readFileSync(join(dist, 'index.html'), 'utf8')
const { render } = await import(pathToFileURL(serverEntry).href)
const catalog = await loadCatalog()
const routes = routesFor(catalog)

let written = 0
const failures = []

for (const route of routes) {
  try {
    const { html, styles } = await render(route.path, catalog)
    const [headPart, bodyPart] = template.split('</head>')
    const head = buildHead(headPart, route)
    const page =
      `${head}\n    ${styles}\n  </head>` +
      bodyPart.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

    // `<route>.html`, NOT `<route>/index.html`.
    //
    // Cloudflare Pages treats a directory containing index.html as a directory
    // and **308-redirects the slashless URL to the trailing-slash one**:
    // /about → /about/. Measured on the deployed site — every prerendered page
    // did it. That breaks three things at once: every internal link and sitemap
    // entry costs a redirect hop, and the canonical (which says /about) then
    // disagrees with the URL actually serving the page (/about/), which is the
    // duplicate-content problem this prerendering was meant to remove.
    //
    // A flat `about.html` is served at /about with 200 and no redirect. A file
    // and a directory can share a base name, so `products.html` happily
    // coexists with `products/air-conditioner.html`.
    const file = join(dist, `${route.path}.html`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, page)
    written += 1
  } catch (error) {
    failures.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  // One broken route is a bug to fix, not a page to ship empty: a silently
  // skipped route keeps the old behaviour (generic card) with nobody noticing.
  console.error(`[prerender] ${failures.length} route(s) failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}

console.log(`[prerender] ${written} pages written to dist/ (catalogue read live from Supabase)`)
