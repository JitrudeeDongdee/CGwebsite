/**
 * Cloudflare Pages middleware — runs before every request to this project.
 *
 * Consolidates SEO onto the custom domain: a visit to the PRODUCTION pages.dev
 * host is 301-redirected to thaidongdee.com (same path + query), so Google
 * doesn't index two copies of the site competing with each other.
 *
 * Why here and not a Cloudflare Redirect Rule: Redirect/Bulk rules only apply to
 * a zone you own (thaidongdee.com). `*.pages.dev` is Cloudflare's own zone, so
 * the only place that can 301 it is the Pages app itself — this middleware.
 *
 * Deliberately matches ONLY the exact production host `thai-dd.pages.dev`:
 * preview deployments (`<hash>.thai-dd.pages.dev`, `<branch>.thai-dd.pages.dev`)
 * must keep working on pages.dev for testing, and the custom domain passes
 * straight through.
 */

const PRODUCTION_PAGES_HOST = 'thai-dd.pages.dev'
const CANONICAL_HOST = 'thaidongdee.com'

type Ctx = { request: Request; next: () => Promise<Response> }

export const onRequest = async (context: Ctx): Promise<Response> => {
  const url = new URL(context.request.url)
  if (url.hostname === PRODUCTION_PAGES_HOST) {
    url.hostname = CANONICAL_HOST
    url.protocol = 'https:'
    url.port = ''
    return Response.redirect(url.toString(), 301)
  }
  return context.next()
}
