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

export interface DrawingState {
  nodes: Record<string, DrawNode>
  walls: DrawWall[]
  openings: DrawOpening[]
  fixtures: DrawFixture[]
  roomLabels: DrawRoomLabel[]
}

export type SnapTarget =
  | { type: 'node'; nodeId: string; point: Point }
  | { type: 'wallMidpoint'; wallId: string; point: Point }
