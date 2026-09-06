/**
 * Reads the Open Graph preview of a public Facebook post — the same metadata
 * Facebook publishes for Messenger/LINE link previews. One fetch, triggered by
 * a person pasting a link to their own post. This is NOT a scraper: it reads
 * only the <meta property="og:*"> tags and never walks the page or the feed.
 *
 * Measured against a real post (2026-09-07):
 *
 *  - **Send no browser User-Agent.** With a Chrome UA the request comes back
 *    HTTP 400; with curl's default (or none) it returns 200 and the og tags.
 *  - `og:description` is the post's text but **truncated** by Facebook at ~300
 *    characters, ending in "…". Long write-ups still have to be pasted by hand.
 *  - `og:image` is the FIRST photo only, re-encoded to about 1000px wide, on a
 *    signed fbcdn URL that expires within hours — so it must be downloaded and
 *    stored immediately, never hot-linked.
 *  - `og:title` is the profile's name, not a headline. Useless as a project
 *    title; the caller has to supply one.
 */

const OG_TAG = /<meta\s+property="(og:[^"]+)"\s+content="([^"]*)"/gi

/** Minimal HTML entity decode — Facebook escapes Thai text as &#xNNNN;. */
function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * @param {string} url a public Facebook post URL
 * @returns {Promise<{title?: string, description?: string, imageUrl?: string, canonicalUrl?: string, type?: string}>}
 */
export async function fetchPostPreview(url) {
  if (!/^https?:\/\/(www\.|m\.|web\.)?facebook\.com\//i.test(url)) {
    throw new Error(`not a facebook.com post URL: ${url}`)
  }

  const response = await fetch(url, {
    redirect: 'follow',
    // Deliberately no User-Agent override — see the note above.
    headers: { Accept: 'text/html' },
  })
  if (!response.ok) {
    throw new Error(
      `facebook returned HTTP ${response.status}. The post may be private, deleted, ` +
        'or the URL may have been copied from a logged-in view.',
    )
  }

  const html = await response.text()
  const tags = {}
  for (const [, key, value] of html.matchAll(OG_TAG)) {
    if (!(key in tags)) tags[key] = decodeEntities(value)
  }

  if (!tags['og:image'] && !tags['og:description']) {
    throw new Error(
      'no Open Graph data on that page — Facebook served a login wall. ' +
        'Check the post is Public, then save the photo and text by hand instead.',
    )
  }

  return {
    type: tags['og:type'],
    title: tags['og:title'],
    description: tags['og:description'],
    imageUrl: tags['og:image'],
    canonicalUrl: tags['og:url'],
  }
}

/** Downloads the preview image. The fbcdn URL is signed and short-lived. */
export async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl, { redirect: 'follow' })
  if (!response.ok) throw new Error(`downloading the post image failed: HTTP ${response.status}`)
  const type = response.headers.get('content-type') ?? 'image/jpeg'
  return { body: Buffer.from(await response.arrayBuffer()), contentType: type.split(';')[0] }
}
