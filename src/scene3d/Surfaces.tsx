import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SurfacePattern, Surface } from '../drawing/materials'
import type { WallBox } from '../drawing/building3d'
import { disposeTiled, tiledMaterial } from './textures'

/**
 * A patterned material sized to this surface's real extent in metres, freed
 * when the surface goes away.
 *
 * `width`/`height` are what the pattern is scaled against, so a brick stays
 * the same size on a 1 m pier and an 8 m wall. Geometry whose UVs are
 * already in metres (the roof) passes 1, 1.
 */
export function useTiled(
  pattern: SurfacePattern,
  color: string,
  width: number,
  height: number,
  side?: THREE.Side,
): THREE.MeshStandardMaterial {
  const material = useMemo(
    () => tiledMaterial(pattern, color, width, height, side ? { side } : undefined),
    [pattern, color, width, height, side],
  )
  useEffect(() => () => disposeTiled(material), [material])
  return material
}

/** One box of wall, trim or column, patterned and placed. */
export function PatternedBox({
  box,
  pattern,
  color,
  cast = true,
  receive = true,
}: {
  box: WallBox
  pattern: SurfacePattern
  color: string
  cast?: boolean
  receive?: boolean
}) {
  const material = useTiled(pattern, color, box.length, box.height)

  return (
    <mesh
      position={[box.x, box.y, box.z]}
      rotation={[0, -box.angle, 0]}
      material={material}
      castShadow={cast}
      receiveShadow={receive}
    >
      <boxGeometry args={[box.length, box.height, box.thickness]} />
    </mesh>
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

/** Triangle soup from the roof builder, with UVs already in metres. */
export function useRoofGeometry(positions: number[], uvs: number[]): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.computeVertexNormals()
    return geom
  }, [positions, uvs])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}
