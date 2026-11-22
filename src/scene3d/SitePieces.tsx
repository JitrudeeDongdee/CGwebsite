import * as THREE from 'three'
import { useMemo } from 'react'
import type { Bounds, OpeningUnit, RailRun } from '../drawing/building3d'
import { TRIM_SURFACE } from '../drawing/materials'
import {
  FENCE_HEIGHTS,
  railStyle,
  type FenceHeight,
  type FenceSides,
} from '../drawing/railing'
import { useSolid } from './Surfaces'

/**
 * The things around and under the house that are not the house.
 *
 * All of it is in the reference render the owner asked to match: the cabin
 * stands clear of the ground on piers, every door has a short flight of
 * steps, sconces flank the entrance, and the plot is closed with a dark
 * slatted fence. None of it changes the plan — it is site work, switched on
 * in the 3D panel.
 */

/** How far the floor is lifted, in metres. */
export const RAISE_HEIGHTS = { none: 0, low: 0.45, high: 0.9 } as const
export type RaiseHeight = keyof typeof RAISE_HEIGHTS

const PIER = 0.22

/**
 * Piers under the slab, on a grid rather than one per corner: a 12 m cabin
 * on four posts reads as a table, and the render clearly has a run of them
 * down each long side.
 */
export function Piers({ bounds, raise }: { bounds: Bounds | null; raise: number }) {
  const material = useSolid({ color: '#2E3134', roughness: 0.8, metalness: 0.1 })
  const spots = useMemo(() => {
    if (!bounds || raise <= 0) return []
    const inset = 0.35
    const x0 = bounds.minX + inset
    const x1 = bounds.maxX - inset
    const z0 = bounds.minZ + inset
    const z1 = bounds.maxZ - inset
    // About every 2 m along the longer run, and never fewer than two.
    const count = Math.max(2, Math.round((x1 - x0) / 2) + 1)
    const out: [number, number][] = []
    for (let i = 0; i < count; i++) {
      const x = x0 + ((x1 - x0) * i) / (count - 1)
      out.push([x, z0], [x, z1])
    }
    return out
  }, [bounds, raise])

  if (spots.length === 0) return null

  return (
    <>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, raise / 2, z]} material={material} castShadow receiveShadow>
          <boxGeometry args={[PIER, raise, PIER]} />
        </mesh>
      ))}
    </>
  )
}

/**
 * A flight of steps up to each exterior door.
 *
 * Built from the door itself rather than placed by hand: a raised house with
 * a door you cannot reach is worse than no steps at all, and the door
 * already knows where it is and which way it faces.
 */
export function EntrySteps({
  units,
  raise,
}: {
  units: OpeningUnit[]
  raise: number
}) {
  const material = useSolid({ color: '#4A4E52', roughness: 0.85, metalness: 0 })
  const doors = units.filter((unit) => unit.kind === 'door' && unit.exterior && unit.outward)

  if (raise <= 0.05 || doors.length === 0) return null

  // ~170 mm a rise, which is what a stair actually is.
  const count = Math.max(1, Math.round(raise / 0.17))
  const rise = raise / count
  const tread = 0.3

  return (
    <>
      {doors.map((door) => {
        const out = door.outward!
        return (
          <group key={`steps-${door.id}`}>
            {Array.from({ length: count }, (_, i) => {
              // Each step stands one tread further out and one rise lower.
              const stepTop = raise - i * rise
              const away = (i + 0.5) * tread
              return (
                <mesh
                  key={i}
                  position={[
                    door.x + out.x * away,
                    stepTop - rise / 2,
                    door.z + out.z * away,
                  ]}
                  rotation={[0, -door.angle, 0]}
                  material={material}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[door.width + 0.5, rise, tread]} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </>
  )
}

/**
 * Sconces either side of each exterior door, as in the render.
 *
 * A small emissive face rather than a real light: a point light per door
 * would cost a shadow map each and buy nothing in daylight, while the glow
 * is the part you actually see.
 */
export function WallLights({ units, raise }: { units: OpeningUnit[]; raise: number }) {
  const body = useSolid({ color: '#26282A', roughness: 0.5, metalness: 0.3 })
  const glow = useSolid(
    { color: '#FFE2B0', roughness: 1, metalness: 0 },
    { emissive: new THREE.Color('#FFC46B'), emissiveIntensity: 1.4 },
  )
  const doors = units.filter((unit) => unit.kind === 'door' && unit.exterior && unit.outward)

  if (doors.length === 0) return null

  return (
    <>
      {doors.flatMap((door) => {
        const out = door.outward!
        // Along the wall is the outward normal turned a quarter turn.
        const alongX = -out.z
        const alongZ = out.x
        const reach = door.width / 2 + 0.35
        const height = raise + 2.0
        return [-1, 1].map((side) => (
          <group
            key={`sconce-${door.id}-${side}`}
            position={[
              door.x + alongX * reach * side + out.x * 0.06,
              height,
              door.z + alongZ * reach * side + out.z * 0.06,
            ]}
            rotation={[0, -door.angle, 0]}
          >
            <mesh material={body} castShadow>
              <boxGeometry args={[0.07, 0.26, 0.07]} />
            </mesh>
            <mesh position={[0, 0, -0.045]} material={glow}>
              <boxGeometry args={[0.05, 0.2, 0.01]} />
            </mesh>
          </group>
        ))
      })}
    </>
  )
}

/**
 * The fence round the plot.
 *
 * Built from the same `RailRunMesh` as a balcony railing, because it is the
 * same object: posts, a top rail and infill. What is controllable is how much
 * of the plot it closes, how tall it is and what it is made of.
 *
 * ⚠️ `far` stays the DEFAULT and the reason is not aesthetic drift: the camera
 * starts off the +x/+z corner, so closing all four sides puts a fence across
 * the elevation the customer came to look at. `all` is offered because a
 * walled plot is what some customers have, and they can turn the camera.
 */
export function Fence({
  bounds,
  span,
  sides = 'far',
  height = 'medium',
  style = 'slat',
}: {
  bounds: Bounds | null
  span: number
  sides?: FenceSides
  height?: FenceHeight
  style?: string
}) {
  const runs = useMemo<RailRun[]>(() => {
    if (!bounds || style === 'none') return []
    const back = Math.max(4, span * 0.75)
    const x0 = bounds.minX - back
    const x1 = bounds.maxX + back
    const z0 = bounds.minZ - back
    const z1 = bounds.maxZ + back
    const H = FENCE_HEIGHTS[height] ?? FENCE_HEIGHTS.medium

    // The two FAR sides first, so `far` and `three` are prefixes of `all`
    // rather than three separate lists that could disagree.
    const lines: [number, number, number, number][] = [
      [x0, z0, x1, z0],
      [x0, z0, x0, z1],
    ]
    if (sides === 'three' || sides === 'all') lines.push([x0, z1, x1, z1])
    if (sides === 'all') lines.push([x1, z0, x1, z1])

    return lines.map(([ax, az, bx, bz], i) => ({
      id: `fence-${i}`,
      from: { x: ax, z: az },
      to: { x: bx, z: bz },
      y: 0,
      height: H,
      style,
    }))
  }, [bounds, span, sides, height, style])

  return <Railings runs={runs} />
}

/**
 * One straight run of railing or fence.
 *
 * ONE renderer for both, which is the whole reason `RailStyle` is a single
 * vocabulary: a balcony rail is a fence at waist height standing on a slab
 * instead of on the ground. Posts and a top rail always; what fills the gap
 * between them is the style.
 */
function RailRunMesh({
  run,
  post,
  rail,
  infill,
  glass,
}: {
  run: RailRun
  post: THREE.Material
  rail: THREE.Material
  infill: THREE.Material
  glass: THREE.Material
}) {
  const dx = run.to.x - run.from.x
  const dz = run.to.z - run.from.z
  const length = Math.hypot(dx, dz)
  if (length < 0.05) return null

  const angle = Math.atan2(dz, dx)
  const midX = run.from.x + dx / 2
  const midZ = run.from.z + dz / 2
  const style = railStyle(run.style, 'bar')
  const H = run.height
  const POST = 0.07

  // A post every ~1.8 m, and one at each end whatever the length — a run
  // whose ends float is the thing that makes a railing look unbuilt.
  const posts = Math.max(2, Math.round(length / 1.8) + 1)
  // ⚠️ Counted up front, NOT from a third `Array.from` callback argument:
  // `Array.from(arrayLike, fn)` passes fn only (element, index), so an `all`
  // parameter is undefined and reading `all.length` throws at render.
  const bars = style.bars ? Math.max(2, Math.floor(length / style.bars)) : 0
  const slats = style.slats ? Math.max(2, Math.floor((H - 0.1) / style.slats)) : 0

  return (
    <group position={[midX, run.y, midZ]} rotation={[0, -angle, 0]}>
      {Array.from({ length: posts }, (_, i) => {
        const along = -length / 2 + (length * i) / (posts - 1)
        return (
          <mesh key={i} position={[along, H / 2, 0]} material={post} castShadow>
            <boxGeometry args={[POST, H, POST]} />
          </mesh>
        )
      })}

      {/* The top rail — the hand goes on this, so it is on every style. */}
      <mesh position={[0, H, 0]} material={rail} castShadow>
        <boxGeometry args={[length, 0.06, 0.1]} />
      </mesh>

      {bars > 0 && (
        <>
          {Array.from({ length: bars }, (_, i) => {
            const along = -length / 2 + (length * (i + 0.5)) / bars
            return (
              <mesh key={i} position={[along, H / 2, 0]} material={infill} castShadow={false}>
                <boxGeometry args={[0.022, H - 0.06, 0.022]} />
              </mesh>
            )
          })}
        </>
      )}

      {slats > 0 && (
        <>
          {Array.from({ length: slats }, (_, i) => {
            const y = 0.14 + ((H - 0.28) * i) / Math.max(1, slats - 1)
            return (
              <mesh key={i} position={[0, y, 0]} material={infill} castShadow>
                <boxGeometry args={[length, 0.14, 0.03]} />
              </mesh>
            )
          })}
        </>
      )}

      {style.glazed && (
        <mesh position={[0, H / 2, 0]} material={glass} castShadow={false}>
          <boxGeometry args={[length - POST, H - 0.12, 0.014]} />
        </mesh>
      )}

      {style.solid && (
        <mesh position={[0, (H - 0.06) / 2, 0]} material={infill} castShadow receiveShadow>
          <boxGeometry args={[length, H - 0.06, 0.12]} />
        </mesh>
      )}
    </group>
  )
}

/**
 * The railing round every balcony.
 *
 * The runs are DERIVED from each balcony's own edges by `balconyPieces`, not
 * placed: a balcony without a rail is a fall, so there must be no way to end
 * up with a slab and nothing round it by missing a step. Same reasoning as the
 * entry steps, which are built from the doors.
 */
export function Railings({ runs }: { runs: RailRun[] }) {
  const post = useSolid({ color: '#2E3134', roughness: 0.6, metalness: 0.25 })
  const rail = useSolid({ color: '#3A3D41', roughness: 0.55, metalness: 0.3 })
  const infill = useSolid({ color: '#43464A', roughness: 0.7, metalness: 0.15 })
  // `transparent` is not part of `Surface`, so it belongs in the extras —
  // and without it the opacity is simply ignored and the glass is a slab.
  const glass = useSolid(
    { color: '#CFE3EC', roughness: 0.08, metalness: 0 },
    // `Surface` is colour/roughness/metalness only, so transparency belongs
    // in the extras — and without `transparent` the opacity is ignored and
    // the panel renders as a solid slab.
    { transparent: true, opacity: 0.4, envMapIntensity: 1.6 },
  )

  if (runs.length === 0) return null

  return (
    <>
      {runs.map((run) => (
        <RailRunMesh
          key={run.id}
          run={run}
          post={post}
          rail={rail}
          infill={infill}
          glass={glass}
        />
      ))}
    </>
  )
}

/** The slab edge, so a raised house does not float on its piers. */
export function RaisedSkirt({ bounds, raise }: { bounds: Bounds | null; raise: number }) {
  const material = useSolid(TRIM_SURFACE)
  if (!bounds || raise <= 0) return null
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  return (
    <mesh
      position={[
        (bounds.minX + bounds.maxX) / 2,
        raise - 0.09,
        (bounds.minZ + bounds.maxZ) / 2,
      ]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width + 0.2, 0.18, depth + 0.2]} />
    </mesh>
  )
}

/**
 * Low planting beds along the long elevations, as the render has either side
 * of the entrance.
 *
 * Set against the WALL rather than scattered: a bed in the middle of a yard
 * is a flowerpot, while a bed against the house is landscaping — and it is
 * what hides the join between the gravel and the plinth. Kept off the
 * camera's own corner for the same reason the trees are.
 */
export function PlantingBeds({ bounds }: { bounds: Bounds | null }) {
  const soil = useSolid({ color: '#4A4238', roughness: 1, metalness: 0 })
  const leaf = useSolid({ color: '#6F8A52', roughness: 0.95, metalness: 0 })
  const flower = useSolid({ color: '#EDEDE6', roughness: 0.9, metalness: 0 })

  const beds = useMemo(() => {
    if (!bounds) return []
    const width = bounds.maxX - bounds.minX
    const z = bounds.minZ - 0.75                 // the far long elevation
    const run = Math.max(1.6, width * 0.34)
    return [
      { x: bounds.minX + width * 0.22, z, run },
      { x: bounds.minX + width * 0.74, z, run },
    ]
  }, [bounds])

  if (beds.length === 0) return null

  return (
    <>
      {beds.map((bed, i) => (
        <group key={i} position={[bed.x, 0, bed.z]}>
          <mesh position={[0, 0.06, 0]} material={soil} receiveShadow>
            <boxGeometry args={[bed.run, 0.12, 1.0]} />
          </mesh>
          {/* A few shrubs along it, at fixed offsets so the planting does
              not rearrange itself on every plan edit. */}
          {[-0.34, -0.1, 0.14, 0.38].map((t, j) => (
            <group key={j} position={[bed.run * t, 0.12, (j % 2 === 0 ? -0.16 : 0.16)]}>
              <mesh position={[0, 0.2, 0]} material={leaf} castShadow>
                <sphereGeometry args={[0.26, 7, 5]} />
              </mesh>
              <mesh position={[0.08, 0.33, 0.06]} material={flower} castShadow={false}>
                <sphereGeometry args={[0.1, 6, 4]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  )
}
