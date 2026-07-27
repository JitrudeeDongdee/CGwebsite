import type { DrawingState, OpeningKind } from './types'
import { distance } from './geometry'
import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './wallOutline'

/** Storey and opening heights in metres, typical for a single-storey house. */
export const WALL_HEIGHT = 2.7
export const DOOR_HEIGHT = 2.0
export const WINDOW_SILL = 0.9
export const WINDOW_HEIGHT = 1.2

/** A box of wall, positioned in world space. */
export interface WallBox {
  id: string
  /** Centre of the box. `y` is height above the floor. */
  x: number
  y: number
  z: number
  length: number
  height: number
  thickness: number
  /** Rotation about the vertical axis. */
  angle: number
}

export interface OpeningPanel extends WallBox {
  kind: OpeningKind
}

export interface Building3D {
  /** Solid masonry: full-height stretches, plus sills and headers. */
  walls: WallBox[]
  /** Door leaves and window glazing filling the holes. */
  panels: OpeningPanel[]
  /** Footprint of the exterior walls, for the roof and the floor slab. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null
}

interface Span {
  from: number
  to: number
  bottom: number
  top: number
}

/**
 * Turns the 2D plan into the boxes a simple 3D massing needs.
 *
 * Openings are cut by *splitting* each wall along its length rather than by
 * boolean subtraction: the stretches between openings run full height, and
 * each opening contributes a header above it (and a sill below, for a
 * window). That gives real holes with no CSG dependency, and every piece
 * stays an axis-aligned box.
 */
export function buildBuilding3D(
  state: DrawingState,
  exteriorWallIds: ReadonlySet<string>,
): Building3D {
  const walls: WallBox[] = []
  const panels: OpeningPanel[] = []

  for (const wall of state.walls) {
    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    if (!a || !b) continue

    const length = distance(a, b)
    if (length === 0) continue

    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    const thickness =
      wall.thickness ??
      (exteriorWallIds.has(wall.id) ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS)

    const dirX = (b.x - a.x) / length
    const dirZ = (b.y - a.y) / length

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
      }
    }

    const push = (id: string, span: Span) => {
      const box = boxFor(id, span)
      if (box) walls.push(box)
    }

    const openings = state.openings
      .filter((opening) => opening.wallId === wall.id)
      .map((opening) => ({
        ...opening,
        start: Math.max(0, opening.offset - opening.width / 2),
        end: Math.min(length, opening.offset + opening.width / 2),
      }))
      .sort((one, two) => one.start - two.start)

    let cursor = 0

    for (const opening of openings) {
      if (opening.start > cursor) {
        push(`${wall.id}-solid-${cursor}`, {
          from: cursor,
          to: opening.start,
          bottom: 0,
          top: WALL_HEIGHT,
        })
      }

      const head = opening.kind === 'door' ? DOOR_HEIGHT : WINDOW_SILL + WINDOW_HEIGHT

      // Header over the hole.
      push(`${wall.id}-head-${opening.id}`, {
        from: opening.start,
        to: opening.end,
        bottom: head,
        top: WALL_HEIGHT,
      })

      // Wall under a window; a door goes to the floor.
      if (opening.kind === 'window') {
        push(`${wall.id}-sill-${opening.id}`, {
          from: opening.start,
          to: opening.end,
          bottom: 0,
          top: WINDOW_SILL,
        })
      }

      const panelSpan: Span =
        opening.kind === 'door'
          ? { from: opening.start, to: opening.end, bottom: 0, top: DOOR_HEIGHT }
          : {
              from: opening.start,
              to: opening.end,
              bottom: WINDOW_SILL,
              top: WINDOW_SILL + WINDOW_HEIGHT,
            }

      const panel = boxFor(`${wall.id}-panel-${opening.id}`, panelSpan)
      if (panel) {
        // Thinner than the wall so the reveal still reads as a hole.
        panels.push({ ...panel, thickness: thickness * 0.35, kind: opening.kind })
      }

      cursor = Math.max(cursor, opening.end)
    }

    if (cursor < length) {
      push(`${wall.id}-solid-end`, { from: cursor, to: length, bottom: 0, top: WALL_HEIGHT })
    }
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

  return { walls, panels, bounds }
}
