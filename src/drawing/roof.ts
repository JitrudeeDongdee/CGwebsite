export const ROOF_SHAPES = ['gable', 'hip', 'shed', 'flat'] as const
export type RoofShape = (typeof ROOF_SHAPES)[number]

/** Overhang past the walls, and the default rise of the ridge, in metres. */
export const ROOF_OVERHANG = 0.4
export const ROOF_RISE = 1.3

/** Depth of the fascia / barge board that trims every roof edge. */
export const FASCIA_DEPTH = 0.2

export const ROOF_PITCHES = ['low', 'medium', 'steep'] as const
export type RoofPitch = (typeof ROOF_PITCHES)[number]

/** Rise of the ridge above the eaves, per pitch. */
export const PITCH_RISE: Record<RoofPitch, number> = {
  low: 0.7,
  medium: ROOF_RISE,
  steep: 2.3,
}

export interface RoofBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface RoofOptions {
  /** Height of the wall top the roof sits on. */
  eaves: number
  rise?: number
  overhang?: number
}

/** A triangulated roof, ready to hand to BufferGeometries. */
export interface RoofMesh {
  /** The roofing surface: flat triangle list, x, y, z, … */
  positions: number[]
  /** Matching UVs, in metres, with V running DOWN THE SLOPE (see below). */
  uvs: number[]
  /** Fascia and barge boards: a band hanging from every open roof edge. */
  fascia: number[]
  fasciaUvs: number[]
  /**
   * The triangle of wall that closes a gable or shed end. Not roofing — it
   * takes the wall finish, which is what it is built of in real life.
   */
  gables: number[]
  gableUvs: number[]
  /** Highest point of the roof, for framing the camera. */
  apex: number
}

type V3 = [number, number, number]
type UV = (p: V3) => [number, number]

function emitPolygon(positions: number[], uvs: number[], poly: V3[], uv: UV): void {
  // Fan from the first vertex: every polygon here is convex.
  for (let i = 1; i < poly.length - 1; i++) {
    for (const p of [poly[0], poly[i], poly[i + 1]]) {
      positions.push(p[0], p[1], p[2])
      const [u, v] = uv(p)
      uvs.push(u, v)
    }
  }
}

/**
 * Hangs a vertical band below an edge — a fascia along an eave, a barge board
 * along a rake. Without it the roof reads as a sheet of paper from below,
 * which is the single most model-like thing about an untrimmed massing.
 */
function emitBand(positions: number[], uvs: number[], a: V3, b: V3, depth: number): void {
  const run = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const low: V3 = [a[0], a[1] - depth, a[2]]
  const lowB: V3 = [b[0], b[1] - depth, b[2]]

  const quad: [V3, number, number][] = [
    [a, 0, depth],
    [b, run, depth],
    [lowB, run, 0],
    [low, 0, 0],
  ]

  for (const i of [0, 1, 2, 0, 2, 3]) {
    const [p, u, v] = quad[i]
    positions.push(p[0], p[1], p[2])
    uvs.push(u, v)
  }
}

/**
 * Builds the roof over the building's bounding box.
 *
 * Roofing an arbitrary footprint exactly is a much bigger problem, and these
 * are simple rectangular prefab footprints — so the roof spans the overall
 * extent with an overhang, and the gable ends are closed with wall.
 *
 * UVs are planar, in metres, and always put V down the slope: that way one
 * drawing of corrugated sheet has its ribs running the right way whichever
 * side the ridge ended up on.
 */
export function buildRoof(bounds: RoofBounds, shape: RoofShape, options: RoofOptions): RoofMesh {
  const { eaves } = options
  const rise = options.rise ?? ROOF_RISE
  const overhang = options.overhang ?? ROOF_OVERHANG

  const minX = bounds.minX - overhang
  const maxX = bounds.maxX + overhang
  const minZ = bounds.minZ - overhang
  const maxZ = bounds.maxZ + overhang

  const positions: number[] = []
  const uvs: number[] = []
  const fascia: number[] = []
  const fasciaUvs: number[] = []
  const gables: number[] = []
  const gableUvs: number[] = []

  const width = maxX - minX
  const depth = maxZ - minZ
  /** The slopes fall down the shorter span, as a simple roof is set out. */
  const ridgeAlongX = width >= depth

  // V down the slope: for a ridge along X the slope runs in Z, and vice versa.
  const uv: UV = ridgeAlongX ? (p) => [p[0], p[2]] : (p) => [p[2], p[0]]

  const band = (a: V3, b: V3) => emitBand(fascia, fasciaUvs, a, b, FASCIA_DEPTH)

  /** A piece of wall closing the gap between the wall top and the roof. */
  const closeWall = (poly: V3[], along: 'x' | 'z') =>
    emitPolygon(gables, gableUvs, poly, along === 'x' ? (p) => [p[0], p[1]] : (p) => [p[2], p[1]])

  if (shape === 'flat') {
    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaves, minZ],
        [maxX, eaves, minZ],
        [maxX, eaves, maxZ],
        [minX, eaves, maxZ],
      ],
      uv,
    )
    band([minX, eaves, minZ], [maxX, eaves, minZ])
    band([maxX, eaves, minZ], [maxX, eaves, maxZ])
    band([maxX, eaves, maxZ], [minX, eaves, maxZ])
    band([minX, eaves, maxZ], [minX, eaves, minZ])
    return { positions, uvs, fascia, fasciaUvs, gables, gableUvs, apex: eaves }
  }

  // Half the span BETWEEN THE WALLS, not of the roof: the slope is set so the
  // roof passes exactly through the top of the wall, and the overhang then
  // hangs below that — which is where a rafter actually sits. Measuring from
  // the overhang edge instead leaves the roof a few centimetres clear of the
  // wall all the way round, and you can see daylight through the slot.
  const halfWallX = (bounds.maxX - bounds.minX) / 2
  const halfWallZ = (bounds.maxZ - bounds.minZ) / 2
  const ridgeY = eaves + rise

  if (shape === 'shed') {
    // One plane, rising towards +Z.
    const run = bounds.maxZ - bounds.minZ
    const slope = run > 0 ? rise / run : 0
    const lowY = eaves - overhang * slope
    const highY = eaves + rise + overhang * slope
    const heightAt = (z: number) => eaves + slope * (z - bounds.minZ)

    emitPolygon(
      positions,
      uvs,
      [
        [minX, lowY, minZ],
        [maxX, lowY, minZ],
        [maxX, highY, maxZ],
        [minX, highY, maxZ],
      ],
      (p) => [p[0], p[2]],
    )

    band([minX, lowY, minZ], [maxX, lowY, minZ])
    band([maxX, lowY, minZ], [maxX, highY, maxZ])
    band([maxX, highY, maxZ], [minX, highY, maxZ])
    band([minX, highY, maxZ], [minX, lowY, minZ])

    // The two side walls run up under the slope...
    for (const x of [bounds.minX, bounds.maxX]) {
      closeWall(
        [
          [x, eaves, bounds.minZ],
          [x, heightAt(bounds.minZ), bounds.minZ],
          [x, heightAt(bounds.maxZ), bounds.maxZ],
          [x, eaves, bounds.maxZ],
        ],
        'z',
      )
    }

    // ...and the high end is a full storey of wall in its own right. Leaving
    // it out is not a small gap: it is the whole top of that elevation open.
    closeWall(
      [
        [bounds.minX, eaves, bounds.maxZ],
        [bounds.minX, heightAt(bounds.maxZ), bounds.maxZ],
        [bounds.maxX, heightAt(bounds.maxZ), bounds.maxZ],
        [bounds.maxX, eaves, bounds.maxZ],
      ],
      'x',
    )

    return { positions, uvs, fascia, fasciaUvs, gables, gableUvs, apex: eaves + rise }
  }

  const midX = (minX + maxX) / 2
  const midZ = (minZ + maxZ) / 2

  if (shape === 'gable') {
    if (ridgeAlongX) {
      const slope = halfWallZ > 0 ? rise / halfWallZ : 0
      const eaveY = eaves - overhang * slope
      const heightAt = (z: number) => ridgeY - slope * Math.abs(z - midZ)

      emitPolygon(
        positions,
        uvs,
        [
          [minX, eaveY, minZ],
          [maxX, eaveY, minZ],
          [maxX, ridgeY, midZ],
          [minX, ridgeY, midZ],
        ],
        uv,
      )
      emitPolygon(
        positions,
        uvs,
        [
          [minX, ridgeY, midZ],
          [maxX, ridgeY, midZ],
          [maxX, eaveY, maxZ],
          [minX, eaveY, maxZ],
        ],
        uv,
      )

      // Eaves along the two long sides, barge boards up the rakes.
      band([minX, eaveY, minZ], [maxX, eaveY, minZ])
      band([maxX, eaveY, maxZ], [minX, eaveY, maxZ])
      for (const x of [minX, maxX]) {
        band([x, eaveY, minZ], [x, ridgeY, midZ])
        band([x, ridgeY, midZ], [x, eaveY, maxZ])
      }

      // Gable wall, on the wall line rather than out at the overhang.
      for (const x of [bounds.minX, bounds.maxX]) {
        closeWall(
          [
            [x, eaves, bounds.minZ],
            [x, heightAt(bounds.minZ), bounds.minZ],
            [x, ridgeY, midZ],
            [x, heightAt(bounds.maxZ), bounds.maxZ],
            [x, eaves, bounds.maxZ],
          ],
          'z',
        )
      }
    } else {
      const slope = halfWallX > 0 ? rise / halfWallX : 0
      const eaveY = eaves - overhang * slope
      const heightAt = (x: number) => ridgeY - slope * Math.abs(x - midX)

      emitPolygon(
        positions,
        uvs,
        [
          [minX, eaveY, minZ],
          [midX, ridgeY, minZ],
          [midX, ridgeY, maxZ],
          [minX, eaveY, maxZ],
        ],
        uv,
      )
      emitPolygon(
        positions,
        uvs,
        [
          [midX, ridgeY, minZ],
          [maxX, eaveY, minZ],
          [maxX, eaveY, maxZ],
          [midX, ridgeY, maxZ],
        ],
        uv,
      )

      band([minX, eaveY, minZ], [minX, eaveY, maxZ])
      band([maxX, eaveY, maxZ], [maxX, eaveY, minZ])
      for (const z of [minZ, maxZ]) {
        band([minX, eaveY, z], [midX, ridgeY, z])
        band([midX, ridgeY, z], [maxX, eaveY, z])
      }

      for (const z of [bounds.minZ, bounds.maxZ]) {
        closeWall(
          [
            [bounds.minX, eaves, z],
            [bounds.minX, heightAt(bounds.minX), z],
            [midX, ridgeY, z],
            [bounds.maxX, heightAt(bounds.maxX), z],
            [bounds.maxX, eaves, z],
          ],
          'x',
        )
      }
    }

    return { positions, uvs, fascia, fasciaUvs, gables, gableUvs, apex: ridgeY }
  }

  // Hip: the ridge is pulled in from both ends, so all four sides slope and
  // there is no gable wall to close.
  const inset = Math.min(width, depth) / 2
  const hipSlope = ridgeAlongX
    ? halfWallZ > 0
      ? rise / halfWallZ
      : 0
    : halfWallX > 0
      ? rise / halfWallX
      : 0
  const eaveY = eaves - overhang * hipSlope

  if (ridgeAlongX) {
    const ridgeStartX = minX + inset
    const ridgeEndX = maxX - inset

    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaveY, minZ],
        [maxX, eaveY, minZ],
        [ridgeEndX, ridgeY, midZ],
        [ridgeStartX, ridgeY, midZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [ridgeStartX, ridgeY, midZ],
        [ridgeEndX, ridgeY, midZ],
        [maxX, eaveY, maxZ],
        [minX, eaveY, maxZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaveY, minZ],
        [ridgeStartX, ridgeY, midZ],
        [minX, eaveY, maxZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [maxX, eaveY, minZ],
        [maxX, eaveY, maxZ],
        [ridgeEndX, ridgeY, midZ],
      ],
      uv,
    )
  } else {
    const ridgeStartZ = minZ + inset
    const ridgeEndZ = maxZ - inset

    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaveY, minZ],
        [maxX, eaveY, minZ],
        [midX, ridgeY, ridgeStartZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaveY, minZ],
        [midX, ridgeY, ridgeStartZ],
        [midX, ridgeY, ridgeEndZ],
        [minX, eaveY, maxZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [maxX, eaveY, minZ],
        [maxX, eaveY, maxZ],
        [midX, ridgeY, ridgeEndZ],
        [midX, ridgeY, ridgeStartZ],
      ],
      uv,
    )
    emitPolygon(
      positions,
      uvs,
      [
        [minX, eaveY, maxZ],
        [midX, ridgeY, ridgeEndZ],
        [maxX, eaveY, maxZ],
      ],
      uv,
    )
  }

  // Every hip edge is an eave, so the fascia runs right round.
  band([minX, eaveY, minZ], [maxX, eaveY, minZ])
  band([maxX, eaveY, minZ], [maxX, eaveY, maxZ])
  band([maxX, eaveY, maxZ], [minX, eaveY, maxZ])
  band([minX, eaveY, maxZ], [minX, eaveY, minZ])

  return { positions, uvs, fascia, fasciaUvs, gables, gableUvs, apex: ridgeY }
}
