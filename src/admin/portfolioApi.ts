import type { ProductCategory, ProjectKind, ProjectSource } from '../catalog/types'
import { db, explain, removeFromBucket, unfurlAvailable, uploadToBucket } from './client'

/** One timeline entry while it is being edited (bilingual caption split in two). */
export interface SourceDraft {
  url: string
  label: string
  captionTh: string
  captionEn: string
  /** Paths already in Storage, this update's own. */
  images: string[]
  /** A photo just fetched from the post; uploaded on save. */
  pendingImageUrl?: string
}

export const EMPTY_SOURCE: SourceDraft = { url: '', label: '', captionTh: '', captionEn: '', images: [] }

/**
 * Calls into the development-only admin API (`vite-dev-api.mts`).
 *
 * They exist only while `pnpm run dev` runs: the browser can't fetch
 * facebook.com (no CORS) and must never hold the service-role key that writes
 * past RLS, so both live in the dev server. Shared by the two admin screens.
 */

/** A row exactly as the projects table stores it. */
export interface ProjectRow {
  /** Stable identity — the slug is only a display choice and can change. */
  id: string
  /** 'project' (portfolio) or 'community' (public-benefit/donation). */
  kind: ProjectKind
  slug: string | null
  title: { th: string; en: string }
  location: { th: string; en: string } | null
  description: { th: string; en: string } | null
  category: ProductCategory
  year: string | null
  area: string | null
  published: boolean
  /** The one highlighted project of its category. */
  featured: boolean
  image_path: string | null
  images: string[] | null
  source_url: string | null
  sources: ProjectSource[] | null
  product_id: string | null
}

/** What the edit form holds while it is being filled in. */
export interface ProjectDraft {
  /** Empty for a new item; set when editing, so a slug change updates that row. */
  id: string
  /** 'project' = portfolio, 'community' = public-benefit/donation. Set by which
   *  admin screen opened the form; drives where the saved row is shown. */
  kind: ProjectKind
  /** The posts documenting this job, in timeline order. */
  sources: SourceDraft[]
  slug: string
  category: ProductCategory
  titleTh: string
  titleEn: string
  locationTh: string
  locationEn: string
  year: string
  area: string
  descriptionTh: string
  descriptionEn: string
  /** fbcdn URLs fetched from posts, uploaded on save. */
  imageUrls: string[]
  /** Storage paths already uploaded, cover first. */
  images: string[]
  /**
   * Folder photos are uploaded into, for a row that has no id yet. Kept apart
   * from `slug` on purpose: uploading a photo must not silently invent a slug
   * for someone who deliberately left the field empty.
   */
  folder: string
  imagePath: string
  /** The one photo used as the cover — any photo, loose or from an update. */
  cover: string
  /** Optional link to the product/service this job delivered. */
  productId: string
  published: boolean
}

/**
 * The year shown on the site is Buddhist-era, as a plain string.
 *
 * Facebook publishes no date for a post (no `article:published_time`, no
 * JSON-LD — checked against a real post), so an import cannot read it from the
 * link; `unfurlPost` still returns `publishedTime` for the day that changes.
 * Until then a new item starts at the current year, which is right for work
 * being posted as it finishes.
 */
export const buddhistYear = (date = new Date()) => String(date.getFullYear() + 543)

/** Most work is in Phetchabun, so it is the default rather than a blank field. */
export const DEFAULT_LOCATION = { th: 'เพชรบูรณ์', en: 'Phetchabun' }

export const EMPTY_DRAFT: ProjectDraft = {
  id: '',
  kind: 'project',
  sources: [{ ...EMPTY_SOURCE }],
  slug: '',
  category: 'house',
  titleTh: '',
  titleEn: '',
  locationTh: DEFAULT_LOCATION.th,
  locationEn: DEFAULT_LOCATION.en,
  year: buddhistYear(),
  area: '',
  descriptionTh: '',
  descriptionEn: '',
  imageUrls: [],
  images: [],
  folder: '',
  imagePath: '',
  cover: '',
  productId: '',
  // New work is normally meant to go live; unticking it is the exception.
  published: true,
}

function sourceToDraft(source: ProjectSource): SourceDraft {
  return {
    url: source.url ?? '',
    label: source.label ?? '',
    captionTh: source.caption?.th ?? '',
    captionEn: source.caption?.en ?? '',
    images: source.images ?? [],
  }
}

/** Fills the form from a saved row; a row from before galleries has one image. */
export function draftFromRow(row: ProjectRow): ProjectDraft {
  return {
    id: row.id,
    kind: row.kind ?? 'project',
    sources: row.sources?.length
      ? row.sources.map(sourceToDraft)
      : row.source_url
        ? [{ ...EMPTY_SOURCE, url: row.source_url }]
        : [{ ...EMPTY_SOURCE }],
    slug: row.slug ?? '',
    category: row.category,
    titleTh: row.title?.th ?? '',
    titleEn: row.title?.en ?? '',
    locationTh: row.location?.th ?? '',
    locationEn: row.location?.en ?? '',
    year: row.year ?? '',
    area: row.area ?? '',
    descriptionTh: row.description?.th ?? '',
    descriptionEn: row.description?.en ?? '',
    imageUrls: [],
    // Only the photos that belong to no update. A photo shown both here and on
    // its update reads as two photos and gets "fixed" by deleting one of them.
    images: (row.images?.length ? row.images : row.image_path ? [row.image_path] : []).filter(
      (path) => !(row.sources ?? []).some((source) => source.images?.includes(path)),
    ),
    folder: row.id,
    imagePath: row.image_path ?? '',
    cover: row.image_path ?? '',
    productId: row.product_id ?? '',
    published: row.published,
  }
}

const TABLE = 'projects'

/** Every row, newest first — the list shows drafts alongside published work. */
export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await db().from(TABLE).select('*').order('created_at', { ascending: false })
  if (error) throw explain(error, 'โหลดรายการผลงาน')
  return (data ?? []) as ProjectRow[]
}

const pair = (th: string, en: string) => ({ th: th.trim() || en.trim(), en: en.trim() || th.trim() })

/**
 * Writes the whole form back as one row.
 *
 * Mirrors what the dev API did, because the shape it produced is what the site
 * reads: updates keep their own photos and words, the row's `images` is the
 * union with the cover first, and `image_path` mirrors `images[0]` so older
 * readers keep working.
 */
export async function saveProject(draft: ProjectDraft): Promise<ProjectRow> {
  const slug = draft.slug.trim()
  if (slug && !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error('slug ใช้ได้เฉพาะ a-z 0-9 และ - เท่านั้น')
  }
  if (!draft.titleTh && !draft.titleEn) throw new Error('ต้องใส่ชื่อผลงานอย่างน้อยหนึ่งภาษา')

  // An update survives its link being cleared: it stays as long as it still has
  // a photo or something written on it.
  const sources = draft.sources
    .map((source) => {
      const url = source.url.trim()
      const hasText = Boolean(source.captionTh.trim() || source.captionEn.trim() || source.label.trim())
      if (!url && source.images.length === 0 && !hasText) return null
      return {
        ...(url ? { url } : {}),
        ...(source.label.trim() ? { label: source.label.trim() } : {}),
        ...(source.captionTh.trim() || source.captionEn.trim()
          ? { caption: pair(source.captionTh, source.captionEn) }
          : {}),
        images: source.images,
      }
    })
    .filter((source): source is NonNullable<typeof source> => source !== null)

  // The gallery is the union: each update's photos in order, then loose ones.
  const all = [...sources.flatMap((source) => source.images), ...draft.images].filter(
    (path, index, list) => list.indexOf(path) === index,
  )
  const cover = all.includes(draft.cover) ? draft.cover : all[0]
  const ordered = cover ? [cover, ...all.filter((path) => path !== cover)] : all

  const payload = {
    slug: slug || null,
    kind: draft.kind === 'community' ? 'community' : 'project',
    title: pair(draft.titleTh, draft.titleEn),
    location: pair(draft.locationTh, draft.locationEn),
    year: draft.year ?? '',
    category: draft.category,
    area: draft.area || null,
    description: pair(draft.descriptionTh, draft.descriptionEn),
    published: Boolean(draft.published),
    image_path: cover ?? null,
    images: ordered,
    source_url: sources[0]?.url ?? null,
    sources,
    product_id: draft.productId || null,
  }

  // An existing row is addressed by its id, so renaming the slug updates that
  // row instead of creating a second one.
  const query = draft.id
    ? db().from(TABLE).update(payload).eq('id', draft.id)
    : db().from(TABLE).insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw explain(error, 'บันทึกผลงาน')
  return data as ProjectRow
}

/**
 * Marks this project as its category's featured one.
 *
 * Clearing the previous holder first keeps "one per category" true even when
 * two tabs star different rows — the browser is not policing a rule it could
 * lose track of, it is doing both halves of one change.
 */
export async function setFeatured(id: string, featured: boolean): Promise<ProjectRow> {
  if (featured) {
    const { data: row } = await db().from(TABLE).select('category').eq('id', id).single()
    if (row?.category) {
      const { error } = await db()
        .from(TABLE)
        .update({ featured: false })
        .eq('category', row.category)
        .eq('featured', true)
      if (error) throw explain(error, 'เปลี่ยนผลงานเด่น')
    }
  }
  const { data, error } = await db().from(TABLE).update({ featured }).eq('id', id).select().single()
  if (error) throw explain(error, 'เปลี่ยนผลงานเด่น')
  return data as ProjectRow
}

export async function setPublished(id: string, published: boolean): Promise<ProjectRow> {
  const { data, error } = await db().from(TABLE).update({ published }).eq('id', id).select().single()
  if (error) throw explain(error, published ? 'เผยแพร่ผลงาน' : 'เอาผลงานออกจากเว็บ')
  return data as ProjectRow
}

/** Deletes the row, then its photos — an orphaned object costs storage forever. */
export async function deleteProject(id: string): Promise<void> {
  const { data: existing } = await db().from(TABLE).select('image_path,images').eq('id', id).single()
  const { error } = await db().from(TABLE).delete().eq('id', id)
  if (error) throw explain(error, 'ลบผลงาน')
  const orphans = [...new Set([...(existing?.images ?? []), existing?.image_path].filter(Boolean))]
  for (const path of orphans as string[]) await removeFromBucket(path)
}

export interface PostPreview {
  title?: string
  description?: string
  imageUrl?: string
  /** ISO date, when Facebook provides one — see `buddhistYear`. */
  publishedTime?: string
}

/**
 * Reads a Facebook post's link-preview metadata.
 *
 * Only works under `pnpm run dev`: a browser cannot fetch facebook.com (CORS),
 * so this goes through the dev server. On the deployed site `unfurlAvailable`
 * is false and the editor hides the button rather than offering something that
 * would fail.
 */
export async function unfurlPost(url: string): Promise<PostPreview> {
  if (!unfurlAvailable) throw new Error('ดึงข้อมูลจาก Facebook ได้เฉพาะตอนรันบนเครื่องผู้ดูแล (pnpm run dev)')
  const response = await fetch('/api/unfurl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`)
  return data as PostPreview
}

export const uploadImage = (folder: string, file: File) => uploadToBucket(folder, file, 'portfolio')

export const deleteImage = (path: string) => removeFromBucket(path)

/**
 * A starting name for a new item: the service plus a running number, e.g.
 * `contracting-003`. It counts what that category already has, so the numbers
 * stay per-service and predictable — a placeholder to overwrite, not a rule.
 */
export function suggestTitle(category: ProductCategory, rows: ProjectRow[]): string {
  const used = rows.filter((row) => row.category === category).length
  return `${category}-${String(used + 1).padStart(3, '0')}`
}

/** A community item has no category, so it is numbered across all community rows. */
export function suggestCommunityTitle(rows: ProjectRow[]): string {
  const used = rows.filter((row) => (row.kind ?? 'project') === 'community').length
  return `กิจกรรม-${String(used + 1).padStart(3, '0')}`
}

/** The links worth fetching: filled in, in the order they are shown. */
export const filledSources = (sources: SourceDraft[]) =>
  sources.filter((source) => source.url.trim())
