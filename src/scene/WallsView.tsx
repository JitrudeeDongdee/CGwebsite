import { useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from '@mui/material/styles'
import type { DrawingState } from '../drawing/types'
import { computeWallOutlines, type WallOutline } from '../drawing/wallOutline'
import { DimensionLabel } from './DimensionLabel'

/** Just above the grid, below the corner marks and dimension text. */
const WALL_HEIGHT = 0.02

function WallPoly({ outline, color }: { outline: WallOutline; color: string }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(
      outline.corners.flatMap((corner) => [corner.x, WALL_HEIGHT, corner.y]),
    )
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setIndex([0, 1, 2, 0, 2, 3])
    geom.computeVertexNormals()
    return geom
  }, [outline])

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

/**
 * Walls drawn as filled bands (poché) rather than single lines, with their
 * edges mitered where walls meet — the double-line convention of a real
 * floor plan. See drawing/wallOutline.ts for the joint geometry.
 */
export function WallsView({
  state,
  exteriorWallIds,
}: {
  state: DrawingState
  exteriorWallIds: ReadonlySet<string>
}) {
  const { scene } = useTheme()
  const outlines = useMemo(
    () => computeWallOutlines(state, exteriorWallIds),
    [state, exteriorWallIds],
  )

  return (
    <>
      {outlines.map((outline) => (
        <WallPoly key={outline.wallId} outline={outline} color={scene.wall} />
      ))}
      {state.walls.map((wall) => {
        const a = state.nodes[wall.a]
        const b = state.nodes[wall.b]
        if (!a || !b) return null
        return <DimensionLabel key={wall.id} a={a} b={b} />
      })}
    </>
  )
}
