import type { FixtureKind, OpeningKind } from './types'

/**
 * What a click on the canvas means.
 *
 * `select` deliberately creates nothing — it only moves what's already
 * there, so a customer can adjust a starter plan without accidentally
 * drawing extra walls.
 */
export type ToolMode =
  | { type: 'select' }
  | { type: 'draw'; wallTypeId: string; thickness?: number }
  | { type: 'opening'; kind: OpeningKind; width: number }
  | { type: 'fixture'; kind: FixtureKind }

export const SELECT_TOOL: ToolMode = { type: 'select' }
/** Default draw mode: `auto` thickness, matching the previous behaviour. */
export const DRAW_TOOL: ToolMode = { type: 'draw', wallTypeId: 'auto', thickness: undefined }
