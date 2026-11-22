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
  /**
   * Drop a band of different cladding on part of a wall.
   *
   * Separate from `paint`, which takes a WHOLE wall: this one needs a width,
   * and clicking an existing band removes it rather than repainting it.
   */
  | { type: 'panel'; finish: WallFinish; width: number }
  /**
   * Pull the floor out from a wall into a balcony. Click a wall to place one;
   * click a balcony already there to take it away, the way the panel brush
   * toggles — so removing one needs no second tool and no selection.
   */
  | { type: 'balcony'; projection: number; width: number }

export const SELECT_TOOL: ToolMode = { type: 'select' }
/** Default draw mode: `auto` thickness, matching the previous behaviour. */
export const DRAW_TOOL: ToolMode = { type: 'draw', wallTypeId: 'auto', thickness: undefined }
