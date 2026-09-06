import { useTheme } from '@mui/material/styles'
import type { DrawingState, Point } from '../drawing/types'
import type { ToolMode } from '../drawing/tools'
import { fixtureSpec } from '../drawing/fixtures'
import { snapToGrid, findWallAt } from '../drawing/geometry'
import { offsetAlongWall } from '../drawing/openings'
import { EXTERIOR_WALL_THICKNESS } from '../drawing/wallOutline'

const HEIGHT = 0.09
const OPACITY = 0.45

/**
 * A translucent outline of whatever is about to be placed, following the
 * cursor — so its real size and orientation are visible before committing,
 * rather than only after the click.
 */
export function GhostPreview({
  tool,
  cursor,
  state,
}: {
  tool: ToolMode
  cursor: Point | null
  state: DrawingState
}) {
  const { scene } = useTheme()

  if (!cursor) return null

  if (tool.type === 'fixture') {
    const spec = fixtureSpec(tool.kind)
    const at = snapToGrid(cursor)
    return (
      <mesh position={[at.x, HEIGHT, at.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[spec.width, spec.depth]} />
        <meshBasicMaterial color={scene.draft} transparent opacity={OPACITY} />
      </mesh>
    )
  }

  if (tool.type === 'opening') {
    // Openings only exist on a wall, so the ghost sits where it would
    // actually land rather than loose under the cursor.
    const wall = findWallAt(state, cursor)
    if (!wall) return null

    const offset = offsetAlongWall(state, wall.id, cursor)
    if (offset === null) return null

    const a = state.nodes[wall.a]
    const b = state.nodes[wall.b]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length === 0) return null

    const dx = (b.x - a.x) / length
    const dy = (b.y - a.y) / length
    const half = tool.width / 2
    const clamped = Math.min(Math.max(offset, half), Math.max(half, length - half))

    return (
      <mesh
        position={[a.x + dx * clamped, HEIGHT, a.y + dy * clamped]}
        rotation={[-Math.PI / 2, 0, -Math.atan2(dy, dx)]}
      >
        <planeGeometry args={[tool.width, EXTERIOR_WALL_THICKNESS * 1.4]} />
        <meshBasicMaterial color={scene.draft} transparent opacity={OPACITY} />
      </mesh>
    )
  }

  return null
}
