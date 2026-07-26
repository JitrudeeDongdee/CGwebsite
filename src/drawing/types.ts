export interface Point {
  x: number
  y: number
}

export interface DrawNode extends Point {
  id: string
}

export interface DrawWall {
  id: string
  a: string
  b: string
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
}

export type FixtureKind =
  | 'column'
  | 'bedDouble'
  | 'bedSingle'
  | 'sofa'
  | 'table'
  | 'toilet'
  | 'sink'
  | 'kitchen'

/**
 * A free-standing item placed on the plan — a structural column or a piece
 * of furniture. Unlike openings these aren't bound to a wall, so they carry
 * their own position and rotation.
 */
export interface DrawFixture {
  id: string
  kind: FixtureKind
  x: number
  y: number
  /** Radians, clockwise from the plan's x axis. */
  rotation: number
  width: number
  depth: number
}

export interface DrawingState {
  nodes: Record<string, DrawNode>
  walls: DrawWall[]
  openings: DrawOpening[]
  fixtures: DrawFixture[]
}

export type SnapTarget =
  | { type: 'node'; nodeId: string; point: Point }
  | { type: 'wallMidpoint'; wallId: string; point: Point }
