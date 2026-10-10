import type { Product, ProductDiscount, ProductVariant } from './types'

/**
 * Discount + price helpers, shared by every place that shows a product price
 * (cards, product page, admin preview) so the rules stay in one spot.
 *
 * A discount is active only within its window: a null/absent `start` or `end`
 * is an open bound, so a discount with neither date is simply always on.
 */
export function discountActive(d: ProductDiscount | null | undefined, now: number = Date.now()): boolean {
  if (!d || !(Number(d.value) > 0)) return false
  const start = d.start ? Date.parse(d.start) : NaN
  const end = d.end ? Date.parse(d.end) : NaN
  if (!Number.isNaN(start) && now < start) return false
  if (!Number.isNaN(end) && now > end) return false
  return true
}

/** The sale price for `price` under `d` — assumes the discount is already active. */
export function applyDiscount(price: number, d: ProductDiscount): number {
  const off = d.kind === 'percent' ? (price * d.value) / 100 : d.value
  return Math.max(0, Math.round(price - off))
}

/** A short badge like "-10%" or "-฿5,000", or null when there's no active discount. */
export function discountBadge(d: ProductDiscount | null | undefined, now: number = Date.now()): string | null {
  if (!discountActive(d, now)) return null
  return d!.kind === 'percent' ? `-${d!.value}%` : `-฿${Math.round(d!.value).toLocaleString('en-US')}`
}

/** The prices that define a product: its base price plus any variant prices (nulls dropped). */
function numericPrices(product: Product): number[] {
  const all = [product.priceFrom, ...(product.variants ?? []).map((v) => v.priceFrom)]
  return all.filter((p): p is number => typeof p === 'number')
}

export interface PriceView {
  /** Lowest price to show now (after discount if active); null = quote-only. */
  current: number | null
  /** The pre-discount value of `current`, only when a discount actually reduced it. */
  original: number | null
  /** True when the product spans more than one price (variants) → prefix "from". */
  from: boolean
  /** True when a discount is active on this product. */
  discounted: boolean
}

/**
 * What a card should show for a product: the lowest price across the product and
 * its variants, discounted if a discount is active, with the original kept for a
 * strike-through. `from` is set when there is more than one distinct price.
 */
export function productPriceView(product: Product, now: number = Date.now()): PriceView {
  const prices = numericPrices(product)
  const distinct = new Set(prices)
  if (prices.length === 0) {
    return { current: null, original: null, from: false, discounted: false }
  }
  const lowest = Math.min(...prices)
  const active = discountActive(product.discount, now)
  const current = active ? applyDiscount(lowest, product.discount!) : lowest
  return {
    current,
    original: active && current < lowest ? lowest : null,
    from: distinct.size > 1 || (product.variants?.length ?? 0) > 0,
    discounted: active && current < lowest,
  }
}

/** The price to show for a single chosen variant (or the product's own base price). */
export function variantPriceView(
  product: Product,
  variant: ProductVariant | null,
  now: number = Date.now(),
): PriceView {
  const base = variant ? variant.priceFrom : product.priceFrom
  if (base == null) return { current: null, original: null, from: false, discounted: false }
  const active = discountActive(product.discount, now)
  const current = active ? applyDiscount(base, product.discount!) : base
  return { current, original: active && current < base ? base : null, from: false, discounted: active && current < base }
}
