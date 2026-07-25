import { useTheme } from '@mui/material/styles'
import type { DrawNode } from '../drawing/types'
import { NODE_VISUAL_RADIUS } from '../drawing/geometry'

export function NodesView({ nodes }: { nodes: DrawNode[] }) {
  const { scene } = useTheme()
  return (
    <>
      {nodes.map((node) => (
        <mesh key={node.id} position={[node.x, 0.05, node.y]}>
          <cylinderGeometry args={[NODE_VISUAL_RADIUS, NODE_VISUAL_RADIUS, 0.1, 16]} />
          <meshStandardMaterial color={scene.node} />
        </mesh>
      ))}
    </>
  )
}
