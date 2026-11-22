export interface Point {
  x: number
  y: number
}

export interface DrawNode extends Point {
  id: string
}

/**
 * What one wall is finished in, overriding the whole-house choice.
 *
 * Inside and outside are separate, because they always are: the render this
 * was built from is charcoal cladding outside with timber accent panels, and
 * a room is painted on its own. A field left out falls back to the house
 * default, so a plan that sets nothing behaves exactly as before.
 */
export interface WallFinish {
  /** A `WallMaterial` from `materials.ts`; kept as a string so `drawing/types` stays dependency-free. */
  material?: string
  /** Outside face. */
  color?: string
  /** The room side, painted separately from the elevation. */
  insideColor?: string
}

export interface DrawWall {
  id: string
  a: string
  b: string
  /** Per-wall finish; unset means the house default. */
  finish?: WallFinish
  /**
   * Wall thickness in metres, measured across the centreline that `a`/`b`
   * define. Optional so existing plans keep working; renderers fall back to
   * DEFAULT_WALL_THICKNESS.
   */
  thickness?: number
}

export type OpeningKind = 'door' | 'window'

/**
 * A door or window. Bound to a wall by distance along it rather than by
 * world position, so it stays put when the wall is moved or stretched.
 */
export interface DrawOpening {
  id: string
  wallId: string
  /** Centre of the opening, in metres from the wall's `a` end. */
  offset: number
  /** Clear width in metres. */
  width: number
  kind: OpeningKind
  /** A window that runs to the floor rather than sitting on a 0.9 m sill. */
  tall?: boolean
  /**
   * A sliding glazed door — two big panes on a track, as the reference
   * render's long elevation has. Still a `door` for counting and pricing,
   * because that is what it is; only how it is BUILT differs.
   */
  sliding?: boolean
  /**
   * Glazed wall to wall: the width is resolved against the wall it lands on
   * rather than stored, so it still spans after the wall is stretched.
   */
  fullWall?: boolean
  /**
   * A plain hole punched through the wall — no frame, no leaf, no glass.
   * A pass-through, or an opening between two rooms.
   */
  open?: boolean
}

export type FixtureKind =
  /** Not furniture: a region with no floor, cut out of the room it sits in. */
  | 'floorVoid'
  | 'column'
  | 'bedDouble'
  | 'bedSingle'
  | 'sofa'
  | 'table'
  | 'toilet'
  | 'sink'
  | 'kitchen'
  | 'sofaL'
  | 'coffeeTable'
  | 'diningRound'
  | 'chair'
  | 'fridge'
  | 'wardrobe'
  | 'nightstand'
  | 'shower'
  | 'tv'
  | 'campChair'
  | 'firePit'

/**
 * A free-standing item placed on the plan — a structural column or a piece
 * of furniture. Unlike openings these aren't bound to a wall, so they carry
 * their own position and rotation.
 */
export interface DrawFixture {
  id: string
  kind: FixtureKind
  /**
   * Set on structural columns that belong to a wall junction. Their position
   * is kept in step with that corner, so moving or stretching walls carries
   * the columns along instead of leaving them behind.
   */
  nodeId?: string
  x: number
  y: number
  /** Radians, clockwise from the plan's x axis. */
  rotation: number
  width: number
  depth: number
}

/**
 * A room name, stored as a stamp at a point rather than attached to a room.
 * Rooms are derived from the walls, so they have no stable id to hang a name
 * on — but a point keeps pointing at the same room as long as the walls
 * around it still enclose it.
 */
export interface DrawRoomLabel {
  id: string
  x: number
  y: number
  name: string
}

/**
 * A band of a DIFFERENT cladding across part of one wall.
 *
 * The reference render's defining feature is warm timber panels set between
 * the glazing of a charcoal elevation. `DrawWall.finish` could not express
 * that: it is per WALL, and the long elevation is one 12 m wall, so it was
 * all charcoal or all timber with nothing in between.
 *
 * Bound to a wall by a centre `offset` exactly like an opening, so it moves
 * and survives the same edits — and deliberately NOT an opening, because
 * `kind` drives pricing, the plan-file validator and the context menu, and a
 * panel is a finish rather than a hole. It cuts no hole and costs nothing.
 */
export interface DrawWallPanel {
  id: string
  wallId: string
  /** Centre of the panel, metres along the wall from its start. */
  offset: number
  width: number
  /** What the band is clad in. Fields left out fall back to the wall's own. */
  finish: WallFinish
}

/**
 * A balcony: the floor pulled out past the wall it hangs off.
 *
 * Bound to a wall by a centre `offset` along it, like an opening and a
 * cladding band — see `balconies.ts` for why this is an array of its own and
 * not another `FixtureKind`, and why it can never be counted as living area.
 */
export interface DrawBalcony {
  id: string
  wallId: string
  /** Centre of the balcony, metres along the wall from its `a` end. */
  offset: number
  /** Width along the wall. */
  width: number
  /** How far it projects past the wall's outer FACE, in metres. */
  projection: number
  /**
   * What stands round the open edges. A balcony is normally railed — it is a
   * safety requirement, and one without reads as unfinished — so an unset
   * value means the house default rather than none. `none` is explicit.
   */
  railing?: string
}

export interface DrawingState {
  nodes: Record<string, DrawNode>
  walls: DrawWall[]
  openings: DrawOpening[]
  fixtures: DrawFixture[]
  roomLabels: DrawRoomLabel[]
  /** Optional so every older plan, saved file and test fixture still loads. */
  panels?: DrawWallPanel[]
  /** Floors pulled out past the walls. Optional, for the same reason. */
  balconies?: DrawBalcony[]
}

export type SnapTarget =
  | { type: 'node'; nodeId: string; point: Point }
  | { type: 'wallMidpoint'; wallId: string; point: Point }
