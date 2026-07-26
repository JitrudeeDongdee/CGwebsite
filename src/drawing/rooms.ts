import type { DrawingState, Point } from './types'
import { polygonArea } from './geometry'

export interface Room {
  /** Corner ids in traversal order around the room. */
  nodeIds: string[]
  area: number
  /** Label anchor — the polygon's centroid. */
  centroid: Point
  /** Outline, for point-in-room tests. */
  polygon: Point[]
}

export interface PlanFaces {
  rooms: Room[]
  totalArea: number
  /** Ids of walls lying on the building's outer boundary. */
  exteriorWallIds: Set<string>
}

interface HalfEdge {
  from: string
  to: string
  wallId: string
  angle: number
}

const EPSILON = 1e-6

function halfEdgeKey(edge: HalfEdge): string {
  return `${edge.from}->${edge.to}`
}

/** Shoelace with sign preserved: CCW is positive, CW negative. */
function signedArea(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += p1.x * p2.y - p2.x * p1.y
  }
  return sum / 2
}

function centroidOf(points: Point[]): Point {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

/**
 * Finds every enclosed room in the plan, not just one.
 *
 * The walls form a planar graph, so its faces are the rooms. Each wall
 * becomes two half-edges; at every corner the outgoing half-edges are sorted
 * by angle, and a face is traced by repeatedly taking, at the far end of the
 * current half-edge, the neighbour immediately clockwise from the way we came
 * in. That always hugs one side of the walls, so each traversal closes into a
 * single face.
 *
 * The unbounded region outside the building is also a face; it comes out with
 * the opposite winding to the rooms, which is how it's told apart (and what
 * identifies the exterior walls). Spur walls with nothing on the far side get
 * walked out and back, enclosing no area, and drop out on the area check.
 */
export function findRooms(state: DrawingState): PlanFaces {
  const outgoing = new Map<string, HalfEdge[]>()

  const addHalfEdge = (from: string, to: string, wallId: string) => {
    const a = state.nodes[from]
    const b = state.nodes[to]
    if (!a || !b) return
    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    const list = outgoing.get(from) ?? []
    list.push({ from, to, wallId, angle })
    outgoing.set(from, list)
  }

  for (const wall of state.walls) {
    if (wall.a === wall.b) continue
    addHalfEdge(wall.a, wall.b, wall.id)
    addHalfEdge(wall.b, wall.a, wall.id)
  }

  for (const list of outgoing.values()) {
    list.sort((e1, e2) => e1.angle - e2.angle)
  }

  const indexOfHalfEdge = new Map<string, number>()
  for (const list of outgoing.values()) {
    list.forEach((edge, index) => indexOfHalfEdge.set(halfEdgeKey(edge), index))
  }

  /** The half-edge continuing the face that `edge` is bounding. */
  const nextInFace = (edge: HalfEdge): HalfEdge | null => {
    const around = outgoing.get(edge.to)
    if (!around || around.length === 0) return null

    // Step back one position from the way we arrived (the reverse edge),
    // i.e. the neighbour immediately clockwise.
    const incomingIndex = indexOfHalfEdge.get(`${edge.to}->${edge.from}`)
    if (incomingIndex === undefined) return null
    return around[(incomingIndex - 1 + around.length) % around.length]
  }

  const visited = new Set<string>()
  const rooms: Room[] = []
  const exteriorWallIds = new Set<string>()

  for (const list of outgoing.values()) {
    for (const start of list) {
      if (visited.has(halfEdgeKey(start))) continue

      const face: HalfEdge[] = []
      let edge: HalfEdge | null = start

      while (edge && !visited.has(halfEdgeKey(edge))) {
        visited.add(halfEdgeKey(edge))
        face.push(edge)
        edge = nextInFace(edge)
      }

      if (face.length < 3) continue

      const points = face.map((e) => state.nodes[e.from])
      const area = signedArea(points)

      if (Math.abs(area) < EPSILON) continue

      if (area > 0) {
        rooms.push({
          nodeIds: face.map((e) => e.from),
          area: Math.abs(area),
          centroid: centroidOf(points),
          polygon: points,
        })
      } else {
        // Opposite winding: this is the region outside the building, so the
        // walls it runs along are the exterior ones.
        for (const e of face) exteriorWallIds.add(e.wallId)
      }
    }
  }

  return {
    rooms,
    totalArea: rooms.reduce((sum, room) => sum + room.area, 0),
    exteriorWallIds,
  }
}

/** Standard ray-casting test, used to match a room name stamp to its room. */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const straddles = a.y > point.y !== b.y > point.y
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/** Kept for callers that only need a single polygon's area. */
export { polygonArea }
