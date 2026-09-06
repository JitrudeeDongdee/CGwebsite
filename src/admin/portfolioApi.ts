import type { ProductCategory, ProjectKind, ProjectSource } from '../catalog/types'

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

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init)
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`)
  return data as T
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const listProjects = () => call<ProjectRow[]>('/projects')

export const saveProject = (draft: ProjectDraft) =>
  call<ProjectRow>(
    '/projects',
    json({ ...draft, sources: draft.sources.filter((source) => source.url.trim()) }),
  )

/**
 * Marks this project as its category's featured one. The API clears whatever was
 * featured in that category, so the rule holds without the browser policing it.
 */
export const setFeatured = (id: string, featured: boolean) =>
  call<ProjectRow>(`/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured }),
  })

export const setPublished = (id: string, published: boolean) =>
  call<ProjectRow>(`/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published }),
  })

export const deleteProject = (id: string) => call(`/projects/${id}`, { method: 'DELETE' })

export interface PostPreview {
  title?: string
  description?: string
  imageUrl?: string
  /** ISO date, when Facebook provides one — see `buddhistYear`. */
  publishedTime?: string
}

export const unfurlPost = (url: string) => call<PostPreview>('/unfurl', json({ url }))

export const uploadImage = (slug: string, filename: string, data: string) =>
  call<{ path: string }>('/upload', json({ slug, filename, data }))

export const deleteImage = (path: string) => call('/upload/delete', json({ path }))

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
