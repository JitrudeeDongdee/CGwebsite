import type { DrawBalcony, DrawingState, DrawWall, Point } from './types'
import { distance } from './geometry'
import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './wallOutline'

/**
 * Balconies — the floor pulled out past the walls.
 *
 * ⚠️ WHY A WALL-BOUND ARRAY AND NOT A FIXTURE KIND, which is how `floorVoid`
 * was done. A void is a free rectangle in the middle of a room: nothing
 * anchors it, so being a fixture handed it placement, dragging, rotation,
 * delete, selection, undo, templates and the file format for nothing. A
 * balcony is the opposite case. It is only a balcony while it is ATTACHED to
 * the building edge — detached it is a deck on the ground, and on an upper
 * storey it is a slab hanging in mid air. Walls here can be slid sideways and
 * their corners dragged (which stretches them), and a loose rectangle would
 * be left behind by both with nothing noticing.
 *
 * So it is bound to its wall by a centre `offset` along it, exactly as
 * `DrawOpening` and `DrawWallPanel` are, and for the same stated reason: it
 * then moves and survives the same edits. A balcony has the same relationship
 * to a wall that a window does.
 *
 * Two things fall out of the binding that a loose rectangle could not give:
 * which way is OUT (the host wall's outward normal), without which there is
 * no balcony, only a rectangle; and the three outer edges the railing is
 * derived from, which is what keeps the rail on the balcony rather than
 * placed by hand.
 *
 * ⚠️ AREA AND PRICE. A balcony is outside the enclosed envelope and must
 * never be counted as living area. It cannot be, by construction: `findRooms`
 * derives rooms from the planar graph of WALLS, and a balcony is not a wall,
 * so there is no face to count — and `estimatePrice` takes only that room
 * area plus the opening count. Nothing is subtracted anywhere, which is the
 * point: `floorVoid` has to subtract, and that subtraction needs a clamp at
 * zero to stop a dragged void pricing a house negatively.
 */

/** Clear projection past the wall face, in metres. */
export const BALCONY_PROJECTIONS = [1.0, 1.5, 2.0] as const
export const DEFAULT_BALCONY_PROJECTION = 1.5
export const DEFAULT_BALCONY_WIDTH = 2.4

export const MIN_BALCONY_PROJECTION = 0.4
export const MAX_BALCONY_PROJECTION = 4
export const MIN_BALCONY_WIDTH = 0.6

/**
 * How far the slab reaches back past the wall's outer face, under the wall.
 * Without it the slab and the wall meet exactly on a plane and the seam shows
 * as a flickering line from most angles.
 */
export const BALCONY_WALL_OVERLAP = 0.06

/** Thickness of the balcony slab itself. */
export const BALCONY_SLAB = 0.18

export function wallThickness(
  wall: DrawWall,
  exteriorWallIds: ReadonlySet<string>,
): number {
  return (
    wall.thickness ??
    (exteriorWallIds.has(wall.id) ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS)
  )
}

/** The middle of the plan, which is what "outward" is measured against. */
export function planCentre(state: DrawingState): Point {
  const nodes = Object.values(state.nodes)
  if (nodes.length === 0) return { x: 0, y: 0 }
  return {
    x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length,
    y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length,
  }
}

/**
 * The wall's perpendicular, flipped to point away from the plan's centre —
 * the same rule `building3d` uses to decide which face of a wall is outside.
 */
export function wallOutward(a: Point, b: Point, centre: Point): Point {
  const length = distance(a, b) || 1
  const dirX = (b.x - a.x) / length
  const dirY = (b.y - a.y) / length
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2
  const away = (midX - centre.x) * dirY - (midY - centre.y) * dirX
  const sign = away >= 0 ? 1 : -1
  return { x: dirY * sign, y: -dirX * sign }
}

/**
 * What a stored balcony actually measures on the wall it is on now.
 *
 * Resolved rather than stored, the way a `fullWall` opening is: a wall that
 * was shortened after the balcony was placed would otherwise carry a slab
 * hanging off its end.
 */
export function resolveBalcony(
  balcony: DrawBalcony,
  wallLength: number,
): { offset: number; width: number; projection: number } {
  const width = Math.max(MIN_BALCONY_WIDTH, Math.min(balcony.width, wallLength))
  const half = width / 2
  return {
    width,
    offset: Math.min(Math.max(balcony.offset, half), Math.max(half, wallLength - half)),
    projection: Math.max(
      MIN_BALCONY_PROJECTION,
      Math.min(MAX_BALCONY_PROJECTION, balcony.projection),
    ),
  }
}

export interface PlacedBalcony {
  balcony: DrawBalcony
  /** Centre of the slab in plan. */
  center: Point
  width: number
  /** Clear projection past the wall face — what a customer means by depth. */
  projection: number
  /** Depth of the slab as drawn, so it tucks under the wall by the overlap. */
  depth: number
  /** Unit vector along the host wall, a → b. */
  direction: Point
  /** Unit vector out of the building. */
  outward: Point
  /** Rotation about the vertical, matching the wall. */
  angle: number
  /** Inner-left, outer-left, outer-right, inner-right. */
  corners: [Point, Point, Point, Point]
  /**
   * The three edges a railing runs along: the two returns and the outer face.
   * The fourth edge is the house, which needs no rail.
   */
  rails: { from: Point; to: Point }[]
}

/** Resolves every balcony's wall + offset into world geometry. */
export function placeBalconies(
  state: DrawingState,
  exteriorWallIds: ReadonlySet<string> = new Set<string>(),
): PlacedBalcony[] {
  const list = state.balconies ?? []
  if (list.length === 0) return []
  const centre = planCentre(state)
  const placed: PlacedBalcony[] = []

  for (const balcony of list) {
    const wall = state.walls.find((one) => one.id === balcony.wallId)
    if (!wall) continue
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (!a || !b) continue

    const length = distance(a, b)
    if (length === 0) continue

    const direction = { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
    const outward = wallOutward(a, b, centre)
    const { offset, width, projection } = resolveBalcony(balcony, length)

    // From under the wall's outer face out to the full projection.
    const thickness = wallThickness(wall, exteriorWallIds)
    const inner = thickness / 2 - BALCONY_WALL_OVERLAP
    const outer = thickness / 2 + projection
    const depth = outer - inner
    const mid = (inner + outer) / 2

    const on = { x: a.x + direction.x * offset, y: a.y + direction.y * offset }
    const center = { x: on.x + outward.x * mid, y: on.y + outward.y * mid }

    const corner = (along: number, out: number): Point => ({
      x: on.x + direction.x * along + outward.x * out,
      y: on.y + direction.y * along + outward.y * out,
    })

    const innerLeft = corner(-width / 2, inner)
    const outerLeft = corner(-width / 2, outer)
    const outerRight = corner(width / 2, outer)
    const innerRight = corner(width / 2, inner)

    placed.push({
      balcony,
      center,
      width,
      projection,
      depth,
      direction,
      outward,
      angle: Math.atan2(direction.y, direction.x),
      corners: [innerLeft, outerLeft, outerRight, innerRight],
      rails: [
        { from: innerLeft, to: outerLeft },
        { from: outerLeft, to: outerRight },
        { from: outerRight, to: innerRight },
      ],
    })
  }

  return placed
}

/** The balcony under a point, for click targeting. Later ones draw on top. */
export function findBalconyAt(placed: PlacedBalcony[], point: Point): DrawBalcony | null {
  for (let i = placed.length - 1; i >= 0; i--) {
    const item = placed[i]
    const dx = point.x - item.center.x
    const dy = point.y - item.center.y
    // Into the slab's own frame: along the wall, and out from it.
    const along = dx * item.direction.x + dy * item.direction.y
    const out = dx * item.outward.x + dy * item.outward.y
    if (Math.abs(along) <= item.width / 2 && Math.abs(out) <= item.depth / 2) {
      return item.balcony
    }
  }
  return null
}

/** Total balcony area, for reporting it SEPARATELY from the living area. */
export function balconyArea(placed: PlacedBalcony[]): number {
  // The clear area someone can stand on — the overlap under the wall is
  // structure, not floor, so it is left out of the figure.
  return placed.reduce((sum, item) => sum + item.width * item.projection, 0)
}
