import * as THREE from 'three'
import { useMemo } from 'react'
import type { Bounds, OpeningUnit } from '../drawing/building3d'
import { TRIM_SURFACE } from '../drawing/materials'
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
 * The dark slatted fence that closes the plot in the render.
 *
 * Set well back from the house so it frames the view rather than crowding
 * it, and left OPEN on the camera's corner — a fence across the elevation
 * the customer came to look at is a wall in front of the house.
 */
export function Fence({ bounds, span }: { bounds: Bounds | null; span: number }) {
  const post = useSolid({ color: '#2A2C2E', roughness: 0.7, metalness: 0.1 })
  const slat = useSolid({ color: '#34373A', roughness: 0.75, metalness: 0.05 })

  const runs = useMemo(() => {
    if (!bounds) return []
    const back = Math.max(4, span * 0.75)
    const x0 = bounds.minX - back
    const x1 = bounds.maxX + back
    const z0 = bounds.minZ - back
    const z1 = bounds.maxZ + back
    // Only the two far sides: the camera starts off the +x/+z corner.
    return [
      { from: [x0, z0], to: [x1, z0] },
      { from: [x0, z0], to: [x0, z1] },
    ] as { from: [number, number]; to: [number, number] }[]
  }, [bounds, span])

  if (runs.length === 0) return null

  const H = 1.6

  return (
    <>
      {runs.map((run, r) => {
        const dx = run.to[0] - run.from[0]
        const dz = run.to[1] - run.from[1]
        const length = Math.hypot(dx, dz)
        const angle = Math.atan2(dz, dx)
        const posts = Math.max(2, Math.round(length / 2.4) + 1)
        return (
          <group key={r}>
            {Array.from({ length: posts }, (_, i) => {
              const t = i / (posts - 1)
              return (
                <mesh
                  key={i}
                  position={[run.from[0] + dx * t, H / 2, run.from[1] + dz * t]}
                  rotation={[0, -angle, 0]}
                  material={post}
                  castShadow
                >
                  <boxGeometry args={[0.1, H, 0.1]} />
                </mesh>
              )
            })}
            {/* Horizontal slats with gaps, which is what makes it a fence
                rather than a hoarding. */}
            {[0.25, 0.55, 0.85, 1.15, 1.45].map((y) => (
              <mesh
                key={y}
                position={[run.from[0] + dx / 2, y, run.from[1] + dz / 2]}
                rotation={[0, -angle, 0]}
                material={slat}
                castShadow
              >
                <boxGeometry args={[length, 0.16, 0.03]} />
              </mesh>
            ))}
          </group>
        )
      })}
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
