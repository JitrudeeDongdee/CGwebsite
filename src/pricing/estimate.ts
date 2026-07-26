import type { MaterialGrade, PriceConfig, PriceEstimate } from './types'

/**
 * Phase 1 formula, straight from the project plan:
 *   estimate = usable area (sqm) x rate for the chosen material grade
 *
 * Extras (floor count, roof type, parking, bathrooms) are deliberately not
 * here yet — the plan puts them in Phase 2.
 */
export function estimatePrice(
  areaSqm: number | null,
  grade: MaterialGrade,
  config: PriceConfig,
): PriceEstimate | null {
  if (areaSqm === null || !Number.isFinite(areaSqm) || areaSqm <= 0) {
    return null
  }

  const pricePerSqm = config.pricePerSqm[grade]

  return {
    areaSqm,
    grade,
    pricePerSqm,
    total: areaSqm * pricePerSqm,
    currency: config.currency,
  }
}

export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
