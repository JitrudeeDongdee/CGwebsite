import { useTheme } from '@mui/material/styles'
import type { DraftWall } from './useInteraction'
import { SnapIndicator } from './SnapIndicator'
import { DimensionLabel } from './DimensionLabel'

/**
 * The rubber-band line between the anchored start point and the cursor,
 * with its live length so you can size a wall as you draw it.
 */
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
        <>
          <mesh position={[midX, 0.05, midY]} rotation={[-Math.PI / 2, 0, -angle]}>
            <planeGeometry args={[length, 0.03]} />
            <meshBasicMaterial color={scene.draft} transparent opacity={0.9} />
          </mesh>
          <DimensionLabel a={draft.start} b={end} variant="draft" />
        </>
      )}

      {/* The anchored start point, so it's clear where the wall begins. */}
      <mesh position={[draft.start.x, 0.06, draft.start.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.07, 16]} />
        <meshBasicMaterial color={scene.draft} />
      </mesh>

      {draft.snap && <SnapIndicator point={draft.snap.point} />}
    </>
  )
}
