import { supabase } from '../supabase/client'
import type { DrawingState } from '../drawing/types'
import type { PlanRepository, SavedPlan } from './types'

/**
 * Saved plans in Postgres, so a design outlives the browser that drew it and
 * `/design/<id>` opens on any machine the owner signs in on.
 *
 * RLS is the access rule (see the migration): a signed-in account reads and
 * writes only rows where `owner = auth.uid()`, and staff may READ any plan so
 * the team can open a design a customer is asking about. A signed-out caller
 * therefore gets an empty list rather than an error — that is the policy
 * working, not a fault.
 */
export class SupabasePlanRepository implements PlanRepository {
  private get db() {
    if (!supabase) throw new Error('supabase is not configured')
    return supabase
  }

  private static toPlan(row: Record<string, unknown>): SavedPlan {
    return {
      id: row.id as string,
      name: (row.name as string) ?? '',
      floors: (row.floors as DrawingState[]) ?? [],
      options: (row.options as Record<string, unknown>) ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  async list(): Promise<SavedPlan[]> {
    const { data, error } = await this.db
      .from('plans')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(SupabasePlanRepository.toPlan)
  }

  async get(id: string): Promise<SavedPlan | null> {
    const { data, error } = await this.db.from('plans').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? SupabasePlanRepository.toPlan(data) : null
  }

  async save(input: Omit<SavedPlan, 'createdAt' | 'updatedAt'>): Promise<SavedPlan> {
    const { data: auth } = await this.db.auth.getUser()
    const owner = auth.user?.id
    // Said plainly rather than letting RLS refuse the row: "new row violates
    // row-level security policy" is not something to show a customer who has
    // simply been signed out while the tab was open.
    if (!owner) throw new Error('plan-save-needs-sign-in')

    const { data, error } = await this.db
      .from('plans')
      // Upsert on the primary key: the editor mints the id on the first save
      // and re-sends the same one afterwards, so one path covers both.
      .upsert(
        { id: input.id, owner, name: input.name, floors: input.floors, options: input.options ?? {} },
        { onConflict: 'id' },
      )
      .select()
      .single()
    if (error) throw error
    return SupabasePlanRepository.toPlan(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('plans').delete().eq('id', id)
    if (error) throw error
  }
}
