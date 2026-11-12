import type { DrawingState, OpeningKind } from './types'
import { distance } from './geometry'
import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './wallOutline'

/** Storey and opening heights in metres, typical for a house built here. */
export const WALL_HEIGHT = 2.7
/** Floor structure between two storeys — and the band that shows outside. */
export const SLAB_THICKNESS = 0.25
/** Floor to floor. */
export const LEVEL_HEIGHT = WALL_HEIGHT + SLAB_THICKNESS
export const DOOR_HEIGHT = 2.0
export const WINDOW_SILL = 0.9
export const WINDOW_HEIGHT = 1.2
/** Plinth at the foot of the exterior walls: the edge of the floor slab. */
export const PLINTH_HEIGHT = 0.3

/** A box of wall, positioned in world space. */
export interface WallBox {
  id: string
  /** Centre of the box. `y` is height above the ground. */
  x: number
  y: number
  z: number
  length: number
  height: number
  thickness: number
  /** Rotation about the vertical axis. */
  angle: number
  /**
   * Unit vector pointing OUT of the building, in plan. What a cutaway needs
   * to know: a wall whose outward face is turned towards the camera is the
   * one standing between the camera and the room.
   */
  outward?: { x: number; z: number }
  /** Interior walls stay up in a cutaway; only the shell is taken away. */
  exterior?: boolean
}

/**
 * A hole in a wall, with everything needed to build a real window or door
 * into it — frame, glazing, leaf. The scene composes those; the geometry
 * here only says where the hole is and how deep the wall around it is.
 */
export interface OpeningUnit {
  id: string
  kind: OpeningKind
  /** Centre of the hole. */
  x: number
  y: number
  z: number
  angle: number
  width: number
  height: number
  wallThickness: number
  outward?: { x: number; z: number }
  exterior?: boolean
}

export interface Building3D {
  /** Solid masonry: full-height stretches, plus sills and headers. */
  walls: WallBox[]
  /** Window and door units filling the holes. */
  openings: OpeningUnit[]
  /** Plinth and the floor band between storeys — painted trim, not masonry. */
  trim: WallBox[]
  /** Free-standing columns the customer placed, e.g. carport posts. */
  columns: WallBox[]
  /** Footprint of the exterior walls, for the roof and the floor slab. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null
  /** Top of the topmost wall — where the roof sits. */
  eaves: number
}

export interface Building3DShape {
  /** 1 or 2. A second storey repeats the same plan above the first. */
  storeys: number
}

interface Span {
  from: number
  to: number
  bottom: number
  top: number
}

/**
 * Turns the 2D plan into the boxes a 3D view needs.
 *
 * Openings are cut by *splitting* each wall along its length rather than by
 * boolean subtraction: the stretches between openings run full height, and
 * each opening contributes a header above it (and a sill below, for a
 * window). That gives real holes with no CSG dependency, and every piece
 * stays an axis-aligned box.
 *
 * A second storey repeats the same walls and openings one floor up. There is
 * only one plan to work from, so an upper floor can only be the same plan —
 * the UI says so rather than pretending otherwise.
 */
export function buildBuilding3D(
  state: DrawingState,
  exteriorWallIds: ReadonlySet<string>,
  shape: Building3DShape = { storeys: 1 },
): Building3D {
  const storeys = Math.max(1, Math.round(shape.storeys))
  const walls: WallBox[] = []
  const openings: OpeningUnit[] = []
  const trim: WallBox[] = []
  const columns: WallBox[] = []
  const eaves = (storeys - 1) * LEVEL_HEIGHT + WALL_HEIGHT

  // Which way is "out" is decided against the middle of the plan.
  const nodeList = Object.values(state.nodes)
  const centre = nodeList.length
    ? {
        x: nodeList.reduce((sum, n) => sum + n.x, 0) / nodeList.length,
        z: nodeList.reduce((sum, n) => sum + n.y, 0) / nodeList.length,
      }
    : { x: 0, z: 0 }

  for (const wall of state.walls) {
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (!a || !b) continue

    const length = distance(a, b)
    if (length === 0) continue

    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    const exterior = exteriorWallIds.has(wall.id)
    const thickness =
      wall.thickness ?? (exterior ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS)

    const dirX = (b.x - a.x) / length
    const dirZ = (b.y - a.y) / length
    const midX = (a.x + b.x) / 2
    const midZ = (a.y + b.y) / 2

    // Perpendicular to the wall, flipped to point away from the centre.
    const away = (midX - centre.x) * dirZ - (midZ - centre.z) * dirX
    const sign = away >= 0 ? 1 : -1
    const outward = { x: dirZ * sign, z: -dirX * sign }

    /** Places a span of this wall as a box in world space. */
    const boxFor = (id: string, span: Span): WallBox | null => {
      const spanLength = span.to - span.from
      const spanHeight = span.top - span.bottom
      if (spanLength <= 1e-6 || spanHeight <= 1e-6) return null

      const centreAlong = (span.from + span.to) / 2
      return {
        id,
        x: a.x + dirX * centreAlong,
        y: (span.bottom + span.top) / 2,
        z: a.y + dirZ * centreAlong,
        length: spanLength,
        height: spanHeight,
        thickness,
        angle,
        outward,
        exterior,
      }
    }

    const wallOpenings = state.openings
      .filter((opening) => opening.wallId === wall.id)
      .map((opening) => ({
        ...opening,
        start: Math.max(0, opening.offset - opening.width / 2),
        end: Math.min(length, opening.offset + opening.width / 2),
      }))
      .sort((one, two) => one.start - two.start)

    for (let level = 0; level < storeys; level++) {
      const base = level * LEVEL_HEIGHT
      const top = base + WALL_HEIGHT

      const push = (id: string, span: Span) => {
        const box = boxFor(`${id}-L${level}`, span)
        if (box) walls.push(box)
      }

      let cursor = 0

      for (const opening of wallOpenings) {
        if (opening.start > cursor) {
          push(`${wall.id}-solid-${cursor}`, {
            from: cursor,
            to: opening.start,
            bottom: base,
            top,
          })
        }

        const head = base + (opening.kind === 'door' ? DOOR_HEIGHT : WINDOW_SILL + WINDOW_HEIGHT)

        // Header over the hole.
        push(`${wall.id}-head-${opening.id}`, {
          from: opening.start,
          to: opening.end,
          bottom: head,
          top,
        })

        // Wall under a window; a door goes to the floor. On an upper storey a
        // door opens onto a balcony, so it keeps its full height.
        if (opening.kind === 'window') {
          push(`${wall.id}-sill-${opening.id}`, {
            from: opening.start,
            to: opening.end,
            bottom: base,
            top: base + WINDOW_SILL,
          })
        }

        const holeSpan: Span =
          opening.kind === 'door'
            ? { from: opening.start, to: opening.end, bottom: base, top: base + DOOR_HEIGHT }
            : {
                from: opening.start,
                to: opening.end,
                bottom: base + WINDOW_SILL,
                top: base + WINDOW_SILL + WINDOW_HEIGHT,
              }

        const hole = boxFor(`${wall.id}-unit-${opening.id}-L${level}`, holeSpan)
        if (hole) {
          openings.push({
            id: hole.id,
            kind: opening.kind,
            x: hole.x,
            y: hole.y,
            z: hole.z,
            angle,
            width: hole.length,
            height: hole.height,
            wallThickness: thickness,
            outward,
            exterior,
          })
        }

        cursor = Math.max(cursor, opening.end)
      }

      if (cursor < length) {
        push(`${wall.id}-solid-end`, { from: cursor, to: length, bottom: base, top })
      }

      // The floor band between storeys both fills the structural gap above
      // this wall and is what makes a two-storey house read as two storeys.
      if (level < storeys - 1) {
        trim.push({
          id: `${wall.id}-band-L${level}`,
          x: midX,
          y: top + SLAB_THICKNESS / 2,
          z: midZ,
          length,
          height: SLAB_THICKNESS,
          thickness: thickness + (exterior ? 0.08 : 0),
          angle,
          outward,
          exterior,
        })
      }
    }

    // Edge of the floor slab, standing slightly proud of the wall above it.
    if (exterior) {
      trim.push({
        id: `${wall.id}-plinth`,
        x: midX,
        y: PLINTH_HEIGHT / 2,
        z: midZ,
        length,
        height: PLINTH_HEIGHT,
        thickness: thickness + 0.1,
        angle,
        // The plinth stays: it is the floor edge, not the wall, and keeping
        // it draws the outline of the room the wall was taken from.
        exterior: false,
      })
    }
  }

  // Columns the customer placed themselves stand free — a carport post, a
  // porch post. The ones synced to wall junctions are buried inside the wall
  // they belong to, so drawing them would only cost z-fighting.
  for (const fixture of state.fixtures) {
    if (fixture.kind !== 'column' || fixture.nodeId) continue
    columns.push({
      id: `column-${fixture.id}`,
      x: fixture.x,
      y: eaves / 2,
      z: fixture.y,
      length: Math.max(0.05, fixture.width),
      height: eaves,
      thickness: Math.max(0.05, fixture.depth),
      angle: fixture.rotation,
    })
  }

  // The roof spans the shell, so only exterior corners define its extent.
  const exteriorNodeIds = new Set<string>()
  for (const wall of state.walls) {
    if (!exteriorWallIds.has(wall.id)) continue
    exteriorNodeIds.add(wall.a)
    exteriorNodeIds.add(wall.b)
  }

  const corners = [...exteriorNodeIds]
    .map((id) => state.nodes[id])
    .filter((node): node is NonNullable<typeof node> => node !== undefined)

  const bounds =
    corners.length > 0
      ? {
          minX: Math.min(...corners.map((n) => n.x)),
          maxX: Math.max(...corners.map((n) => n.x)),
          minZ: Math.min(...corners.map((n) => n.y)),
          maxZ: Math.max(...corners.map((n) => n.y)),
        }
      : null

  return { walls, openings, trim, columns, bounds, eaves }
}
