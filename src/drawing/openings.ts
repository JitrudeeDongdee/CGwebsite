import type { DrawingState, DrawOpening, Point } from './types'
import { distance } from './geometry'
import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './wallOutline'

/** Standard sizes offered in the palette, in metres. */
export const OPENING_PRESETS = [
  { kind: 'door', width: 0.8, labelKey: 'openings.door80' },
  { kind: 'door', width: 0.9, labelKey: 'openings.door90' },
  { kind: 'window', width: 1.0, labelKey: 'openings.window100' },
  { kind: 'window', width: 1.5, labelKey: 'openings.window150' },
] as const

export interface PlacedOpening {
  opening: DrawOpening
  /** Centre point in world coordinates. */
  center: Point
  /** Unit vector along the wall, from a to b. */
  direction: Point
  thickness: number
}

/**
 * Resolves each opening's stored wall + offset into world geometry. Because
 * the position is stored along the wall rather than as a coordinate, moving
 * or stretching a wall carries its doors and windows with it for free.
 */
export function placeOpenings(
  state: DrawingState,
  exteriorWallIds: ReadonlySet<string>,
): PlacedOpening[] {
  const placed: PlacedOpening[] = []

  for (const opening of state.openings) {
    const wall = state.walls.find((w) => w.id === opening.wallId)
    if (!wall) continue

    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (!a || !b) continue

    const length = distance(a, b)
    if (length === 0) continue

    const direction = { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
    const center = {
      x: a.x + direction.x * opening.offset,
      y: a.y + direction.y * opening.offset,
    }

    placed.push({
      opening,
      center,
      direction,
      thickness:
        wall.thickness ??
        (exteriorWallIds.has(wall.id) ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS),
    })
  }

  return placed
}

/**
 * Distance along the wall (from its `a` end) of the point on the wall
 * nearest `point` — where a click should drop an opening.
 */
export function offsetAlongWall(state: DrawingState, wallId: string, point: Point): number | null {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return null

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return null

  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return null

  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq
  return Math.max(0, Math.min(1, t)) * Math.sqrt(lengthSq)
}

/** Nearest opening to a point, for right-click targeting. */
export function findOpeningAt(
  placed: PlacedOpening[],
  point: Point,
  threshold = 0.4,
): DrawOpening | null {
  let best: DrawOpening | null = null
  let bestDist = threshold

  for (const item of placed) {
    const d = distance(point, item.center)
    if (d < bestDist) {
      bestDist = d
      best = item.opening
    }
  }
  return best
}
