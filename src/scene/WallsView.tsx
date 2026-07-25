import { useTheme } from '@mui/material/styles'
import type { DrawingState, DrawWall } from '../drawing/types'

const WALL_THICKNESS = 0.15
const WALL_HEIGHT = 0.3

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
    <mesh position={[midX, WALL_HEIGHT / 2, midY]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, WALL_HEIGHT, WALL_THICKNESS]} />
      <meshStandardMaterial color={color} />
    </mesh>
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
