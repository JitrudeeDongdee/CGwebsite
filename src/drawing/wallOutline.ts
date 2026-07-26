import type { DrawingState, Point } from './types'

/** Typical interior partition, in metres. */
export const DEFAULT_WALL_THICKNESS = 0.15

/**
 * Past this multiple of the half-thickness a miter spike is cut off and the
 * plain offset corner is used instead. Without it, two walls meeting at a
 * very sharp angle produce a corner point shooting far off the plan.
 */
const MITER_LIMIT = 4

/** The four corners of one wall's band, in order around the polygon. */
export interface WallOutline {
  wallId: string
  /** [ +side at a, +side at b, -side at b, -side at a ] */
  corners: [Point, Point, Point, Point]
}

interface Spoke {
  wallId: string
  /** Unit direction pointing away from the node this spoke belongs to. */
  dir: Point
  halfThickness: number
  angle: number
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x
}

/** `dir` rotated 90° counter-clockwise — the left-hand side of `dir`. */
function leftNormal(dir: Point): Point {
  return { x: -dir.y, y: dir.x }
}

/**
 * Intersection of the lines through p1 (along d1) and p2 (along d2), or null
 * when they're parallel.
 */
function intersectLines(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const denominator = cross(d1, d2)
  if (Math.abs(denominator) < 1e-9) return null

  const t = cross(subtract(p2, p1), d2) / denominator
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t }
}

/**
 * Where a wall's edge should sit at a shared corner.
 *
 * Walking counter-clockwise, the wedge between two neighbouring walls is
 * bounded by the first wall's left edge and the next wall's right edge, so
 * the corner they share is exactly where those two offset lines cross.
 * Parallel lines (a straight run through the node) have no intersection —
 * the plain offset point is already correct there.
 */
function miterPoint(node: Point, from: Spoke, to: Spoke): Point {
  const fromOffset = leftNormal(from.dir)
  const toOffset = leftNormal(to.dir)

  const fromPoint = {
    x: node.x + fromOffset.x * from.halfThickness,
    y: node.y + fromOffset.y * from.halfThickness,
  }
  const toPoint = {
    x: node.x - toOffset.x * to.halfThickness,
    y: node.y - toOffset.y * to.halfThickness,
  }

  const hit = intersectLines(fromPoint, from.dir, toPoint, to.dir)
  if (!hit) return fromPoint

  const reach = Math.hypot(hit.x - node.x, hit.y - node.y)
  if (reach > MITER_LIMIT * from.halfThickness) return fromPoint

  return hit
}

/**
 * Turns wall centrelines into filled bands whose edges meet cleanly at
 * shared corners — the double-line poché of a real floor plan, rather than
 * overlapping rectangles with notched joints.
 */
export function computeWallOutlines(state: DrawingState): WallOutline[] {
  // Every wall end, grouped by the node it touches.
  const spokesByNode = new Map<string, Spoke[]>()

  for (const wall of state.walls) {
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (!a || !b) continue

    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy)
    if (length === 0) continue

    const halfThickness = (wall.thickness ?? DEFAULT_WALL_THICKNESS) / 2
    const forward = { x: dx / length, y: dy / length }
    const backward = { x: -forward.x, y: -forward.y }

    const push = (nodeId: string, dir: Point) => {
      const spokes = spokesByNode.get(nodeId) ?? []
      spokes.push({ wallId: wall.id, dir, halfThickness, angle: Math.atan2(dir.y, dir.x) })
      spokesByNode.set(nodeId, spokes)
    }

    push(wall.a, forward)
    push(wall.b, backward)
  }

  // Resolved edge points, keyed by wall+node, in that spoke's own terms.
  const edges = new Map<string, { left: Point; right: Point }>()
  const key = (wallId: string, nodeId: string) => `${wallId}@${nodeId}`

  for (const [nodeId, spokes] of spokesByNode) {
    const node = state.nodes[nodeId]
    spokes.sort((s1, s2) => s1.angle - s2.angle)

    if (spokes.length === 1) {
      // Free end: cap it square across the centreline.
      const spoke = spokes[0]
      const normal = leftNormal(spoke.dir)
      edges.set(key(spoke.wallId, nodeId), {
        left: {
          x: node.x + normal.x * spoke.halfThickness,
          y: node.y + normal.y * spoke.halfThickness,
        },
        right: {
          x: node.x - normal.x * spoke.halfThickness,
          y: node.y - normal.y * spoke.halfThickness,
        },
      })
      continue
    }

    for (let i = 0; i < spokes.length; i++) {
      const current = spokes[i]
      const next = spokes[(i + 1) % spokes.length]
      const shared = miterPoint(node, current, next)

      const currentEdge = edges.get(key(current.wallId, nodeId)) ?? {
        left: shared,
        right: shared,
      }
      currentEdge.left = shared
      edges.set(key(current.wallId, nodeId), currentEdge)

      const nextEdge = edges.get(key(next.wallId, nodeId)) ?? { left: shared, right: shared }
      nextEdge.right = shared
      edges.set(key(next.wallId, nodeId), nextEdge)
    }
  }

  const outlines: WallOutline[] = []

  for (const wall of state.walls) {
    const atA = edges.get(key(wall.id, wall.a))
    const atB = edges.get(key(wall.id, wall.b))
    if (!atA || !atB) continue

    // At `a` the spoke points along the wall, so its left is the wall's +side.
    // At `b` the spoke points back, so the sides swap.
    outlines.push({
      wallId: wall.id,
      corners: [atA.left, atB.right, atB.left, atA.right],
    })
  }

  return outlines
}
