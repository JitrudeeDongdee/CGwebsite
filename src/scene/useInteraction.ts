import { useCallback, useState } from 'react'
import type { DrawingState, Point, SnapTarget } from '../drawing/types'
import { NODE_HIT_RADIUS, distance, findSnapTarget } from '../drawing/geometry'

export interface DraftWall {
  start: Point
  current: Point
  snap: SnapTarget | null
}

/**
 * Single entry point for pointer input (from the ground-plane mesh): decides
 * whether a press starts a node move or a new wall draft, and tracks the
 * in-progress drag. Mouse and touch both arrive here as the same normalized
 * {x, y} point via React Three Fiber's pointer events.
 */
export function useInteraction(
  state: DrawingState,
  addWall: (start: Point, end: Point) => void,
  updateNodePosition: (nodeId: string, point: Point) => void,
) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftWall | null>(null)

  const onDown = useCallback(
    (point: Point) => {
      const nearNode = Object.values(state.nodes).find(
        (node) => distance(point, node) < NODE_HIT_RADIUS,
      )
      if (nearNode) {
        setDraggingNodeId(nearNode.id)
      } else {
        setDraft({ start: point, current: point, snap: findSnapTarget(state, point) })
      }
    },
    [state],
  )

  const onMove = useCallback(
    (point: Point) => {
      if (draggingNodeId) {
        updateNodePosition(draggingNodeId, point)
      } else if (draft) {
        setDraft({ ...draft, current: point, snap: findSnapTarget(state, point) })
      }
    },
    [draggingNodeId, draft, state, updateNodePosition],
  )

  const onUp = useCallback(
    (point: Point) => {
      if (draggingNodeId) {
        setDraggingNodeId(null)
      } else if (draft) {
        addWall(draft.start, point)
        setDraft(null)
      }
    },
    [draggingNodeId, draft, addWall],
  )

  const isInteracting = draggingNodeId !== null || draft !== null

  return { draft, isInteracting, onDown, onMove, onUp }
}
