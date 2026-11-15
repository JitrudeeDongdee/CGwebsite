import type { DrawingState } from '../drawing/types'

/**
 * A plan someone saved, addressed by a uuid that appears in the URL
 * (`/design/<id>`), so a design can be reopened rather than redrawn.
 *
 * It stores the FINISHES as well as the floors. A house reopened in the
 * plaster-and-tile defaults is not the house that was saved — the whole
 * point of coming back to a design is finding it as you left it.
 */
export interface SavedPlan {
  id: string
  name: string
  /** Every storey, ground floor first. */
  floors: DrawingState[]
  /**
   * The 3D options it was last seen in. Typed loosely on purpose: this
   * module must not import from `scene3d/`, which pulls in three.js, and a
   * saved plan should survive a field being added to those options.
   */
  options?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Async by design even though the only implementation is synchronous, so a
 * real backend can replace it without touching a single caller — the same
 * shape `LeadRepository` uses.
 */
export interface PlanRepository {
  list(): Promise<SavedPlan[]>
  get(id: string): Promise<SavedPlan | null>
  /** Creates when the id is unknown, updates when it is not. */
  save(plan: Omit<SavedPlan, 'createdAt' | 'updatedAt'>): Promise<SavedPlan>
  remove(id: string): Promise<void>
}
