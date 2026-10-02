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
  /** Page title, without the brand — the brand is appended unless `brandSuffix` is false. */
  title?: string
  description?: string
  /** Append " | ไทยดวงดี เอ็นจิเนียริ่ง" to the title. Default true. */
  brandSuffix?: boolean
}

export function useSeo({ title, description, brandSuffix = true }: SeoOptions) {
  useEffect(() => {
    if (title) {
      const full = brandSuffix ? `${title} | ${BRAND}` : title
      document.title = full
      upsertMeta('property', 'og:title', full)
      upsertMeta('name', 'twitter:title', full)
    }
    if (description) {
      // Trim to a sensible length; Google shows ~150–160 chars.
      const desc = description.replace(/\s+/g, ' ').trim().slice(0, 300)
      upsertMeta('name', 'description', desc)
      upsertMeta('property', 'og:description', desc)
      upsertMeta('name', 'twitter:description', desc)
    }
  }, [title, description, brandSuffix])
}
