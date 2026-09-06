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
  listProjects(): Promise<Project[]>
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
    featured: Boolean(row.featured),
    bestSeller: Boolean(row.best_seller),
  }
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as Project['title'],
    location: row.location as Project['location'],
    year: (row.year as string) ?? '',
    category: row.category as Project['category'],
    area: (row.area as string) ?? undefined,
    description: row.description as Project['description'],
    featured: Boolean(row.featured),
  }
}

export const seedRepository: CatalogRepository = {
  listProducts: async () => PRODUCTS,
  listProjects: async () => PROJECTS,
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
    if (!supabase) throw new Error('supabase is not configured')
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map(toProject)
  },
}

/** The one the app uses: Supabase when configured, the seed otherwise. */
export const catalogRepository: CatalogRepository = supabase ? supabaseRepository : seedRepository
