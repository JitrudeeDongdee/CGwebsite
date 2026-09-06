import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The public origin, e.g. https://www.tdd.co.th — set as SITE_URL in the host's
 * build environment (Cloudflare Pages → Settings → Environment variables), or
 * left to Cloudflare's own CF_PAGES_URL, which already is the deployment's URL.
 * Same variable `scripts/generate-seo-files.mjs` uses for robots/sitemap.
 *
 * og:url and og:image MUST be absolute, so they are emitted only when the domain
 * is actually known — a share card pointing at a guessed host is broken silently.
 */
const SITE_URL = (process.env.SITE_URL || process.env.CF_PAGES_URL || '').replace(/\/+$/, '')

const PRODUCTION_BRANCH = 'main'
/** The branch being built. Cloudflare names this differently per product:
 *  CF_PAGES_BRANCH on Pages, WORKERS_CI_BRANCH on Workers Builds. */
const CI_BRANCH = process.env.CF_PAGES_BRANCH ?? process.env.WORKERS_CI_BRANCH
/** A CI build of any branch other than production. Those get their own public
 *  URL, so they must not be indexed — see scripts/generate-seo-files.mjs, which
 *  writes the matching robots.txt. A local build has no branch var and counts as
 *  production, so `pnpm run build` keeps behaving normally. */
const IS_PREVIEW = Boolean(CI_BRANCH) && CI_BRANCH !== PRODUCTION_BRANCH

/** The 1200x630 share card in public/brand — regenerate with `pnpm run og`. */
const SHARE_IMAGE = 'og-card.png'
const SHARE_TITLE = 'TDD — Thai Dongdee Engineering'

/** Short commit sha, from whichever CI is building — or local git as a fallback. */
function commitSha(): string {
  const fromCi = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA
  if (fromCi) return fromCi.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    // A tarball with no .git — not worth failing a build over.
    return 'unknown'
  }
}

/**
 * Build-time site metadata:
 *  - `dist/version.json`, served at /version via public/_redirects (global rule:
 *    every build must expose which commit is live).
 *  - the social-share tags. They live in index.html rather than per route because
 *    this is a client-side SPA: a crawler that doesn't run JS only ever sees this
 *    one file. Per-route cards need prerendering — tracked in spec.md, not here.
 *
 * robots.txt / sitemap.xml are NOT here — `scripts/generate-seo-files.mjs` owns
 * those (runs from the "prebuild" script).
 */
function siteMeta(): Plugin {
  const builtAt = new Date().toISOString()
  const sha = commitSha()
  return {
    name: 'tdd-site-meta',
    apply: 'build',
    transformIndexHtml(html) {
      // Title/description already live in index.html — reuse them so the share
      // card and the search result can never say different things.
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() ?? SHARE_TITLE
      const description =
        /<meta\s+name="description"\s+content="([^"]*)"/s.exec(html)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''

      const tags: Record<string, string>[] = [
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'TDD — Thai Dongdee Engineering' },
        { property: 'og:locale', content: 'th_TH' },
        { property: 'og:locale:alternate', content: 'en_US' },
        { property: 'og:title', content: title },
        { name: 'twitter:title', content: title },
        { name: 'twitter:card', content: 'summary_large_image' },
      ]
      if (description) {
        tags.push(
          { property: 'og:description', content: description },
          { name: 'twitter:description', content: description },
        )
      }
      // Belt and braces with the preview robots.txt: a crawler that already has
      // the URL (from a link, not a crawl) ignores robots.txt but honours this.
      if (IS_PREVIEW) tags.push({ name: 'robots', content: 'noindex, nofollow' })
      if (SITE_URL) {
        const image = `${SITE_URL}/brand/${SHARE_IMAGE}`
        tags.push(
          { property: 'og:url', content: `${SITE_URL}/` },
          { property: 'og:image', content: image },
          // Facebook/LINE render the card from these before the file loads.
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:image:alt', content: SHARE_TITLE },
          { name: 'twitter:image', content: image },
        )
      } else {
        console.warn('[tdd-site-meta] SITE_URL is not set — og:url/og:image omitted (share cards will have no image).')
      }
      return { html, tags: tags.map((attrs) => ({ tag: 'meta', attrs, injectTo: 'head' as const })) }
    },
    closeBundle() {
      // CF_PAGES_BRANCH stands in for a version until releases are tagged (see
      // the SemVer rules in the global CLAUDE.md).
      const payload = { version: CI_BRANCH ?? '0.0.0', sha, built_at: builtAt }
      writeFileSync(resolve(__dirname, 'dist/version.json'), JSON.stringify(payload, null, 2))
      console.log(`[tdd-site-meta] /version → ${JSON.stringify(payload)}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteMeta()],
  // Honour the PORT the launcher assigns (autoPort); fall back to Vite's default.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined },
})
