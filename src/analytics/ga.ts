/**
 * Google Analytics 4.
 *
 * The measurement ID comes from the `VITE_GA_ID` build env (e.g. `G-XXXXXXXXXX`).
 * When it isn't set — local dev, previews, anyone's checkout — nothing is loaded
 * and nothing is sent. That is deliberate: dev traffic must never pollute the
 * company's real analytics, and an unset ID is a normal state, not an error.
 *
 * This is a client-side SPA, so GA's automatic page_view (which fires once, on
 * script load) would report a single visit no matter how many pages someone
 * actually browses. `send_page_view: false` + an explicit event per route change
 * is the supported way to fix that — see `RouteAnalytics`.
 */

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export const gaEnabled = Boolean(GA_ID)

let loaded = false

/** Injects gtag.js once. Safe to call repeatedly (StrictMode double-mounts). */
export function initGa(): void {
  if (!GA_ID || loaded || typeof document === 'undefined') return
  loaded = true

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)

  window.dataLayer = window.dataLayer || []
  // gtag must push `arguments` itself — an arrow function spreading into an array
  // is NOT equivalent; GA reads the arguments object.
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID, { send_page_view: false })
}

/** One page_view for an SPA route change. No-op when GA isn't configured. */
export function trackPageView(path: string): void {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

/** Fire any GA4 event. No-op when GA isn't configured. */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!GA_ID || !window.gtag) return
  window.gtag('event', name, params ?? {})
}

/**
 * What identifies a product in the analytics item reports. `id` should be the
 * stable slug (readable in GA), `name` a language-stable name (the English one)
 * so the same product isn't split across TH/EN sessions.
 */
export interface ProductEventInput {
  id: string
  name: string
  category: string
  price?: number | null
}

function itemParams(p: ProductEventInput) {
  return {
    currency: 'THB',
    items: [
      {
        item_id: p.id,
        item_name: p.name,
        item_category: p.category,
        ...(p.price != null ? { price: p.price } : {}),
      },
    ],
  }
}

/** GA4 `view_item` — fired when a product detail page is viewed. */
export function trackProductView(p: ProductEventInput): void {
  trackEvent('view_item', itemParams(p))
}

/** GA4 `select_item` — fired when a product card in a list is clicked. */
export function trackProductSelect(p: ProductEventInput, listName?: string): void {
  trackEvent('select_item', { ...(listName ? { item_list_name: listName } : {}), ...itemParams(p) })
}
