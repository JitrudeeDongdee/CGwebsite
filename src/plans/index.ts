import { supabase } from '../supabase/client'
import { LocalStoragePlanRepository } from './localStorageRepository'
import { SupabasePlanRepository } from './supabaseRepository'
import type { PlanRepository, SavedPlan } from './types'

/**
 * Where a saved plan lives.
 *
 * **Each account keeps its own designs**: the table carries an `owner` and the
 * RLS policy is `owner = auth.uid()`, so listing returns that person's plans
 * and nobody else's without the app having to filter anything. Staff may read
 * a plan to help with a question, and deliberately cannot edit or delete one.
 *
 * Two things this has to survive, which is why it is a wrapper rather than a
 * straight choice between the two:
 *
 * 1. **The migration may not have been applied yet.** The code can deploy
 *    before someone runs the SQL, and a save that fails because a table is
 *    missing must not look like a save that failed because the work is lost.
 *    A missing table drops this to localStorage for the rest of the session —
 *    the same order-independent rollout `CompanyProvider` uses.
 * 2. **Plans saved before any of this existed are in localStorage.** They are
 *    merged into the listing rather than hidden, so nobody opens the gallery
 *    and finds their earlier work gone. A backend plan wins on id collision,
 *    because it is the one shared across devices.
 */
const local = new LocalStoragePlanRepository()
const remote = supabase ? new SupabasePlanRepository() : null

/** PostgREST for "no such table", and Postgres' own undefined_table. */
function tableMissing(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'PGRST205' || code === '42P01'
}

class PlanStore implements PlanRepository {
  /** Set once a call proves the table is not there; never unset in a session. */
  private backendOff = false

  private get backend(): PlanRepository | null {
    return this.backendOff ? null : remote
  }

  async list(): Promise<SavedPlan[]> {
    const mine = await local.list()
    const backend = this.backend
    if (!backend) return mine
    try {
      const theirs = await backend.list()
      const seen = new Set(theirs.map((plan) => plan.id))
      return [...theirs, ...mine.filter((plan) => !seen.has(plan.id))].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )
    } catch (error) {
      if (tableMissing(error)) this.backendOff = true
      // Signed out, offline, or the table is not there yet: the plans this
      // browser holds are still worth showing.
      return mine
    }
  }

  async get(id: string): Promise<SavedPlan | null> {
    const backend = this.backend
    if (backend) {
      try {
        const found = await backend.get(id)
        if (found) return found
      } catch (error) {
        if (tableMissing(error)) this.backendOff = true
      }
    }
    // Falls through for a plan saved on this machine before there was a
    // backend, and for one opened while signed out.
    return local.get(id)
  }

  async save(input: Omit<SavedPlan, 'createdAt' | 'updatedAt'>): Promise<SavedPlan> {
    const backend = this.backend
    if (!backend) return local.save(input)
    try {
      return await backend.save(input)
    } catch (error) {
      if (tableMissing(error)) {
        this.backendOff = true
        return local.save(input)
      }
      // Anything else — not signed in, offline, refused — is the caller's to
      // report. Quietly writing to localStorage instead would tell someone
      // their design is safe on their account when it is not.
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    const backend = this.backend
    if (backend) {
      try {
        await backend.remove(id)
      } catch (error) {
        if (tableMissing(error)) this.backendOff = true
      }
    }
    await local.remove(id)
  }

  /** True when saving will go to the account rather than this browser. */
  get sharesAcrossDevices(): boolean {
    return this.backend !== null
  }
}

export const planRepository = new PlanStore()
export type { PlanRepository, SavedPlan } from './types'
