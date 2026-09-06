import { supabase } from '../supabase/client'
import { PRODUCTS } from './products'
import { PROJECTS } from './projects'
import type { Product, Project } from './types'

/**
 * Where catalog content comes from. Two implementations ship:
 *
 *  - `seedRepository` — the arrays in products.ts / projects.ts. Read-only, no
 *    network. Used when Supabase isn't configured, and as the fallback when it
 *    is configured but unreachable.
 *  - `supabaseRepository` — the real content, `published` rows only (the rest is
 *    enforced by RLS, not by this filter).
 *
 * Async by design even for the seed, so callers can't accidentally depend on
 * content being available synchronously.
 */
export interface CatalogRepository {
  listProducts(): Promise<Product[]>
  /** Portfolio work only (kind = 'project'). */
  listProjects(): Promise<Project[]>
  /** Public-benefit works & donations (kind = 'community'). */
  listCommunity(): Promise<Project[]>
}

/** DB row -> Product. snake_case and jsonb on one side, the app's types on the other. */
function toProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    category: row.category as Product['category'],
    name: row.name as Product['name'],
    shortDesc: row.short_desc as Product['shortDesc'],
    // numeric comes back as a string from postgres-js; NULL means "quote only".
    priceFrom: row.price_from == null ? null : Number(row.price_from),
    priceUnit: (row.price_unit as Product['priceUnit']) ?? undefined,
    specs: (row.specs as Product['specs']) ?? [],
    imagePath: (row.image_path as string) ?? undefined,
    featured: Boolean(row.featured),
    bestSeller: Boolean(row.best_seller),
  }
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    // Absent when the migration hasn't run yet — treat those rows as portfolio.
    kind: (row.kind as Project['kind']) ?? 'project',
    slug: (row.slug as string) ?? '',
    title: row.title as Project['title'],
    location: row.location as Project['location'],
    year: (row.year as string) ?? '',
    category: row.category as Project['category'],
    area: (row.area as string) ?? undefined,
    description: row.description as Project['description'],
    imagePath: (row.image_path as string) ?? undefined,
    images: (row.images as string[]) ?? undefined,
    featured: Boolean(row.featured),
    sourceUrl: (row.source_url as string) ?? undefined,
    sources: (row.sources as Project['sources']) ?? undefined,
    productId: (row.product_id as string) ?? undefined,
  }
}

/** kind, defaulting older/seed rows (no column) to 'project'. */
const kindOf = (p: Project) => p.kind ?? 'project'

export const seedRepository: CatalogRepository = {
  listProducts: async () => PRODUCTS,
  listProjects: async () => PROJECTS.filter((p) => kindOf(p) === 'project'),
  listCommunity: async () => PROJECTS.filter((p) => kindOf(p) === 'community'),
}

/**
 * Both project lists come from the same query, split by `kind` in JS rather than
 * a `kind = eq` filter — so a checkout whose DB hasn't run the kind migration yet
 * (no such column) still loads its portfolio instead of erroring into the seed.
 */
async function fetchProjects(): Promise<Project[]> {
  if (!supabase) throw new Error('supabase is not configured')
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toProject)
}

export const supabaseRepository: CatalogRepository = {
  async listProducts() {
    if (!supabase) throw new Error('supabase is not configured')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map(toProduct)
  },
  async listProjects() {
    return (await fetchProjects()).filter((p) => kindOf(p) === 'project')
  },
  async listCommunity() {
    return (await fetchProjects()).filter((p) => kindOf(p) === 'community')
  },
}

/** The one the app uses: Supabase when configured, the seed otherwise. */
export const catalogRepository: CatalogRepository = supabase ? supabaseRepository : seedRepository
