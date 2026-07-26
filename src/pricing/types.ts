export const MATERIAL_GRADES = ['economy', 'standard', 'premium'] as const
export type MaterialGrade = (typeof MATERIAL_GRADES)[number]

/**
 * Editable pricing configuration. Per the project plan this must never be
 * hardcoded into calculation logic — material and labour costs move over
 * time, so the company has to be able to change these without a code
 * change. Phase 1 loads it from local storage; a later phase reads the
 * same shape from the `price_config` table.
 */
export interface PriceConfig {
  /** Currency code used for formatting (e.g. 'THB'). */
  currency: string
  /** Build cost per square metre, by material grade. */
  pricePerSqm: Record<MaterialGrade, number>
}

export interface PriceEstimate {
  areaSqm: number
  grade: MaterialGrade
  pricePerSqm: number
  /** areaSqm * pricePerSqm — the only term in the Phase 1 formula. */
  total: number
  currency: string
}
