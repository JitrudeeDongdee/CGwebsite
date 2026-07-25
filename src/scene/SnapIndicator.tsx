import type { Point } from '../drawing/types'

export function SnapIndicator({ point }: { point: Point }) {
  return (
    <mesh position={[point.x, 0.12, point.y]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.18, 0.24, 24]} />
      <meshBasicMaterial color="#3fe08e" />
    </mesh>
  )
}
