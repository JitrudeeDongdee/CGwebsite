import { useSearchParams } from 'react-router-dom'
import { PRODUCT_CATEGORIES } from './categories'
import type { ProductCategory } from './types'

/**
 * The category filter, search text and page of a catalog listing, held in the
 * URL (`?category=house&q=kitchen&page=2`) so any view is linkable and
 * shareable — that's how a service home page links to its own slice. Shared by
 * the products and portfolio listings.
 */
export function useCatalogQuery() {
  const [params, setParams] = useSearchParams()

  const requested = params.get('category')
  const cat: ProductCategory | 'all' = PRODUCT_CATEGORIES.includes(requested as ProductCategory)
    ? (requested as ProductCategory)
    : 'all'
  const query = params.get('q') ?? ''
  const requestedPage = Number(params.get('page')) || 1

  const update = (next: { category?: ProductCategory | 'all'; q?: string; page?: number }) => {
    const category = next.category ?? cat
    const q = next.q ?? query
    // Changing a filter starts over at page 1; only an explicit page keeps a page.
    const page = next.page ?? 1
    const out: Record<string, string> = {}
    if (category !== 'all') out.category = category
    if (q.trim()) out.q = q
    if (page > 1) out.page = String(page)
    setParams(out, { replace: true })
  }

  return { cat, query, requestedPage, update }
}

/** True when any of `fields` contains the (trimmed, case-insensitive) query. */
export function matchesQuery(fields: string[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((v) => v.toLowerCase().includes(needle))
}

/**
 * Slices `items` for the requested page. A stale or hand-edited `?page=` (e.g.
 * left over after narrowing the filter) is clamped back into range.
 */
export function paginate<T>(items: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(requestedPage, 1), pageCount)
  return { page, pageCount, items: items.slice((page - 1) * pageSize, page * pageSize) }
}
