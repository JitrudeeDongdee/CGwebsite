import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { catalogRepository, seedRepository } from './repository'
import { supabaseEnabled } from '../supabase/client'
import type { Product, ProductCategory, Project } from './types'

/**
 * Loads the catalog once for the whole app and hands it to pages **synchronously**,
 * so the listing/filtering code stays exactly as it was when the content was a
 * bundled array.
 *
 * Two deliberate choices:
 *
 *  - It starts from the seed rather than an empty array, so the first paint has
 *    content instead of a spinner, and a route that renders before the fetch
 *    resolves still looks right.
 *  - If the fetch fails — or comes back empty — it KEEPS the seed. A free-tier
 *    Supabase project that paused, a network blip, or a project with nothing
 *    published yet then degrades to slightly stale content instead of an empty
 *    shop. `source` says which one you are looking at, so this can never be
 *    mistaken for the real thing.
 */
interface CatalogValue {
  products: Product[]
  projects: Project[]
  loading: boolean
  /** Set when the remote fetch failed and the seed is being shown instead. */
  error: Error | null
  source: 'seed' | 'supabase'
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(supabaseEnabled)
  const [error, setError] = useState<Error | null>(null)
  const [source, setSource] = useState<'seed' | 'supabase'>('seed')

  useEffect(() => {
    let cancelled = false

    // Seed first — synchronous data, no await, so there is never a blank frame.
    void seedRepository.listProducts().then((p) => !cancelled && setProducts(p))
    void seedRepository.listProjects().then((p) => !cancelled && setProjects(p))

    if (!supabaseEnabled) return

    void (async () => {
      try {
        const [p, j] = await Promise.all([
          catalogRepository.listProducts(),
          catalogRepository.listProjects(),
        ])
        if (cancelled) return
        // An empty catalog is never something worth rendering: it means the
        // project exists but nothing is published yet (or the wrong project is
        // configured). Keep the seed and say so, rather than turning the live
        // site into an empty shop. Once real rows are published this branch
        // stops firing.
        if (p.length === 0 && j.length === 0) {
          console.warn('[catalog] Supabase returned no published rows — keeping the bundled seed.')
          return
        }
        // Functional updates: the effect runs once, so reading `products` from
        // its closure would see the initial value, not what the seed loaded.
        setProducts((prev) => (p.length > 0 ? p : prev))
        setProjects((prev) => (j.length > 0 ? j : prev))
        setSource('supabase')
      } catch (e) {
        if (cancelled) return
        // Keep whatever is already on screen; just record why it is stale.
        setError(e instanceof Error ? e : new Error(String(e)))
        console.error('[catalog] falling back to the bundled seed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<CatalogValue>(
    () => ({ products, projects, loading, error, source }),
    [products, projects, loading, error, source],
  )
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>')
  return ctx
}

// --- the helpers the pages used to import from products.ts / projects.ts ---
// Same signatures, now reading whatever the provider loaded.

export function useProductsByCategory(cat: ProductCategory | 'all'): Product[] {
  const { products } = useCatalog()
  return useMemo(
    () => (cat === 'all' ? products : products.filter((p) => p.category === cat)),
    [products, cat],
  )
}

export function useProduct(slug: string | undefined): Product | undefined {
  const { products } = useCatalog()
  return useMemo(() => products.find((p) => p.slug === slug), [products, slug])
}

export function useProject(slug: string | undefined): Project | undefined {
  const { projects } = useCatalog()
  return useMemo(() => projects.find((p) => p.slug === slug), [projects, slug])
}

/** The card the service home page leads with: the best seller, else the first featured. */
export function useHeroProduct(cat: ProductCategory): Product | undefined {
  const products = useProductsByCategory(cat)
  return useMemo(
    () => products.find((p) => p.bestSeller) ?? products.find((p) => p.featured) ?? products[0],
    [products],
  )
}
