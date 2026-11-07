/**
 * Google Analytics 4.
 *
 * ⚠️ Nothing here runs until the visitor has consented — `RouteAnalytics` is the
 * only caller of `initGa`, and it waits for the stored choice (see
 * `src/consent/`). PDPA requires consent BEFORE analytics, so these functions
 * must never be called speculatively "to warm things up".
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
  if (!GA_ID || typeof document === 'undefined') return
  // Clear the opt-out flag BEFORE the early return: an undecided or declining
  // visitor has it set by `disableGa`, and gtag checks it before every hit — so
  // accepting later in the same page view would otherwise load (or keep) the
  // script and still send nothing until a reload.
  ;(window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = false
  if (loaded) return
  loaded = true

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)

  window.dataLayer = window.dataLayer || []
  // gtag must push the `arguments` OBJECT. A rest parameter (`...args`) pushes a
  // plain array, which gtag.js silently ignores: the script loads, nothing is
  // ever sent, and the property reports zero. That shipped once — every command
  // sat in dataLayer as an array and no /g/collect request was made. The
  // parameter list is only there for the type; the body must use `arguments`.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA_ID, { send_page_view: false })
}

/**
 * Stops GA collecting after consent is withdrawn.
 *
 * A script already in the page cannot be unloaded, so this sets the official
 * per-property opt-out flag (`window['ga-disable-<ID>']`, which gtag checks
 * before every hit) and deletes the cookies it set. Both are needed: the flag
 * stops future hits, clearing the cookies stops the identifier persisting.
 */
export function disableGa(): void {
  if (!GA_ID || typeof document === 'undefined') return
  ;(window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = true

  // GA's cookies are _ga and _ga_<container>; expire them on every host suffix
  // the browser would accept, since they are set on the registrable domain.
  const hosts = ['', `.${location.hostname}`, location.hostname]
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (!name || !/^_ga/.test(name)) continue
    for (const domain of hosts) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
    }
  }
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

/* ── Conversions ───────────────────────────────────────────────────────────
 * Page views and product views say what people LOOK at. These two say when
 * someone actually tried to reach the company, which is the only number that
 * tells a quote apart from a bounce.
 *
 * ⚠️ Never pass a name, phone number, e-mail address or anything the visitor
 * typed. Personal data in GA breaks Google's terms, and `/privacy` promises in
 * writing that this dataset contains none — so a stray parameter here makes the
 * notice false, not just untidy.
 */

/** Which form produced the lead. */
export type LeadMethod = 'contact_form' | 'designer_plan'

/** Where a contact link was clicked, so the two renderers can be told apart. */
export type ContactSurface = 'footer' | 'contact_page'

/**
 * GA4 `generate_lead` — a customer asked us to get in touch.
 *
 * Fired only after the message is actually stored: a failed send is not a lead,
 * and counting the click instead would quietly inflate the one number the
 * company would plan around.
 *
 * `topic` is the dropdown's KEY ('quote', 'productPrice', …) — never the
 * free-text detail beside it, which is whatever the visitor felt like typing.
 */
export function trackLead(method: LeadMethod, topic?: string): void {
  trackEvent('generate_lead', { method, ...(topic ? { lead_topic: topic } : {}) })
}

/**
 * A click on a phone / LINE / e-mail / Facebook / address link.
 *
 * These leave the site or hand off to the dialler, so they never produce a
 * page_view — without this event the most common way a customer here makes
 * contact is completely invisible in GA.
 */
export function trackContactClick(channel: string, surface: ContactSurface): void {
  trackEvent('contact_click', { contact_channel: channel, contact_surface: surface })
}
