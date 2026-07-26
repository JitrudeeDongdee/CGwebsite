import type { OpeningKind } from './types'

/**
 * What a click on the canvas means.
 *
 * `select` deliberately creates nothing — it only moves what's already
 * there, so a customer can adjust a starter plan without accidentally
 * drawing extra walls.
 */
export type ToolMode =
  | { type: 'select' }
  | { type: 'draw' }
  | { type: 'opening'; kind: OpeningKind; width: number }

export const SELECT_TOOL: ToolMode = { type: 'select' }
export const DRAW_TOOL: ToolMode = { type: 'draw' }
