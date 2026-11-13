import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SurfacePattern, Surface } from '../drawing/materials'
import type { WallBox } from '../drawing/building3d'
import { sharedMaterial, tilesAcross } from './textures'

/**
 * The one material for this finish. Shared across every surface wearing it —
 * see `sharedMaterial` for why that matters more than it looks.
 */
export function useShared(
  pattern: SurfacePattern,
  color: string,
  side?: THREE.Side,
): THREE.MeshStandardMaterial {
  return useMemo(() => sharedMaterial(pattern, color, side), [pattern, color, side])
}

/**
 * Stretches a geometry's UVs so the pattern tiles at its real size.
 *
 * This is the per-surface half of the tiling. It belongs on the geometry,
 * which every mesh owns anyway, rather than on the material, which every mesh
 * would then need its own copy of.
 */
export function scaleUv(geometry: THREE.BufferGeometry, u: number, v: number): void {
  const uv = geometry.getAttribute('uv')
  if (!uv) return
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  }
  uv.needsUpdate = true
}

/** One box of wall, trim or column, patterned and placed. */
export function PatternedBox({
  box,
  pattern,
  color,
  insideColor,
  cast = true,
  receive = true,
}: {
  box: WallBox
  pattern: SurfacePattern
  color: string
  /** Paints the room side separately. Omit and both faces match. */
  insideColor?: string
  cast?: boolean
  receive?: boolean
}) {
  const outward = box.exterior ? box.outward : undefined
  const material = useShared(pattern, color)
  // The inner face is paint, never the outside cladding: a brick elevation
  // does not mean a brick living room.
  const inner = useShared('paint', insideColor ?? color)

  /**
   * Which of the box's two broad faces looks outward.
   *
   * A BoxGeometry's groups are +x, -x, +y, -y, +z, -z, and the wall runs
   * along local x with its thickness on z — so the two faces that matter are
   * groups 4 and 5. Rotating local +z by the box's own angle and comparing it
   * with `outward` says which is which, rather than re-deriving the sign the
   * builder used.
   */
  const faces = useMemo(() => {
    if (!insideColor || !box.outward) return undefined
    const zx = -Math.sin(box.angle)
    const zz = Math.cos(box.angle)
    const plusZIsOut = zx * box.outward.x + zz * box.outward.z > 0
    const sides = [material, material, material, material]
    return plusZIsOut
      ? [...sides, material, inner]
      : [...sides, inner, material]
  }, [insideColor, box.outward, box.angle, material, inner])

  const geometry = useMemo(() => {
    const geom = new THREE.BoxGeometry(box.length, box.height, box.thickness)
    // A box's UVs run 0..1 on every face, so this is where its real size
    // enters: a 4 m wall gets four times the brick courses of a 1 m pier.
    scaleUv(geom, ...tilesAcross(pattern, box.length, box.height))
    return geom
  }, [pattern, box.length, box.height, box.thickness])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      position={[box.x, box.y, box.z]}
      rotation={[0, -box.angle, 0]}
      geometry={geometry}
      material={faces ?? material}
      castShadow={cast}
      receiveShadow={receive}
      userData={outward ? { outward } : undefined}
    />
  )
}

/** A flat, untextured finish — frames, glazing, furniture. */
export function useSolid(surface: Surface, extra?: THREE.MeshStandardMaterialParameters) {
  const key = JSON.stringify([surface, extra])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ ...surface, ...extra }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

/**
 * Triangle soup from the roof builder. Its UVs arrive in METRES, so they are
 * divided by the tile size here — the same job `scaleUv` does for a box, from
 * the other direction.
 */
export function useRoofGeometry(
  positions: number[],
  uvs: number[],
  pattern: SurfacePattern,
): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    scaleUv(geom, ...tilesAcross(pattern, 1, 1))
    geom.computeVertexNormals()
    return geom
  }, [positions, uvs, pattern])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

/** A ground plane whose pattern tiles at its real size. */
export function usePlaneGeometry(
  width: number,
  depth: number,
  pattern: SurfacePattern,
  tiled = true,
): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(width, depth)
    // The apron and the floor slab deliberately show one tile across the
    // whole slab, as they did before; only the field is tiled to its size.
    if (tiled) scaleUv(geom, ...tilesAcross(pattern, width, depth))
    return geom
  }, [width, depth, pattern, tiled])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}
