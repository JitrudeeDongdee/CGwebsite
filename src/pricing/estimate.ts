import type { MaterialGrade, OpeningCount, PriceConfig, PriceEstimate } from './types'

/**
 * Estimate = usable area x the rate for the chosen material grade, plus each
 * door and window priced per unit.
 *
 * Only the building itself is priced. Furniture placed on the plan (beds,
 * tables, sofas) is a layout aid to check things fit and is deliberately
 * excluded — the company builds the house, it doesn't sell the contents.
 * Columns are structure and are already covered by the per-sqm rate.
 *
 * The remaining extras from the plan (floor count, roof type, parking) are
 * still Phase 2.
 */
export function estimatePrice(
  areaSqm: number | null,
  grade: MaterialGrade,
  config: PriceConfig,
  openings: OpeningCount = { door: 0, window: 0 },
): PriceEstimate | null {
  if (areaSqm === null || !Number.isFinite(areaSqm) || areaSqm <= 0) {
    return null
  }

  const pricePerSqm = config.pricePerSqm[grade]
  const areaCost = areaSqm * pricePerSqm
  const openingsCost =
    openings.door * config.openingPrice.door + openings.window * config.openingPrice.window

  return {
    areaSqm,
    grade,
    pricePerSqm,
    areaCost,
    openings,
    openingsCost,
    total: areaCost + openingsCost,
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
