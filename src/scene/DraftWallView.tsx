import type { DraftWall } from './useInteraction'

export function DraftWallView({ draft }: { draft: DraftWall | null }) {
  if (!draft) return null

  const end = draft.snap?.point ?? draft.current

  const dx = end.x - draft.start.x
  const dy = end.y - draft.start.y
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const midX = (draft.start.x + end.x) / 2
  const midY = (draft.start.y + end.y) / 2

  return (
    <>
      {length > 0 && (
        <mesh position={[midX, 0.16, midY]} rotation={[0, -angle, 0]}>
          <boxGeometry args={[length, 0.02, 0.06]} />
          <meshBasicMaterial color="#3f8ee0" transparent opacity={0.8} />
        </mesh>
      )}
      {draft.snap && (
        <mesh position={[draft.snap.point.x, 0.12, draft.snap.point.y]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.24, 24]} />
          <meshBasicMaterial color="#3fe08e" />
        </mesh>
      )}
    </>
  )
}
