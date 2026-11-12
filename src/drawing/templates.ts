import type {
  DrawFixture,
  DrawingState,
  DrawNode,
  DrawOpening,
  DrawRoomLabel,
  DrawWall,
  FixtureKind,
  OpeningKind,
} from './types'
import { fixtureSpec } from './fixtures'
import { HOUSE_STYLES, type HouseFinish } from './houseStyle'
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
  /** Applied to the 3D view when this plan is loaded, where it has one. */
  finish?: HouseFinish
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
  /**
   * One end left out of the shell, for a bay that is roofed but not walled —
   * a covered porch. Leaving the wall out (rather than putting a wide opening
   * in it) keeps the bay out of the room list, so its floor is not counted as
   * living area or priced as one; the roof still spans it, because the roof
   * follows the corner NODES, which are still there.
   */
  openEnd?: 'left' | 'right'
  /**
   * Furniture and columns beyond the automatic junction columns. `width` and
   * `depth` override the catalogue size for a piece that is built to fit —
   * a kitchen run along a short wall, say.
   */
  furniture?: {
    kind: FixtureKind
    x: number
    y: number
    rotation?: number
    width?: number
    depth?: number
  }[]
  /** Room names, stamped at a point inside the room they name. */
  labels?: { x: number; y: number; nameKey: string }[]
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

function buildFromSpec({
  width,
  depth,
  partitions,
  openEnd,
  openings = [],
  furniture = [],
  labels = [],
}: Spec): DrawingState {
  const halfW = width / 2
  const halfD = depth / 2

  // Footprint centred on the origin so a loaded plan sits mid-view.
  const shell: Segment[] = [
    [-halfW, -halfD, halfW, -halfD],
    [halfW, -halfD, halfW, halfD],
    [halfW, halfD, -halfW, halfD],
    [-halfW, halfD, -halfW, -halfD],
  ]
  if (openEnd === 'left') shell.splice(3, 1)
  if (openEnd === 'right') shell.splice(1, 1)

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

  // Junction columns are added by loadPlan's column sync, so templates only
  // declare their loose furniture here.
  const fixtures: DrawFixture[] = []

  furniture.forEach((item, index) => {
    const spec = fixtureSpec(item.kind)
    fixtures.push({
      id: `tpl_furniture_${index}`,
      kind: item.kind,
      x: item.x - halfW,
      y: item.y - halfD,
      rotation: item.rotation ?? 0,
      width: item.width ?? spec.width,
      depth: item.depth ?? spec.depth,
    })
  })

  // Names carry i18n keys; the renderer translates them, so a plan loaded in
  // Thai and switched to English relabels itself.
  const roomLabels: DrawRoomLabel[] = labels.map((label, index) => ({
    id: `tpl_label_${index}`,
    x: label.x - halfW,
    y: label.y - halfD,
    name: label.nameKey,
  }))

  return { nodes, walls, openings: placed, fixtures, roomLabels }
}

/**
 * Small prefab / knock-down house footprints — the scale this tool is aimed
 * at, so a customer starts from something realistic and edits it rather than
 * drawing from nothing.
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    /**
     * A Nordic barn house: one steep gable running the length of the plan,
     * stopping dead at the wall face. The gable end is the front, which is
     * why the glazing goes there — it is the elevation the shape is for.
     */
    id: 'nordic-barn-7x9',
    nameKey: 'templates.nordicBarn',
    width: 7,
    depth: 9,
    expectedRooms: 4,
    expectedOpenings: 9,
    finish: HOUSE_STYLES[0].finish,
    build: () =>
      buildFromSpec({
        width: 7,
        depth: 9,
        partitions: [
          [0, 5.2, 7, 5.2], // living from the sleeping half
          [3, 5.2, 3, 9], // bedroom 1 from the bathroom
          [4.6, 5.2, 4.6, 9], // bathroom from bedroom 2
        ],
        openings: [
          { x: 3.5, y: 0, width: 0.9, kind: 'door' }, // entrance, in the gable end
          { x: 1.4, y: 0, width: 2, kind: 'window' }, // gable glazing
          { x: 0, y: 2.5, width: 1.5, kind: 'window' },
          { x: 7, y: 2.5, width: 1.5, kind: 'window' },
          { x: 1.5, y: 5.2, width: 0.8, kind: 'door' }, // bedroom 1
          { x: 5.8, y: 5.2, width: 0.8, kind: 'door' }, // bedroom 2
          { x: 3.8, y: 5.2, width: 0.7, kind: 'door' }, // bathroom
          { x: 1.5, y: 9, width: 1.2, kind: 'window' },
          { x: 5.8, y: 9, width: 1.2, kind: 'window' },
        ],
        furniture: [
          { kind: 'sofaL', x: 1.7, y: 1.3 },
          { kind: 'coffeeTable', x: 3.3, y: 1.6 },
          { kind: 'diningRound', x: 5.3, y: 1.4 },
          { kind: 'kitchen', x: 3.5, y: 4.6, width: 2.4, depth: 0.6, rotation: Math.PI },
          { kind: 'fridge', x: 5.3, y: 4.6, rotation: Math.PI },
          { kind: 'bedDouble', x: 1.5, y: 6.4 },
          { kind: 'nightstand', x: 0.4, y: 5.7 },
          { kind: 'wardrobe', x: 1.5, y: 8.6, rotation: Math.PI },
          { kind: 'toilet', x: 3.4, y: 5.7 },
          { kind: 'sink', x: 4.2, y: 5.6 },
          { kind: 'shower', x: 3.8, y: 8.3, rotation: Math.PI },
          { kind: 'bedDouble', x: 5.8, y: 6.4 },
          { kind: 'nightstand', x: 6.7, y: 5.7 },
          { kind: 'wardrobe', x: 5.8, y: 8.6, rotation: Math.PI },
        ],
        labels: [
          { x: 3.5, y: 2.6, nameKey: 'rooms.living' },
          { x: 1.5, y: 7.2, nameKey: 'rooms.bedroom1' },
          { x: 3.8, y: 7, nameKey: 'rooms.bathroom' },
          { x: 5.8, y: 7.2, nameKey: 'rooms.bedroom2' },
        ],
      }),
  },

  {
    /**
     * Traced from a 12 m modular cabin the owner asked to have on the site as
     * a sample: a covered porch at one end, open-plan living / dining /
     * kitchen, a bathroom on the back wall and a bedroom at the far end.
     *
     * The dimensions are MEASURED off the supplied floor plan rather than
     * guessed: its 12000 dimension line is 963 px, giving 12.46 mm/px, and
     * every wall, opening and piece below was read off at that scale. The
     * shell comes out 12.0 x 3.43 m, rounded to 3.4.
     */
    id: 'cabin-12x3-4',
    nameKey: 'templates.cabin12',
    width: 12,
    depth: 3.4,
    // Living (with the corridor it opens onto), bathroom, bedroom. The porch
    // is open-ended, so it is not a room.
    expectedRooms: 3,
    expectedOpenings: 9,
    // The cabin is charcoal cladding under a dark standing-seam roof; without
    // this the sample opens in the plaster-and-tile defaults and looks like a
    // different house.
    finish: {
      roof: 'gable',
      pitch: 'low',
      roofMaterial: 'metal',
      roofColor: '#2F3336',
      wall: 'fibre',
      wallColor: '#4D5154',
      frame: 'black',
    },
    build: () =>
      buildFromSpec({
        width: 12,
        depth: 3.4,
        openEnd: 'left',
        partitions: [
          [1.35, 0, 1.35, 3.4], // glass wall onto the porch
          [6.55, 0, 6.55, 1.72], // bathroom, back wall side
          [6.55, 1.72, 9, 1.72], // bathroom, corridor side
          [9, 0, 9, 3.4], // bedroom
        ],
        openings: [
          { x: 1.35, y: 1.9, width: 1.6, kind: 'door' }, // sliding door to the porch
          { x: 3.99, y: 0, width: 3.13, kind: 'window' }, // living glazing
          { x: 3.01, y: 3.4, width: 1.08, kind: 'window' }, // living, front
          { x: 6.51, y: 3.4, width: 0.98, kind: 'door' }, // entrance
          { x: 8, y: 0, width: 0.5, kind: 'window' }, // bathroom
          { x: 6.9, y: 1.72, width: 0.7, kind: 'door' }, // bathroom
          { x: 9, y: 2.9, width: 0.8, kind: 'door' }, // bedroom
          { x: 9.96, y: 3.4, width: 1.26, kind: 'window' }, // bedroom, front
          { x: 12, y: 1.7, width: 1.6, kind: 'window' }, // bedroom, end
        ],
        furniture: [
          // Porch
          { kind: 'chair', x: 0.7, y: 1, rotation: Math.PI / 2 },
          { kind: 'chair', x: 0.7, y: 2.4, rotation: Math.PI / 2 },
          // Living / dining
          { kind: 'sofaL', x: 2.55, y: 0.95, width: 2.2, depth: 1.7 },
          { kind: 'coffeeTable', x: 3.7, y: 1.6 },
          { kind: 'diningRound', x: 4.88, y: 1 },
          // Kitchen run against the bathroom wall, so it faces back up the room
          { kind: 'fridge', x: 6.2, y: 0.4, rotation: Math.PI / 2, width: 0.65, depth: 0.6 },
          { kind: 'kitchen', x: 6.2, y: 1.25, rotation: Math.PI / 2, width: 1, depth: 0.65 },
          // Bathroom
          { kind: 'toilet', x: 6.98, y: 0.45 },
          { kind: 'sink', x: 7.65, y: 0.35 },
          { kind: 'shower', x: 8.5, y: 0.52, rotation: Math.PI / 2 },
          // Corridor and bedroom
          { kind: 'wardrobe', x: 8.44, y: 2.02, width: 0.94, depth: 0.6 },
          { kind: 'wardrobe', x: 9.22, y: 0.75, rotation: Math.PI / 2, width: 1.3, depth: 0.44 },
          { kind: 'nightstand', x: 9.7, y: 0.35 },
          { kind: 'bedDouble', x: 10.72, y: 1.15 },
          { kind: 'nightstand', x: 11.74, y: 0.35 },
        ],
        labels: [
          { x: 0.7, y: 1.7, nameKey: 'rooms.porch' },
          { x: 3.2, y: 2.4, nameKey: 'rooms.living' },
          { x: 7.8, y: 0.9, nameKey: 'rooms.bathroom' },
          { x: 10.7, y: 2.7, nameKey: 'rooms.bedroom' },
        ],
      }),
  },

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
        furniture: [
          { kind: 'bedDouble', x: 1.2, y: 2.9 },
          { kind: 'sofa', x: 2.6, y: 0.6 },
          { kind: 'kitchen', x: 3.0, y: 3.7 },
          { kind: 'toilet', x: 5.2, y: 1.4 },
          { kind: 'sink', x: 5.6, y: 0.4 },
        ],
        labels: [
          { x: 2.2, y: 2.0, nameKey: 'rooms.studio' },
          { x: 5.2, y: 1.0, nameKey: 'rooms.bathroom' },
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
        furniture: [
          { kind: 'bedDouble', x: 1.6, y: 4.8 },
          { kind: 'sofa', x: 4.2, y: 0.7 },
          { kind: 'table', x: 4.2, y: 2.6 },
          { kind: 'toilet', x: 0.5, y: 2.9 },
          { kind: 'sink', x: 0.5, y: 0.5 },
        ],
        labels: [
          { x: 3.0, y: 4.8, nameKey: 'rooms.bedroom' },
          { x: 4.0, y: 1.75, nameKey: 'rooms.living' },
          { x: 1.0, y: 1.75, nameKey: 'rooms.bathroom' },
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
        furniture: [
          { kind: 'bedDouble', x: 1.4, y: 4.8 },
          { kind: 'bedSingle', x: 5.2, y: 4.8 },
          { kind: 'sofa', x: 2.4, y: 0.7 },
          { kind: 'table', x: 2.4, y: 2.4 },
          { kind: 'kitchen', x: 4.6, y: 0.5 },
          { kind: 'toilet', x: 7.2, y: 1.3 },
          { kind: 'sink', x: 6.6, y: 0.4 },
        ],
        labels: [
          { x: 2.0, y: 4.8, nameKey: 'rooms.bedroom1' },
          { x: 6.0, y: 4.8, nameKey: 'rooms.bedroom2' },
          { x: 3.0, y: 1.6, nameKey: 'rooms.living' },
          { x: 7.0, y: 0.9, nameKey: 'rooms.bathroom' },
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
        furniture: [
          { kind: 'table', x: 1.5, y: 2.0 },
          { kind: 'table', x: 4.5, y: 2.0 },
          { kind: 'kitchen', x: 2.0, y: 6.7 },
          { kind: 'toilet', x: 5.2, y: 7.2 },
          { kind: 'sink', x: 4.4, y: 7.6 },
        ],
        labels: [
          { x: 3.0, y: 3.0, nameKey: 'rooms.shopfront' },
          { x: 2.0, y: 7.0, nameKey: 'rooms.store' },
          { x: 5.0, y: 7.0, nameKey: 'rooms.bathroom' },
        ],
      }),
  },
  {
    id: 'tiny-4x4',
    nameKey: 'templates.tiny',
    width: 4,
    depth: 4,
    // A single living space with a bathroom boxed into the back-right corner.
    expectedRooms: 2,
    expectedOpenings: 4,
    build: () =>
      buildFromSpec({
        width: 4,
        depth: 4,
        partitions: [
          [2.5, 4, 2.5, 2.5],
          [2.5, 2.5, 4, 2.5],
        ],
        openings: [
          { x: 1, y: 0, width: 0.9, kind: 'door' }, // entrance
          { x: 2.5, y: 3.2, width: 0.8, kind: 'door' }, // bathroom
          { x: 1.5, y: 4, width: 1, kind: 'window' },
          { x: 0, y: 2, width: 1, kind: 'window' },
        ],
        furniture: [
          { kind: 'bedSingle', x: 0.9, y: 2.6 },
          { kind: 'kitchen', x: 1.8, y: 0.6 },
          { kind: 'toilet', x: 3.5, y: 3.4 },
          { kind: 'sink', x: 2.9, y: 3.6 },
        ],
        labels: [
          { x: 1.2, y: 1.4, nameKey: 'rooms.studio' },
          { x: 3.2, y: 3.2, nameKey: 'rooms.bathroom' },
        ],
      }),
  },
  {
    id: 'three-bed-9x6',
    nameKey: 'templates.threeBed',
    width: 9,
    depth: 6,
    // Three bedrooms along the back, living + bathroom across the front.
    expectedRooms: 5,
    expectedOpenings: 9,
    build: () =>
      buildFromSpec({
        width: 9,
        depth: 6,
        partitions: [
          [0, 3.5, 9, 3.5],
          [3, 3.5, 3, 6],
          [6, 3.5, 6, 6],
          [7, 0, 7, 1.8],
          [7, 1.8, 9, 1.8],
        ],
        openings: [
          { x: 2, y: 0, width: 0.9, kind: 'door' }, // entrance
          { x: 1.5, y: 3.5, width: 0.8, kind: 'door' }, // bedroom 1
          { x: 4.5, y: 3.5, width: 0.8, kind: 'door' }, // bedroom 2
          { x: 7.5, y: 3.5, width: 0.8, kind: 'door' }, // bedroom 3
          { x: 7, y: 0.9, width: 0.8, kind: 'door' }, // bathroom
          { x: 1.5, y: 6, width: 1, kind: 'window' },
          { x: 4.5, y: 6, width: 1, kind: 'window' },
          { x: 7.5, y: 6, width: 1, kind: 'window' },
          { x: 0, y: 1.75, width: 1.5, kind: 'window' },
        ],
        furniture: [
          { kind: 'bedDouble', x: 1.4, y: 4.8 },
          { kind: 'bedSingle', x: 4.4, y: 4.8 },
          { kind: 'bedSingle', x: 7.6, y: 4.8 },
          { kind: 'sofa', x: 2.4, y: 0.7 },
          { kind: 'table', x: 4.6, y: 1.4 },
          { kind: 'kitchen', x: 1.5, y: 2.9 },
          { kind: 'toilet', x: 8.2, y: 1.3 },
          { kind: 'sink', x: 7.5, y: 0.5 },
        ],
        labels: [
          { x: 1.5, y: 4.8, nameKey: 'rooms.bedroom1' },
          { x: 4.5, y: 4.8, nameKey: 'rooms.bedroom2' },
          { x: 7.5, y: 4.8, nameKey: 'rooms.bedroom3' },
          { x: 3.5, y: 1.6, nameKey: 'rooms.living' },
          { x: 8.0, y: 0.9, nameKey: 'rooms.bathroom' },
        ],
      }),
  },
]
