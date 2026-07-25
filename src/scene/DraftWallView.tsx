import { useTheme } from '@mui/material/styles'
import type { DraftWall } from './useInteraction'
import { SnapIndicator } from './SnapIndicator'

export function DraftWallView({ draft }: { draft: DraftWall | null }) {
  const { scene } = useTheme()
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
          <meshBasicMaterial color={scene.draft} transparent opacity={0.8} />
        </mesh>
      )}
      {draft.snap && <SnapIndicator point={draft.snap.point} />}
    </>
  )
}
