import { prerenderToNodeStream } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import createEmotionServer from '@emotion/server/create-instance'
import './i18n'
import App from './App'
import { AppThemeProvider } from './theme/AppThemeProvider'
import { AuthProvider } from './auth/AuthProvider'
import { CatalogProvider, type InitialCatalog } from './catalog/CatalogProvider'
import { CompanyProvider, type InitialCompany } from './company/CompanyProvider'

/**
 * Renders one route to HTML at build time (see `scripts/prerender.mjs`).
 *
 * Why this exists: the site is a client-rendered SPA, so every URL served the
 * same `index.html` with an empty `<div id="root">`. Google renders JS and
 * coped, but **Facebook and LINE do not** — every shared link showed the same
 * site-wide card, whatever page it pointed at.
 *
 * Deliberately NOT hydration. `main.tsx` still uses `createRoot`, which throws
 * the prerendered DOM away and renders fresh. That costs one re-render on load
 * and buys immunity from the whole class of hydration-mismatch bugs: the
 * prerendered HTML is Thai + light theme (the documented defaults), while a
 * returning visitor may have chosen English or dark. Matching those at build
 * time is impossible; mismatching them during hydration is a visible fault.
 *
 * The catalogue (and the company facts) are passed in because `useEffect` never runs while prerendering
 * — without it every prerendered page would be an empty shop.
 *
 * ⚠️ Uses `prerenderToNodeStream` from `react-dom/static`, NOT `renderToString`.
 * Every route in `App.tsx` is `React.lazy`, and `renderToString` does not wait
 * for Suspense: it emits the fallback and moves on. The first attempt here did
 * exactly that and produced 48 byte-identical files — header and footer, no page.
 * The static API waits for lazy chunks to resolve, which is the whole point.
 */
export async function render(url: string, catalog: InitialCatalog, company: InitialCompany) {
  // A per-render cache, or styles from one page leak into the next.
  const cache = createCache({ key: 'mui' })
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache)

  const { prelude } = await prerenderToNodeStream(
    <CacheProvider value={cache}>
      <AppThemeProvider>
        <AuthProvider>
          <CatalogProvider initial={catalog}>
            <CompanyProvider initial={company}>
              <StaticRouter location={url}>
                <App />
              </StaticRouter>
            </CompanyProvider>
          </CatalogProvider>
        </AuthProvider>
      </AppThemeProvider>
    </CacheProvider>,
  )

  const chunks: Buffer[] = []
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk))
  const html = Buffer.concat(chunks).toString('utf8')

  // MUI styles are generated during render, so they can only be collected after
  // it. Without this the HTML a crawler sees is unstyled — which is fine for
  // text extraction but looks broken in a link-preview screenshot.
  const styles = constructStyleTagsFromChunks(extractCriticalToChunks(html))

  return { html, styles }
}
