import type { Plugin } from 'vite'
import { fetchPostPreview, downloadImage } from './scripts/lib/facebook.mjs'
import { downscaleJpeg } from './scripts/lib/image.mjs'
import { deleteCatalogImage, storageConfigured, uploadCatalogImage } from './scripts/lib/storage.mjs'
import { readFileSync, existsSync } from 'node:fs'

/**
 * A **development-only** API for the admin import screen.
 *
 * Two things a browser genuinely cannot do:
 *  - fetch a facebook.com post (no CORS headers, so the request is blocked), and
 *  - hold the Supabase service-role key, which is what writes drafts past RLS.
 *
 * Both belong on a server. Until the equivalent Supabase Edge Function is
 * deployed, this plugin gives the admin page those endpoints while `pnpm run
 * dev` is running — the key stays in the dev process, never in the bundle.
 *
 * `apply: 'serve'` means none of this exists in a production build: the deployed
 * /admin/portfolio page will report the API as unavailable rather than silently
 * doing nothing. Lift these handlers into `supabase/functions/import-post` when
 * staff auth is ready.
 */
const MAX_WIDTH = 1600

function credentials() {
  let url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if ((!url || !key) && existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (!m) continue
      const value = m[2].replace(/^['"]|['"]$/g, '')
      if (!url && (m[1] === 'SUPABASE_URL' || m[1] === 'VITE_SUPABASE_URL')) url = value
      if (!key && m[1] === 'SUPABASE_SERVICE_ROLE_KEY') key = value
    }
  }
  return { url: url?.replace(/\/+$/, ''), key }
}

/** Supabase REST with the service key — server-side only. */
async function rest(path: string, init: RequestInit = {}) {
  const { url, key } = credentials()
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (see .env.example)')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`supabase ${response.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

const pair = (th?: string, en?: string) => ({ th: th ?? en ?? '', en: en ?? th ?? '' })

/**
 * The slug is the portfolio URL and the image filename, but nobody should have
 * to invent one to save a draft. With none given we derive it from the post id
 * in the source URL, falling back to a random id — always unique, always a valid
 * path, and renameable later in SQL if someone wants a pretty URL.
 */
function slugFor(body: { slug?: string; sourceUrl?: string }) {
  if (body.slug) return body.slug
  const postId = /\/posts\/([A-Za-z0-9]+)/.exec(body.sourceUrl ?? '')?.[1]
  if (postId) return `post-${postId.slice(-10).toLowerCase()}`
  return `project-${Math.random().toString(36).slice(2, 10)}`
}

export function devApi(): Plugin {
  return {
    name: 'tdd-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        const readBody = async () => {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
        }

        void (async () => {
          try {
            const path = (req.url ?? '/').split('?')[0]

            if (req.method === 'GET' && path === '/projects') {
              return send(200, await rest('projects?select=*&order=created_at.desc'))
            }

            // Read a post's link preview so the form can prefill itself.
            if (req.method === 'POST' && path === '/unfurl') {
              const { url } = await readBody()
              if (!url) return send(400, { error: 'url is required' })
              return send(200, await fetchPostPreview(url))
            }

            // The full import: photo into Storage, row into the database.
            if (req.method === 'POST' && path === '/projects') {
              const body = await readBody()
              if (body.slug && !/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
                return send(400, { error: 'slug must be lowercase letters, digits and dashes' })
              }
              const slug = slugFor(body)
              // Valid categories are the database's CHECK constraint, not a copy
              // of the list kept here — a new category only has to be migrated.
              if (!body.titleTh && !body.titleEn) return send(400, { error: 'a title is required' })

              let imagePath: string | null = body.imagePath ?? null
              if (body.imageUrl && storageConfigured()) {
                const { body: bytes, contentType } = await downloadImage(body.imageUrl)
                const resized = downscaleJpeg(bytes, MAX_WIDTH)
                imagePath = `portfolio/${slug}.jpg`
                await uploadCatalogImage(imagePath, resized, contentType.startsWith('image/') ? contentType : 'image/jpeg')
              }

              const [saved] = await rest('projects?on_conflict=slug', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
                body: JSON.stringify({
                  slug,
                  title: pair(body.titleTh, body.titleEn),
                  location: pair(body.locationTh, body.locationEn),
                  year: body.year ?? '',
                  category: body.category,
                  area: body.area || null,
                  description: pair(body.descriptionTh, body.descriptionEn),
                  featured: Boolean(body.featured),
                  published: Boolean(body.published),
                  image_path: imagePath,
                  source_url: body.sourceUrl || null,
                }),
              })
              return send(200, saved)
            }

            // Publish / unpublish, and delete, from the list.
            const match = /^\/projects\/([a-z0-9-]+)$/.exec(path)
            if (match && req.method === 'PATCH') {
              const body = await readBody()
              const [saved] = await rest(`projects?slug=eq.${match[1]}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(body),
              })
              return send(200, saved)
            }
            if (match && req.method === 'DELETE') {
              // Take the photo with it — a row deleted from the admin list would
              // otherwise leave its image orphaned in the bucket forever.
              const [existing] = (await rest(`projects?slug=eq.${match[1]}&select=image_path`)) ?? []
              await rest(`projects?slug=eq.${match[1]}`, { method: 'DELETE' })
              if (existing?.image_path && storageConfigured()) {
                await deleteCatalogImage(existing.image_path)
              }
              return send(200, { deleted: match[1], image: existing?.image_path ?? null })
            }

            send(404, { error: `no such dev endpoint: ${req.method} /api${path}` })
          } catch (error) {
            const text = error instanceof Error ? error.message : String(error)
            // 23514 is the category CHECK constraint: the friendly cause is almost
            // always a migration that hasn't been run against this project yet.
            send(500, {
              error: text.includes('23514')
                ? `${text}\n\nหมวดนี้ยังไม่มีในฐานข้อมูล — รัน migration ล่าสุดใน Supabase → SQL Editor ก่อน`
                : text,
            })
          }
        })()
      })
      server.config.logger.info('  ➜  dev API:  /api/unfurl, /api/projects  (development only)')
    },
  }
}
