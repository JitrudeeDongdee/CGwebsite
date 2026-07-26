import type { PriceConfig } from './types'

/**
 * PLACEHOLDER RATES — NOT REAL COMPANY PRICING.
 *
 * These are round example numbers chosen only so the calculation and UI can
 * be built and demonstrated. They have not been reviewed by anyone at the
 * company and must be replaced with real per-square-metre costs before this
 * is shown to an actual customer — a wrong build estimate sets a customer
 * expectation the company then has to honour or walk back.
 *
 * Replace via the admin price settings (or by editing this default).
 */
export const PLACEHOLDER_PRICE_CONFIG: PriceConfig = {
  currency: 'THB',
  pricePerSqm: {
    economy: 12_000,
    standard: 18_000,
    premium: 25_000,
  },
}

const STORAGE_KEY = 'cg:price-config'

export function loadPriceConfig(): PriceConfig {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return PLACEHOLDER_PRICE_CONFIG

  try {
    const parsed = JSON.parse(raw) as Partial<PriceConfig>
    if (!parsed.pricePerSqm) return PLACEHOLDER_PRICE_CONFIG
    return {
      currency: parsed.currency ?? PLACEHOLDER_PRICE_CONFIG.currency,
      pricePerSqm: { ...PLACEHOLDER_PRICE_CONFIG.pricePerSqm, ...parsed.pricePerSqm },
    }
  } catch {
    return PLACEHOLDER_PRICE_CONFIG
  }
}

export function savePriceConfig(config: PriceConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
