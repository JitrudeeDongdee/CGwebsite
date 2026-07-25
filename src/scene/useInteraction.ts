import { useCallback, useRef, useState } from 'react'
import type { DrawingState, Point, SnapTarget } from '../drawing/types'
import { NODE_HIT_RADIUS, distance, findSnapTarget } from '../drawing/geometry'

export interface DraftWall {
  start: Point
  current: Point
  snap: SnapTarget | null
}

type Mode = { type: 'node'; nodeId: string } | { type: 'draft'; start: Point } | null

/**
 * Single entry point for pointer input (from the ground-plane mesh): decides
 * whether a press starts a node move or a new wall draft, and tracks the
 * in-progress drag. Mouse and touch both arrive here as the same normalized
 * {x, y} point via React Three Fiber's pointer events.
 *
 * The active mode lives in a ref, not useState: a native pointermove/up can
 * fire against a handler closure captured before React re-renders with the
 * mode set on pointerdown, which would silently read a stale null and drop
 * the whole gesture. A ref is mutated synchronously in the same tick as the
 * native event, so every closure sees the current mode regardless of
 * render timing (same class of race as the OrbitControls fix in
 * DrawingCanvas).
 */
export function useInteraction(
  state: DrawingState,
  addWall: (start: Point, end: Point) => void,
  updateNodePosition: (nodeId: string, point: Point) => void,
) {
  const modeRef = useRef<Mode>(null)
  const [draft, setDraft] = useState<DraftWall | null>(null)

  const onDown = useCallback(
    (point: Point) => {
      const nearNode = Object.values(state.nodes).find(
        (node) => distance(point, node) < NODE_HIT_RADIUS,
      )
      if (nearNode) {
        modeRef.current = { type: 'node', nodeId: nearNode.id }
      } else {
        modeRef.current = { type: 'draft', start: point }
        setDraft({ start: point, current: point, snap: findSnapTarget(state, point) })
      }
    },
    [state],
  )

  const onMove = useCallback(
    (point: Point) => {
      const mode = modeRef.current
      if (!mode) return
      if (mode.type === 'node') {
        updateNodePosition(mode.nodeId, point)
      } else {
        setDraft({ start: mode.start, current: point, snap: findSnapTarget(state, point) })
      }
    },
    [state, updateNodePosition],
  )

  const onUp = useCallback(
    (point: Point) => {
      const mode = modeRef.current
      modeRef.current = null
      if (mode?.type === 'draft') {
        addWall(mode.start, point)
      }
      setDraft(null)
    },
    [addWall],
  )

  return { draft, onDown, onMove, onUp }
}
