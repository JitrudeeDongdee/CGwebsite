import type { DrawingState, DrawOpening, OpeningKind, Point } from './types'
import { distance } from './geometry'
import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './wallOutline'

/**
 * One entry in the palette. Declared rather than inferred from `as const`:
 * with literal types each preset got its own shape and the optional flags
 * existed on only some of them, so reading `preset.sliding` did not compile.
 */
export interface OpeningPreset {
  kind: OpeningKind
  width: number
  labelKey: string
  tall?: boolean
  sliding?: boolean
  fullWall?: boolean
  open?: boolean
}

/** Standard sizes offered in the palette, in metres. */
export const OPENING_PRESETS: readonly OpeningPreset[] = [
  { kind: 'door', width: 0.8, labelKey: 'openings.door80' },
  { kind: 'door', width: 0.9, labelKey: 'openings.door90' },
  { kind: 'window', width: 1.0, labelKey: 'openings.window100' },
  { kind: 'window', width: 1.5, labelKey: 'openings.window150' },
  // Floor to head, as the reference render's glazed bays are. `tall` is what
  // tells the 3D builder to drop the sill rather than sit it at 0.9 m.
  { kind: 'window', width: 2.0, labelKey: 'openings.windowFull', tall: true },
  // The reference render's long elevation: a wide sliding glazed door, and
  // bays glazed from wall to wall between the timber panels.
  { kind: 'door', width: 1.8, labelKey: 'openings.sliding180', sliding: true, tall: true },
  { kind: 'door', width: 2.4, labelKey: 'openings.sliding240', sliding: true, tall: true },
  { kind: 'window', width: 2.4, labelKey: 'openings.glassWall', tall: true, fullWall: true },
  // A hole, with nothing in it.
  { kind: 'window', width: 1.0, labelKey: 'openings.hole', open: true },
]

export interface PlacedOpening {
  opening: DrawOpening
  /** Clear width on the wall — resolved, so a `fullWall` bay reports its span. */
  width: number
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
/**
 * The clear width an opening actually takes on its wall.
 *
 * A `fullWall` glazed bay is stored with whatever width it was placed at but
 * DRAWN wall to wall, less a jamb each end — so stretching the wall widens
 * the glass with it instead of leaving a stripe of blank wall.
 */
export const FULL_WALL_JAMB = 0.12

export function resolveOpening(
  opening: DrawOpening,
  wallLength: number,
): { offset: number; width: number } {
  if (!opening.fullWall) return { offset: opening.offset, width: opening.width }
  // Wall to wall, and therefore centred on it — a glazed bay placed where
  // the pointer happened to be would hang off one end.
  const width = Math.max(0.3, wallLength - FULL_WALL_JAMB * 2)
  return { offset: wallLength / 2, width }
}

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
    const { offset, width } = resolveOpening(opening, length)
    const center = {
      x: a.x + direction.x * offset,
      y: a.y + direction.y * offset,
    }

    placed.push({
      opening,
      width,
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
