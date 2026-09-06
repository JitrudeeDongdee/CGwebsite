export const ROOF_SHAPES = ['gable', 'hip', 'shed', 'flat'] as const
export type RoofShape = (typeof ROOF_SHAPES)[number]

/** Overhang past the walls, and rise of the ridge above the eaves, in metres. */
export const ROOF_OVERHANG = 0.4
export const ROOF_RISE = 1.2

export interface RoofBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/** A triangulated roof surface, ready to hand to a BufferGeometry. */
export interface RoofMesh {
  /** Flat list of triangle vertices: x, y, z, x, y, z, … */
  positions: number[]
}

function triangle(
  positions: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): void {
  positions.push(...a, ...b, ...c)
}

function quad(
  positions: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
): void {
  triangle(positions, a, b, c)
  triangle(positions, a, c, d)
}

/**
 * Builds the roof over the building's bounding box.
 *
 * Roofing an arbitrary footprint exactly is a much bigger problem, and the
 * brief asks for simple readable massing rather than a faithful model — so
 * the roof spans the overall extent with an overhang, which is right for the
 * simple rectangular prefab footprints this tool targets.
 */
export function buildRoof(bounds: RoofBounds, shape: RoofShape, eaves: number): RoofMesh {
  const minX = bounds.minX - ROOF_OVERHANG
  const maxX = bounds.maxX + ROOF_OVERHANG
  const minZ = bounds.minZ - ROOF_OVERHANG
  const maxZ = bounds.maxZ + ROOF_OVERHANG

  const positions: number[] = []
  const width = maxX - minX
  const depth = maxZ - minZ

  if (shape === 'flat') {
    quad(
      positions,
      [minX, eaves, minZ],
      [maxX, eaves, minZ],
      [maxX, eaves, maxZ],
      [minX, eaves, maxZ],
    )
    return { positions }
  }

  if (shape === 'shed') {
    // Single plane, rising towards +Z.
    quad(
      positions,
      [minX, eaves, minZ],
      [maxX, eaves, minZ],
      [maxX, eaves + ROOF_RISE, maxZ],
      [minX, eaves + ROOF_RISE, maxZ],
    )
    return { positions }
  }

  // Gable and hip both run their ridge along the longer side, so the slopes
  // fall down the shorter span — the usual way a simple roof is set out.
  const ridgeAlongX = width >= depth
  const ridgeY = eaves + ROOF_RISE

  if (shape === 'gable') {
    if (ridgeAlongX) {
      const midZ = (minZ + maxZ) / 2
      quad(
        positions,
        [minX, eaves, minZ],
        [maxX, eaves, minZ],
        [maxX, ridgeY, midZ],
        [minX, ridgeY, midZ],
      )
      quad(
        positions,
        [minX, ridgeY, midZ],
        [maxX, ridgeY, midZ],
        [maxX, eaves, maxZ],
        [minX, eaves, maxZ],
      )
      // Triangular gable ends close the roof off.
      triangle(positions, [minX, eaves, minZ], [minX, ridgeY, midZ], [minX, eaves, maxZ])
      triangle(positions, [maxX, eaves, minZ], [maxX, eaves, maxZ], [maxX, ridgeY, midZ])
    } else {
      const midX = (minX + maxX) / 2
      quad(
        positions,
        [minX, eaves, minZ],
        [midX, ridgeY, minZ],
        [midX, ridgeY, maxZ],
        [minX, eaves, maxZ],
      )
      quad(
        positions,
        [midX, ridgeY, minZ],
        [maxX, eaves, minZ],
        [maxX, eaves, maxZ],
        [midX, ridgeY, maxZ],
      )
      triangle(positions, [minX, eaves, minZ], [maxX, eaves, minZ], [midX, ridgeY, minZ])
      triangle(positions, [minX, eaves, maxZ], [midX, ridgeY, maxZ], [maxX, eaves, maxZ])
    }
    return { positions }
  }

  // Hip: the ridge is pulled in from both ends, so all four sides slope.
  const midX = (minX + maxX) / 2
  const midZ = (minZ + maxZ) / 2
  const inset = Math.min(width, depth) / 2

  if (ridgeAlongX) {
    const ridgeStartX = minX + inset
    const ridgeEndX = maxX - inset

    quad(
      positions,
      [minX, eaves, minZ],
      [maxX, eaves, minZ],
      [ridgeEndX, ridgeY, midZ],
      [ridgeStartX, ridgeY, midZ],
    )
    quad(
      positions,
      [ridgeStartX, ridgeY, midZ],
      [ridgeEndX, ridgeY, midZ],
      [maxX, eaves, maxZ],
      [minX, eaves, maxZ],
    )
    // Hipped ends.
    triangle(positions, [minX, eaves, minZ], [ridgeStartX, ridgeY, midZ], [minX, eaves, maxZ])
    triangle(positions, [maxX, eaves, minZ], [maxX, eaves, maxZ], [ridgeEndX, ridgeY, midZ])
  } else {
    const ridgeStartZ = minZ + inset
    const ridgeEndZ = maxZ - inset

    quad(
      positions,
      [minX, eaves, minZ],
      [maxX, eaves, minZ],
      [midX, ridgeY, ridgeStartZ],
      [midX, ridgeY, ridgeStartZ],
    )
    quad(
      positions,
      [minX, eaves, minZ],
      [midX, ridgeY, ridgeStartZ],
      [midX, ridgeY, ridgeEndZ],
      [minX, eaves, maxZ],
    )
    quad(
      positions,
      [maxX, eaves, minZ],
      [maxX, eaves, maxZ],
      [midX, ridgeY, ridgeEndZ],
      [midX, ridgeY, ridgeStartZ],
    )
    triangle(positions, [minX, eaves, minZ], [maxX, eaves, minZ], [midX, ridgeY, ridgeStartZ])
    triangle(positions, [minX, eaves, maxZ], [midX, ridgeY, ridgeEndZ], [maxX, eaves, maxZ])
  }

  return { positions }
}
