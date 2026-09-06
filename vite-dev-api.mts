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
 * The slug is optional and editable: it is a pretty URL, not the row's identity
 * (that is the uuid). Blank means "no slug" — the site then uses the id in the
 * URL — so an empty field is stored as NULL rather than being invented for them.
 */
function slugFor(body: { slug?: string }) {
  const slug = body.slug?.trim()
  return slug ? slug : null
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

            // Upload one file the person picked in the admin form. Base64 keeps
            // the handler dependency-free — no multipart parser for a dev tool.
            if (req.method === 'POST' && path === '/upload') {
              const { slug, filename, data, kind } = await readBody()
              if (!slug || !data) return send(400, { error: 'slug and data are required' })
              const folderRoot = kind === 'products' ? 'products' : 'portfolio'
              const bytes = downscaleJpeg(Buffer.from(data.split(',').pop(), 'base64'), MAX_WIDTH)
              // One folder per project so a gallery can hold any number of files.
              const safe = String(filename ?? 'photo')
                .toLowerCase()
                .replace(/\.[a-z0-9]+$/, '')
                .replace(/[^a-z0-9]+/g, '-')
                .slice(0, 40)
              const objectPath = `${folderRoot}/${slug}/${Date.now().toString(36)}-${safe || 'photo'}.jpg`
              await uploadCatalogImage(objectPath, bytes, 'image/jpeg')
              return send(200, { path: objectPath })
            }

            if (req.method === 'POST' && path === '/upload/delete') {
              const { path: objectPath } = await readBody()
              if (!objectPath) return send(400, { error: 'path is required' })
              await deleteCatalogImage(objectPath)
              return send(200, { deleted: objectPath })
            }

            // The full import: photo into Storage, row into the database.
            if (req.method === 'POST' && path === '/projects') {
              const body = await readBody()
              if (body.slug && !/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
                return send(400, { error: 'slug must be lowercase letters, digits and dashes' })
              }
              const slug = slugFor(body)
              // Files are foldered by whatever the row is addressed by today.
              // `||`, not `??`: a new row sends id as an empty string, and `'' ?? x`
              // keeps the empty string — which produced paths like `portfolio//photo.jpg`.
              const folder = body.id || slug || `draft-${Date.now().toString(36)}`
              // Valid categories are the database's CHECK constraint, not a copy
              // of the list kept here — a new category only has to be migrated.
              if (!body.titleTh && !body.titleEn) return send(400, { error: 'a title is required' })

              // The posts documenting this job, in timeline order. Each update
              // keeps its own photos and words; the project around them is shared.
              // `pendingImageUrl` is a photo just fetched from that post — it is
              // downloaded into the bucket here, once, on save.
              type IncomingSource = {
                url?: string
                label?: string
                captionTh?: string
                captionEn?: string
                images?: string[]
                pendingImageUrl?: string
              }
              const incoming: IncomingSource[] = Array.isArray(body.sources) ? body.sources : []
              const sources = []
              for (const [index, source] of incoming.entries()) {
                const url = source.url?.trim()
                const images = [...(source.images ?? [])]
                const hasText = Boolean(source.captionTh?.trim() || source.captionEn?.trim() || source.label?.trim())
                // Removing the link must not throw away the update: an entry
                // survives as long as it still has a photo or something written.
                if (!url && images.length === 0 && !source.pendingImageUrl && !hasText) continue
                if (source.pendingImageUrl && storageConfigured()) {
                  const { body: bytes, contentType } = await downloadImage(source.pendingImageUrl)
                  const objectPath = `portfolio/${folder}/post-${index + 1}-${Date.now().toString(36)}.jpg`
                  await uploadCatalogImage(
                    objectPath,
                    downscaleJpeg(bytes, MAX_WIDTH),
                    contentType.startsWith('image/') ? contentType : 'image/jpeg',
                  )
                  images.unshift(objectPath)
                }
                sources.push({
                  ...(url ? { url } : {}),
                  ...(source.label?.trim() ? { label: source.label.trim() } : {}),
                  ...(source.captionTh?.trim() || source.captionEn?.trim()
                    ? {
                        caption: {
                          th: source.captionTh?.trim() || source.captionEn?.trim() || '',
                          en: source.captionEn?.trim() || source.captionTh?.trim() || '',
                        },
                      }
                    : {}),
                  images,
                })
              }

              // The row's gallery is the union: each update's photos in timeline
              // order, then any loose photos uploaded outside an update. Cards and
              // the cover read this one list, so they need no knowledge of sources.
              const loose: string[] = Array.isArray(body.images) ? body.images : []
              const images = [...sources.flatMap((source) => source.images), ...loose].filter(
                (path, index, all) => all.indexOf(path) === index,
              )

              // One shared cover, chosen from any photo — it leads the gallery so
              // cards and the project page agree on which image represents the job.
              const cover = typeof body.cover === 'string' && images.includes(body.cover) ? body.cover : images[0]
              const ordered = cover ? [cover, ...images.filter((path) => path !== cover)] : images
              const imagePath: string | null = cover ?? body.imagePath ?? null

              const payload = {
                  slug,
                  // 'project' (portfolio) or 'community' (public-benefit/donation).
                  // Anything but 'community' is a normal portfolio row.
                  kind: body.kind === 'community' ? 'community' : 'project',
                  title: pair(body.titleTh, body.titleEn),
                  location: pair(body.locationTh, body.locationEn),
                  year: body.year ?? '',
                  category: body.category,
                  area: body.area || null,
                  description: pair(body.descriptionTh, body.descriptionEn),
                  featured: Boolean(body.featured),
                  published: Boolean(body.published),
                  image_path: imagePath,
                  images: ordered,
                  source_url: sources[0]?.url ?? body.sourceUrl ?? null,
                  sources,
                  // The product this job delivered, if the editor picked one.
                  product_id: body.productId || null,
              }
              // An existing row is addressed by its id, so renaming the slug
              // updates that row instead of creating a second one.
              const write = async (fields: Record<string, unknown>) =>
                body.id
                  ? await rest(`projects?id=eq.${body.id}`, {
                      method: 'PATCH',
                      headers: { Prefer: 'return=representation' },
                      body: JSON.stringify(fields),
                    })
                  : await rest('projects', {
                      method: 'POST',
                      headers: { Prefer: 'return=representation' },
                      body: JSON.stringify(fields),
                    })

              let saved
              try {
                ;[saved] = await write(payload)
              } catch (error) {
                // The product link is the newest column. If its migration hasn't
                // been run yet, save everything else rather than failing the whole
                // edit — the person still gets their text and photos stored.
                const text = error instanceof Error ? error.message : String(error)
                if (!text.includes('product_id')) throw error
                const { product_id: _dropped, ...withoutLink } = payload
                ;[saved] = await write(withoutLink)
                console.warn(
                  '[dev-api] projects.product_id is missing — run supabase/migrations/' +
                    '20260907190000_project_product_link.sql to enable linking a job to a product.',
                )
              }
              return send(200, saved)
            }

            if (req.method === 'GET' && path === '/products') {
              return send(200, await rest('products?select=*&order=sort_order.asc,created_at.desc'))
            }

            // Products are simpler than projects: no timeline, just a gallery.
            if (req.method === 'POST' && path === '/products') {
              const body = await readBody()
              if (body.slug && !/^[a-z0-9][a-z0-9-]*$/.test(body.slug)) {
                return send(400, { error: 'slug must be lowercase letters, digits and dashes' })
              }
              const slug = body.slug?.trim() || null
              const images: string[] = Array.isArray(body.images) ? body.images : []
              const cover = typeof body.cover === 'string' && images.includes(body.cover) ? body.cover : images[0]
              const ordered = cover ? [cover, ...images.filter((path) => path !== cover)] : images

              const payload = {
                slug,
                category: body.category,
                name: pair(body.nameTh, body.nameEn),
                short_desc: pair(body.shortDescTh, body.shortDescEn),
                // An empty price means "ask us", which is a real state here.
                price_from: body.priceFrom === '' || body.priceFrom == null ? null : Number(body.priceFrom),
                price_unit: body.priceUnitTh || body.priceUnitEn ? pair(body.priceUnitTh, body.priceUnitEn) : null,
                specs: Array.isArray(body.specs)
                  ? body.specs
                      .filter((spec: { labelTh?: string; valueTh?: string }) => spec?.labelTh?.trim() || spec?.valueTh?.trim())
                      .map((spec: Record<string, string>) => ({
                        label: pair(spec.labelTh, spec.labelEn),
                        value: pair(spec.valueTh, spec.valueEn),
                      }))
                  : [],
                featured: Boolean(body.featured),
                best_seller: Boolean(body.bestSeller),
                published: Boolean(body.published),
                image_path: cover ?? null,
                images: ordered,
              }

              if (payload.best_seller) {
                await rest(`products?category=eq.${payload.category}&best_seller=is.true`, {
                  method: 'PATCH',
                  body: JSON.stringify({ best_seller: false }),
                })
              }

              const [saved] = body.id
                ? await rest(`products?id=eq.${body.id}`, {
                    method: 'PATCH',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify(payload),
                  })
                : await rest('products', {
                    method: 'POST',
                    headers: { Prefer: 'return=representation' },
                    body: JSON.stringify(payload),
                  })
              return send(200, saved)
            }

            const productMatch = /^\/products\/([0-9a-f-]{36})$/.exec(path)
            if (productMatch && req.method === 'PATCH') {
              const body = await readBody()
              // Best seller is one per category, same rule as a project's star.
              if (body.best_seller === true) {
                const [row] = (await rest(`products?id=eq.${productMatch[1]}&select=category`)) ?? []
                if (row?.category) {
                  await rest(`products?category=eq.${row.category}&best_seller=is.true`, {
                    method: 'PATCH',
                    body: JSON.stringify({ best_seller: false }),
                  })
                }
              }
              const [saved] = await rest(`products?id=eq.${productMatch[1]}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(body),
              })
              return send(200, saved)
            }
            if (productMatch && req.method === 'DELETE') {
              const [existing] = (await rest(`products?id=eq.${productMatch[1]}&select=image_path,images`)) ?? []
              await rest(`products?id=eq.${productMatch[1]}`, { method: 'DELETE' })
              const orphans = new Set<string>([...(existing?.images ?? []), existing?.image_path].filter(Boolean))
              if (storageConfigured()) for (const orphan of orphans) await deleteCatalogImage(orphan)
              return send(200, { deleted: productMatch[1], images: [...orphans] })
            }

            // Publish / unpublish, and delete, from the list.
            // Rows are addressed by uuid — the slug can change under our feet.
            const match = /^\/projects\/([0-9a-f-]{36})$/.exec(path)
            if (match && req.method === 'PATCH') {
              const body = await readBody()
              // "Featured" means ONE per category. Clearing the others here, rather
              // than in the browser, keeps the rule true even if two people (or two
              // tabs) star different rows at once.
              if (body.featured === true) {
                const [row] = (await rest(`projects?id=eq.${match[1]}&select=category`)) ?? []
                if (row?.category) {
                  await rest(`projects?category=eq.${row.category}&featured=is.true`, {
                    method: 'PATCH',
                    body: JSON.stringify({ featured: false }),
                  })
                }
              }
              const [saved] = await rest(`projects?id=eq.${match[1]}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(body),
              })
              return send(200, saved)
            }
            if (match && req.method === 'DELETE') {
              // Take the photo with it — a row deleted from the admin list would
              // otherwise leave its image orphaned in the bucket forever.
              const [existing] = (await rest(`projects?id=eq.${match[1]}&select=image_path,images`)) ?? []
              await rest(`projects?id=eq.${match[1]}`, { method: 'DELETE' })
              const orphans = new Set<string>([...(existing?.images ?? []), existing?.image_path].filter(Boolean))
              if (storageConfigured()) {
                for (const orphan of orphans) await deleteCatalogImage(orphan)
              }
              return send(200, { deleted: match[1], images: [...orphans] })
            }

            send(404, { error: `no such dev endpoint: ${req.method} /api${path}` })
          } catch (error) {
            const text = error instanceof Error ? error.message : String(error)
            // Both friendly causes are almost always a migration that hasn't been
            // run against this project yet: 23514 = the category CHECK constraint;
            // a missing `kind` column = the community migration (20260907190000).
            const migrationHint =
              text.includes('23514') || (text.includes('kind') && (text.includes('column') || text.includes('PGRST204')))
            send(500, {
              error: migrationHint
                ? `${text}\n\nฐานข้อมูลยังไม่ตรงกับโค้ด — รัน migration ล่าสุดใน Supabase → SQL Editor ก่อน (เช่น 20260907190000_project_kind.sql)`
                : text,
            })
          }
        })()
      })
      server.config.logger.info('  ➜  dev API:  /api/unfurl, /api/projects  (development only)')
    },
  }
}
