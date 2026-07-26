import type {
  DrawFixture,
  DrawingState,
  DrawNode,
  DrawOpening,
  DrawWall,
  OpeningKind,
} from './types'
import { fixtureSpec } from './fixtures'
import { distanceToSegment } from './geometry'

export interface PlanTemplate {
  id: string
  /** i18n key for the display name. */
  nameKey: string
  /** Overall footprint in metres, shown on the card. */
  width: number
  depth: number
  /** Rooms the layout is meant to produce — asserted by the template tests. */
  expectedRooms: number
  /** Doors + windows the layout should place — asserted by the tests too. */
  expectedOpenings: number
  build: () => DrawingState
}

/** A door or window authored by the point on the wall it sits at. */
interface OpeningSpec {
  x: number
  y: number
  width: number
  kind: OpeningKind
}

interface Spec {
  width: number
  depth: number
  /** Interior partitions as [x1, y1, x2, y2] in footprint-local metres. */
  partitions: [number, number, number, number][]
  /** Doors and windows, positioned in footprint-local metres. */
  openings?: OpeningSpec[]
}

type Segment = [number, number, number, number]

const EPSILON = 1e-6

function isBetween(value: number, a: number, b: number): boolean {
  return value > Math.min(a, b) + EPSILON && value < Math.max(a, b) - EPSILON
}

/** Whether `p` lies on segment `s`, strictly between its endpoints. */
function pointSplitsSegment(px: number, py: number, [x1, y1, x2, y2]: Segment): boolean {
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1)
  if (Math.abs(cross) > EPSILON) return false
  return isBetween(px, x1, x2) || isBetween(py, y1, y2)
}

/**
 * Splits segments wherever another segment's endpoint lands in the middle of
 * them. Without this a partition that meets the middle of another wall just
 * stops next to it, sharing no corner, and the two never enclose a room.
 *
 * Only endpoint-on-segment junctions are handled — templates are authored
 * data, so partitions are written to meet at endpoints rather than cross.
 */
function planarize(segments: Segment[]): Segment[] {
  const points: [number, number][] = []
  for (const [x1, y1, x2, y2] of segments) {
    points.push([x1, y1], [x2, y2])
  }

  const result: Segment[] = []

  for (const segment of segments) {
    const [x1, y1, x2, y2] = segment
    const cuts = points.filter(([px, py]) => pointSplitsSegment(px, py, segment))

    if (cuts.length === 0) {
      result.push(segment)
      continue
    }

    // Order the cut points along the segment, then emit the pieces.
    const along = ([px, py]: [number, number]) => (x2 - x1) * (px - x1) + (y2 - y1) * (py - y1)
    const ordered = [...cuts].sort((p, q) => along(p) - along(q))

    let [cx, cy] = [x1, y1]
    for (const [px, py] of ordered) {
      if (Math.abs(px - cx) > EPSILON || Math.abs(py - cy) > EPSILON) {
        result.push([cx, cy, px, py])
      }
      ;[cx, cy] = [px, py]
    }
    if (Math.abs(x2 - cx) > EPSILON || Math.abs(y2 - cy) > EPSILON) {
      result.push([cx, cy, x2, y2])
    }
  }

  return result
}

function buildFromSpec({ width, depth, partitions, openings = [] }: Spec): DrawingState {
  const halfW = width / 2
  const halfD = depth / 2

  // Footprint centred on the origin so a loaded plan sits mid-view.
  const shell: Segment[] = [
    [-halfW, -halfD, halfW, -halfD],
    [halfW, -halfD, halfW, halfD],
    [halfW, halfD, -halfW, halfD],
    [-halfW, halfD, -halfW, -halfD],
  ]

  const interior: Segment[] = partitions.map(
    ([x1, y1, x2, y2]) => [x1 - halfW, y1 - halfD, x2 - halfW, y2 - halfD] as Segment,
  )

  const segments = planarize([...shell, ...interior])

  const nodes: Record<string, DrawNode> = {}
  const byPosition = new Map<string, string>()
  const walls: DrawWall[] = []
  let nodeSeq = 0

  const nodeAt = (x: number, y: number): string => {
    const key = `${x.toFixed(3)}:${y.toFixed(3)}`
    const existing = byPosition.get(key)
    if (existing) return existing
    const id = `tpl_node_${nodeSeq++}`
    byPosition.set(key, id)
    nodes[id] = { id, x, y }
    return id
  }

  segments.forEach(([x1, y1, x2, y2], index) => {
    const a = nodeAt(x1, y1)
    const b = nodeAt(x2, y2)
    if (a !== b) walls.push({ id: `tpl_wall_${index}`, a, b })
  })

  // Openings are authored as a point on a wall rather than a wall id,
  // because the ids only exist after planarization has split the walls.
  const placed: DrawOpening[] = []
  openings.forEach((spec, index) => {
    const point = { x: spec.x - halfW, y: spec.y - halfD }

    const host = walls.find(
      (wall) => distanceToSegment(point, nodes[wall.a], nodes[wall.b]) < 1e-6,
    )
    if (!host) return

    const a = nodes[host.a]
    const b = nodes[host.b]
    const wallLength = Math.hypot(b.x - a.x, b.y - a.y)
    if (wallLength <= spec.width) return

    const offset = Math.hypot(point.x - a.x, point.y - a.y)
    const half = spec.width / 2
    placed.push({
      id: `tpl_opening_${index}`,
      wallId: host.id,
      offset: Math.min(Math.max(offset, half), wallLength - half),
      width: spec.width,
      kind: spec.kind,
    })
  })

  // Structural columns land on every wall junction — that's where the posts
  // go in a real prefab frame, and it matches how these plans are drawn.
  const columnSpec = fixtureSpec('column')
  const fixtures: DrawFixture[] = Object.values(nodes).map((node, index) => ({
    id: `tpl_column_${index}`,
    kind: 'column' as const,
    x: node.x,
    y: node.y,
    rotation: 0,
    width: columnSpec.width,
    depth: columnSpec.depth,
  }))

  return { nodes, walls, openings: placed, fixtures }
}

/**
 * Small prefab / knock-down house footprints — the scale this tool is aimed
 * at, so a customer starts from something realistic and edits it rather than
 * drawing from nothing.
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'studio-6x4',
    nameKey: 'templates.studio',
    width: 6,
    depth: 4,
    // Living space + bathroom.
    expectedRooms: 2,
    expectedOpenings: 5,
    build: () =>
      buildFromSpec({
        width: 6,
        depth: 4,
        // Bathroom boxed into the back-right corner.
        partitions: [
          [4.5, 4, 4.5, 2],
          [4.5, 2, 6, 2],
        ],
        openings: [
          { x: 1.5, y: 0, width: 0.9, kind: 'door' }, // entrance
          { x: 4.5, y: 3, width: 0.8, kind: 'door' }, // bathroom
          { x: 2, y: 4, width: 1.5, kind: 'window' },
          { x: 0, y: 2, width: 1, kind: 'window' },
          { x: 6, y: 1, width: 1, kind: 'window' },
        ],
      }),
  },
  {
    id: 'one-bed-6x6',
    nameKey: 'templates.oneBed',
    width: 6,
    depth: 6,
    // Bedroom, living, bathroom.
    expectedRooms: 3,
    expectedOpenings: 6,
    build: () =>
      buildFromSpec({
        width: 6,
        depth: 6,
        // Bedroom across the back; the front splits into living and bathroom.
        partitions: [
          [0, 3.5, 6, 3.5],
          [2, 0, 2, 3.5],
        ],
        openings: [
          { x: 4, y: 0, width: 0.9, kind: 'door' }, // entrance
          { x: 2, y: 1.75, width: 0.8, kind: 'door' }, // bathroom
          { x: 4, y: 3.5, width: 0.8, kind: 'door' }, // bedroom
          { x: 3, y: 6, width: 1.5, kind: 'window' },
          { x: 6, y: 5, width: 1, kind: 'window' },
          { x: 6, y: 1.75, width: 1, kind: 'window' },
        ],
      }),
  },
  {
    id: 'two-bed-8x6',
    nameKey: 'templates.twoBed',
    width: 8,
    depth: 6,
    // Two bedrooms, living, bathroom.
    expectedRooms: 4,
    expectedOpenings: 7,
    build: () =>
      buildFromSpec({
        width: 8,
        depth: 6,
        // Two bedrooms along the back; bathroom off the front-right corner.
        partitions: [
          [0, 3.5, 8, 3.5],
          [4, 3.5, 4, 6],
          [6, 0, 6, 1.8],
          [6, 1.8, 8, 1.8],
        ],
        openings: [
          { x: 2, y: 0, width: 0.9, kind: 'door' }, // entrance
          { x: 2, y: 3.5, width: 0.8, kind: 'door' }, // bedroom 1
          { x: 6, y: 3.5, width: 0.8, kind: 'door' }, // bedroom 2
          { x: 6, y: 0.9, width: 0.8, kind: 'door' }, // bathroom
          { x: 2, y: 6, width: 1, kind: 'window' },
          { x: 6, y: 6, width: 1, kind: 'window' },
          { x: 0, y: 1.5, width: 1.5, kind: 'window' },
        ],
      }),
  },
  {
    id: 'shop-6x8',
    nameKey: 'templates.shop',
    width: 6,
    depth: 8,
    // Shopfront, store room, bathroom.
    expectedRooms: 3,
    expectedOpenings: 6,
    build: () =>
      buildFromSpec({
        width: 6,
        depth: 8,
        // Open shopfront, with a store room and bathroom across the back.
        partitions: [
          [0, 6, 6, 6],
          [4, 6, 4, 8],
        ],
        openings: [
          { x: 3, y: 0, width: 0.9, kind: 'door' }, // shop entrance
          { x: 1, y: 0, width: 1.5, kind: 'window' }, // shopfront glazing
          { x: 5, y: 0, width: 1.5, kind: 'window' },
          { x: 2, y: 6, width: 0.8, kind: 'door' }, // store room
          { x: 4, y: 7, width: 0.8, kind: 'door' }, // bathroom
          { x: 0, y: 3, width: 1.5, kind: 'window' },
        ],
      }),
  },
]
