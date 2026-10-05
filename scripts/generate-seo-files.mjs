/**
 * Writes `public/robots.txt` and `public/sitemap.xml` from the app's routes and
 * the LIVE catalog in Supabase, so the sitemap matches the pages that exist.
 * Runs from the "prebuild" script, before Vite copies public/ into dist/.
 *
 * ⚠️ It used to regex the seed arrays in `src/catalog/*.ts`. Those stopped being
 * the catalogue the moment content moved into Supabase, and the sitemap rotted
 * silently: measured 2026-10-06, it advertised **7 project URLs that 404** and
 * omitted **all 20 real projects**. A sitemap is only useful if it is the truth,
 * so the data now comes from the same place the site reads.
 *
 * Reads with the **anon key**, not the service key. RLS then returns exactly the
 * published rows a visitor can see, so an unpublished draft cannot leak into the
 * index — the permission model does the filtering rather than a `.eq()` someone
 * could forget. The build env already has both VITE_SUPABASE_* vars for the
 * bundle, so nothing new has to be configured.
 *
 * `lastmod` is each row's own `updated_at`, which is what the tag is for: a
 * crawler re-fetches what changed instead of being told the whole site changed
 * today, every deploy.
 *
 * The origin comes from SITE_URL (the same variable `vite.config.ts` uses for
 * og:url/og:image), e.g. `SITE_URL=https://www.tdd.co.th pnpm run build`. On
 * Cloudflare Pages it falls back to CF_PAGES_URL, which is the deployment's own
 * URL — so a Pages build is self-configuring and `<project>.pages.dev` gets a
 * correct sitemap with no env var set at all.
 * Without either, robots.txt is still written but **no sitemap is emitted** — a
 * sitemap full of guessed absolute URLs would point crawlers at a host that
 * doesn't exist, which is worse than having none. Any stale sitemap.xml is
 * removed in that case so a wrong one can't survive in the build.
 *
 * PREVIEW deployments get `Disallow: /` instead. Every branch push on Pages is
 * published at its own public `<hash>.<project>.pages.dev` URL; letting those be
 * indexed means the site competes against copies of itself. Production is the
 * branch named by CF_PAGES_BRANCH matching PRODUCTION_BRANCH below.
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PRODUCTION_BRANCH = 'main'
// Pages calls it CF_PAGES_BRANCH, Workers Builds calls it WORKERS_CI_BRANCH.
const branch = process.env.CF_PAGES_BRANCH ?? process.env.WORKERS_CI_BRANCH
// Only a CI build can be a preview; a local or GitHub build has no branch var
// and is treated as production so `pnpm run build` keeps behaving normally.
const isPreview = Boolean(branch) && branch !== PRODUCTION_BRANCH

/**
 * CF_PAGES_URL is the URL of *this deployment* — on Pages that is
 * `https://<hash>.<project>.pages.dev`, and the hash changes every build. A
 * sitemap or og:url pointing there would advertise a URL that is stale by the
 * next deploy, so for a production build we drop the deployment label to get
 * the stable `<project>.pages.dev`. SITE_URL, when set, always wins.
 */
function canonicalOrigin(raw, isProduction) {
  if (!raw) return ''
  const url = raw.replace(/\/+$/, '')
  if (!isProduction) return url
  // 4+ labels on pages.dev means a per-deployment host; 3 is already canonical.
  return url.replace(/^(https?:\/\/)[^.]+\.([^.]+\.pages\.dev)$/, '$1$2')
}

const site = process.env.SITE_URL
  ? process.env.SITE_URL.replace(/\/+$/, '')
  : canonicalOrigin(process.env.CF_PAGES_URL, !isPreview)
const sitemapPath = join(root, 'public/sitemap.xml')

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/+$/, '')
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

/**
 * One table, published rows only (enforced by RLS, not by this query).
 *
 * A failure here throws rather than falling back to anything: the whole point
 * of this rewrite is that a sitemap built from the wrong source looks fine and
 * is wrong for months. Failing the build is the cheap way to find out.
 */
async function fetchRows(table, columns) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  })
  if (!response.ok) {
    throw new Error(`[seo] ${table}: ${response.status} ${await response.text()}`)
  }
  return response.json()
}

/** The URL segment for a row — its slug, or its id when the slug is blank.
 *  Same rule as `projectRef()`/`useProduct()` in the app, so every URL here
 *  resolves to a page rather than the not-found branch. */
const ref = (row) => row.slug || row.id

/** The newest `updated_at` in a set, for a listing page that has no row of its own. */
function newest(rows) {
  return rows.reduce((latest, r) => (r.updated_at > latest ? r.updated_at : latest), '')
}

/**
 * `updated_at` as a W3C datetime, which `<lastmod>` accepts and is what the
 * database actually stores. Slicing to a bare date would quietly shift a row
 * edited in the Thai evening back a day (the column is UTC, +07 locally), so
 * keep the time and let it be exact.
 */
function lastmodOf(value) {
  if (!value) return ''
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? '' : at.toISOString()
}

/** The service lines, read from PRODUCT_CATEGORIES so a new category (e.g.
 *  `contracting`) lands in the sitemap without touching this file. */
function serviceCategories() {
  const src = readFileSync(join(root, 'src/catalog/categories.tsx'), 'utf8')
  const list = /PRODUCT_CATEGORIES[^=]*=\s*\[([^\]]*)\]/.exec(src)?.[1]
  const cats = list ? [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
  if (cats.length === 0) throw new Error('no PRODUCT_CATEGORIES parsed from categories.tsx — did the format change?')
  return cats
}

const SERVICES = serviceCategories()
const today = new Date().toISOString().slice(0, 10)

/**
 * Every URL worth indexing, with the catalogue read live from Supabase.
 *
 * changefreq/priority are hints only; keep them honest rather than all-1.0.
 */
async function buildRoutes() {
  const [products, allProjects] = await Promise.all([
    fetchRows('products', 'slug,id,updated_at'),
    fetchRows('projects', 'slug,id,category,kind,updated_at'),
  ])
  // `kind` is NULL on rows created before that column existed, so a portfolio
  // project is "not community" rather than "kind = project".
  const projects = allProjects.filter((r) => r.kind !== 'community')
  const community = allProjects.filter((r) => r.kind === 'community')

  return [
    // `/` and `/home` only bounce to `/home/house`, so the service pages are the
    // canonical URLs — listing the redirects too would just look like duplicates.
    ...SERVICES.map((s) => ({
      path: `/home/${s}`,
      priority: s === 'house' ? '1.0' : '0.9',
      changefreq: 'weekly',
      lastmod: today,
    })),
    { path: '/products', priority: '0.8', changefreq: 'weekly', lastmod: lastmodOf(newest(products)) || today },
    ...products.map((p) => ({
      path: `/products/${ref(p)}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: lastmodOf(p.updated_at) || today,
    })),
    { path: '/portfolio', priority: '0.8', changefreq: 'monthly', lastmod: lastmodOf(newest(projects)) || today },
    // Project pages live under their category: /portfolio/<category>/<slug>.
    ...projects.map((p) => ({
      path: `/portfolio/${p.category}/${ref(p)}`,
      priority: '0.6',
      changefreq: 'yearly',
      lastmod: lastmodOf(p.updated_at) || today,
    })),
    // Public-benefit works & donations — ONE page listing them all, so its
    // lastmod is the newest activity rather than a date of its own.
    { path: '/community', priority: '0.6', changefreq: 'monthly', lastmod: lastmodOf(newest(community)) || today },
    { path: '/about', priority: '0.5', changefreq: 'yearly', lastmod: today },
    { path: '/contact', priority: '0.5', changefreq: 'yearly', lastmod: today },
    { path: '/design', priority: '0.7', changefreq: 'monthly', lastmod: today },
  ]
}

// /admin and /login are app screens, not content — keep them out of the index.
const robots = isPreview
  ? `# TDD — preview deployment of branch "${branch}" — NOT the public site.
# Generated by scripts/generate-seo-files.mjs (prebuild) — do not edit by hand.
User-agent: *
Disallow: /
`
  : `# TDD — Thai Dongdee Engineering
# Generated by scripts/generate-seo-files.mjs (prebuild) — do not edit by hand.
User-agent: *
Allow: /

Disallow: /admin
Disallow: /login
${site ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`
writeFileSync(join(root, 'public/robots.txt'), robots)

// Supabase is now the catalogue. Without it there is nothing honest to publish:
// the seed arrays stopped being the content, and emitting them is exactly the
// bug this file was rewritten to fix.
if (site && !isPreview && !supabaseConfigured) {
  if (existsSync(sitemapPath)) rmSync(sitemapPath)
  console.warn(
    '[seo] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — wrote robots.txt, skipped sitemap.xml.\n' +
      '      The catalogue lives in Supabase; a sitemap built without it would list pages that do not exist.',
  )
} else if (!site || isPreview) {
  // No sitemap for a preview either — it would advertise the preview host.
  if (existsSync(sitemapPath)) rmSync(sitemapPath)
  if (isPreview) {
    console.log(`[seo] preview build of "${branch}" — robots.txt set to Disallow: /, no sitemap.`)
  } else {
    console.warn(
      '[seo] no SITE_URL and no CF_PAGES_URL — wrote robots.txt, skipped sitemap.xml.\n' +
        '      Set the origin to emit it: SITE_URL=https://www.tdd.co.th pnpm run build',
    )
  }
} else {
  const routes = await buildRoutes()
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-seo-files.mjs — do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${site}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`
  writeFileSync(sitemapPath, sitemap)
  console.log(`[seo] robots.txt + sitemap.xml (${routes.length} URLs, live from Supabase) for ${site}`)
}
