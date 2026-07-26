import type { DrawingState } from '../drawing/types'
import type { MaterialGrade, PriceEstimate } from '../pricing/types'

export const LEAD_STATUSES = ['new', 'contacted', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export interface LeadContact {
  name: string
  phone: string
  email: string
  province: string
  /** When they want to start building (selected from preset ranges). */
  timeline: string
}

export interface Lead {
  id: string
  contact: LeadContact
  status: LeadStatus
  createdAt: string
  /**
   * Frozen snapshot of the plan as submitted. Deliberately a copy, not a
   * reference to live editor state: the sales team needs to see exactly
   * what the customer sent, even if the customer keeps editing afterwards.
   */
  plan: DrawingState
  grade: MaterialGrade
  /** Estimate as shown to the customer at submit time, including the rate used. */
  estimate: PriceEstimate | null
}

export interface LeadRepository {
  list(): Promise<Lead[]>
  create(input: Omit<Lead, 'id' | 'createdAt' | 'status'>): Promise<Lead>
  updateStatus(id: string, status: LeadStatus): Promise<void>
}
