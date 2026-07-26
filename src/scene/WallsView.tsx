import { useTheme } from '@mui/material/styles'
import type { DrawingState, DrawWall } from '../drawing/types'
import { DimensionLabel } from './DimensionLabel'

/**
 * Thin, flat line rather than a chunky extruded box — the look of a pencil
 * line on a drafting sheet. Wall poché (drawn double-line thickness) is a
 * separate, later job; this keeps the plan readable while editing.
 */
const WALL_THICKNESS = 0.045

function WallMesh({ wall, state, color }: { wall: DrawWall; state: DrawingState; color: string }) {
  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return null

  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return null

  const angle = Math.atan2(dy, dx)
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2

  return (
    <>
      <mesh position={[midX, 0.02, midY]} rotation={[-Math.PI / 2, 0, -angle]}>
        <planeGeometry args={[length, WALL_THICKNESS]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <DimensionLabel a={a} b={b} />
    </>
  )
}

export function WallsView({ state }: { state: DrawingState }) {
  const { scene } = useTheme()
  return (
    <>
      {state.walls.map((wall) => (
        <WallMesh key={wall.id} wall={wall} state={state} color={scene.wall} />
      ))}
    </>
  )
}
