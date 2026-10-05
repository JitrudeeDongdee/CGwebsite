import { useEffect } from 'react'

/**
 * Per-route `<title>` / `<meta description>` for the SPA.
 *
 * The site is client-rendered, so `index.html` ships ONE title + description for
 * every URL. Googlebot renders JS, so updating the document head on each route
 * lets every page target its own keywords instead of sharing the home page's.
 * Detail pages derive their values from the content they already load, so a new
 * product/project/activity gets its own title + description with no extra step.
 *
 * Imperative (not React 19's hoisted <title>) on purpose: it reuses the single
 * description tag that is already in index.html and guarantees exactly one of
 * each — no duplicate tags, no race with the static ones. It does not restore on
 * unmount; every marketing route sets its own, and the next route overwrites.
 *
 * NOTE: social/link-preview crawlers (Facebook/LINE) do NOT run JS, so they
 * still see index.html's site-wide card. Per-page OG needs prerender/SSG — this
 * covers Google (search), which does render JS.
 */

const BRAND = 'ไทยดวงดี เอ็นจิเนียริ่ง'

/** Google renders ~155 characters of a description; past that is wasted. */
export const DESCRIPTION_MAX = 155

export function clampDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= DESCRIPTION_MAX) return clean
  const cut = clean.slice(0, DESCRIPTION_MAX)
  // Thai does not use spaces between words, so a space may not exist to break
  // on — fall back to a hard cut rather than returning an empty string.
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > DESCRIPTION_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * One `<link rel="canonical">`, always pointing at the URL being viewed.
 *
 * Without it every SPA-rendered route inherited whatever the static HTML said
 * — and the aliases that only redirect in JavaScript (`/home`, a bare
 * `/portfolio/<slug>`, any unknown path) looked like separate pages with
 * duplicate content.
 */
function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export interface SeoOptions {
  /** Set `false` on a page that must not be indexed (the not-found screen). */
  index?: boolean
  /** Page title, without the brand — the brand is appended unless `brandSuffix` is false. */
  title?: string
  description?: string
  /** Append " | ไทยดวงดี เอ็นจิเนียริ่ง" to the title. Default true. */
  brandSuffix?: boolean
}

export function useSeo({ title, description, brandSuffix = true, index = true }: SeoOptions) {
  useEffect(() => {
    // The address bar is the truth for a client-rendered route.
    upsertCanonical(`${window.location.origin}${window.location.pathname}`)
    upsertMeta('name', 'robots', index ? 'index, follow' : 'noindex, follow')
    if (title) {
      const full = brandSuffix ? `${title} | ${BRAND}` : title
      document.title = full
      upsertMeta('property', 'og:title', full)
      upsertMeta('name', 'twitter:title', full)
    }
    if (description) {
      // Google shows ~155 characters and truncates the rest, so a 300-char
      // description was two-thirds invisible — and the visible third ended
      // mid-sentence. Cut on a word boundary at 155 instead.
      const desc = clampDescription(description)
      upsertMeta('name', 'description', desc)
      upsertMeta('property', 'og:description', desc)
      upsertMeta('name', 'twitter:description', desc)
    }
  }, [title, description, brandSuffix, index])
}
