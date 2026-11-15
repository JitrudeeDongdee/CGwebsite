import type { PlanRepository, SavedPlan } from './types'

const STORAGE_KEY = 'cg:plans'

/**
 * Phase 1 storage: saved plans stay in this browser.
 *
 * ⚠️ **A link to `/design/<id>` therefore only opens on the machine that
 * saved it.** That is a real limitation of this step, not an oversight: the
 * id and the URL are what a backend needs anyway, so putting them in first
 * means swapping this one file for a Supabase repository later changes
 * nothing else. Until then, "save" means "save on this computer", and the
 * UI says so rather than implying a link can be sent to anyone.
 *
 * Deliberately behind `PlanRepository` and async even though localStorage is
 * synchronous — the same shape `LeadRepository` uses, for the same reason.
 */
export class LocalStoragePlanRepository implements PlanRepository {
  private read(): SavedPlan[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as SavedPlan[]) : []
    } catch {
      // Blocked site data throws rather than returning null, and a corrupt
      // entry must not take the editor down with it.
      return []
    }
  }

  private write(plans: SavedPlan[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
      return true
    } catch {
      // Out of quota, or site data blocked. The caller reports it: a save
      // that silently did nothing is the worst outcome here.
      return false
    }
  }

  list(): Promise<SavedPlan[]> {
    const plans = this.read()
    plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return Promise.resolve(plans)
  }

  get(id: string): Promise<SavedPlan | null> {
    return Promise.resolve(this.read().find((plan) => plan.id === id) ?? null)
  }

  save(input: Omit<SavedPlan, 'createdAt' | 'updatedAt'>): Promise<SavedPlan> {
    const plans = this.read()
    const now = new Date().toISOString()
    const at = plans.findIndex((plan) => plan.id === input.id)
    // `createdAt` is kept from the original: re-saving a plan does not make
    // it a new one, and the gallery orders by when it was last touched.
    const saved: SavedPlan = {
      ...input,
      createdAt: at >= 0 ? plans[at].createdAt : now,
      updatedAt: now,
    }
    if (at >= 0) plans[at] = saved
    else plans.push(saved)

    if (!this.write(plans)) {
      return Promise.reject(new Error('plan-storage-unavailable'))
    }
    return Promise.resolve(saved)
  }

  remove(id: string): Promise<void> {
    this.write(this.read().filter((plan) => plan.id !== id))
    return Promise.resolve()
  }
}

export const planRepository: PlanRepository = new LocalStoragePlanRepository()
