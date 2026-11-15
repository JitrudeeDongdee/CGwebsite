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

  /**
   * Keep a plan in this browser even though an account is where it belongs.
   *
   * The safety net under the sign-up gate: someone who has just drawn a house
   * and pressed save must not lose it because they do not have an account yet.
   * The work is stored first, the account is asked for second, and
   * `syncLocalToAccount` moves it up afterwards.
   */
  saveLocally(input: Omit<SavedPlan, 'createdAt' | 'updatedAt'>): Promise<SavedPlan> {
    return local.save(input)
  }

  /**
   * Move every plan held in this browser onto the signed-in account.
   *
   * Called when a session appears, which is also when a plan saved before
   * signing up should stop being a local-only copy. Returns how many moved.
   *
   * ⚠️ The local copy is removed only **after** the upload succeeds. The other
   * order loses the plan on any failure, and the whole reason this exists is
   * not to lose plans.
   */
  async syncLocalToAccount(): Promise<number> {
    const backend = this.backend
    if (!backend) return 0
    let moved = 0
    for (const plan of await local.list()) {
      try {
        await backend.save(plan)
        await local.remove(plan.id)
        moved += 1
      } catch (error) {
        // No table: nothing will work, so stop asking. Anything else (one bad
        // row, a dropped connection) leaves that plan local and tries the
        // rest — a single failure must not strand the others.
        if (tableMissing(error)) {
          this.backendOff = true
          return moved
        }
      }
    }
    return moved
  }

  /** True when saving will go to the account rather than this browser. */
  get sharesAcrossDevices(): boolean {
    return this.backend !== null
  }
}

export const planRepository = new PlanStore()
export type { PlanRepository, SavedPlan } from './types'
