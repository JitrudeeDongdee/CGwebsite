import type { FixtureKind, OpeningKind, WallFinish } from './types'

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
  | {
      type: 'opening'
      kind: OpeningKind
      width: number
      tall?: boolean
      sliding?: boolean
      fullWall?: boolean
      open?: boolean
      /** Which preset armed this, so the palette can mark the right tile. */
      labelKey?: string
    }
  | { type: 'fixture'; kind: FixtureKind }
  /**
   * Brush a finish onto one wall. A tool rather than a property panel: there
   * is no "selected wall" in this editor, and picking a colour then clicking
   * the walls you want it on is how a build-mode catalogue already works.
   */
  | { type: 'paint'; finish: WallFinish; face: 'outside' | 'inside' }

export const SELECT_TOOL: ToolMode = { type: 'select' }
/** Default draw mode: `auto` thickness, matching the previous behaviour. */
export const DRAW_TOOL: ToolMode = { type: 'draw', wallTypeId: 'auto', thickness: undefined }
