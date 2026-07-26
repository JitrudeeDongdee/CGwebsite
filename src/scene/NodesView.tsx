import { useTheme } from '@mui/material/styles'
import type { DrawNode } from '../drawing/types'

/** Small enough to read as a drafting corner mark, not a big handle. */
const NODE_RADIUS = 0.055

export function NodesView({ nodes }: { nodes: DrawNode[] }) {
  const { scene } = useTheme()
  return (
    <>
      {nodes.map((node) => (
        <mesh
          key={node.id}
          position={[node.x, 0.04, node.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[NODE_RADIUS, 16]} />
          <meshBasicMaterial color={scene.node} />
        </mesh>
      ))}
    </>
  )
}
