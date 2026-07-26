import { useCallback, useRef, useState } from 'react'
import type { DrawingState, Point, SnapTarget } from '../drawing/types'
import { findNodeAt, findSnapTarget, snapToGrid } from '../drawing/geometry'

export interface DraftWall {
  start: Point
  current: Point
  snap: SnapTarget | null
}

/**
 * How far the pointer must travel while held before we treat the gesture as
 * a drag rather than a click. In world units — roughly a few pixels at the
 * default zoom.
 */
const DRAG_THRESHOLD = 0.08

interface Press {
  origin: Point
  nodeId: string | null
  moved: boolean
}

interface UseInteractionOptions {
  state: DrawingState
  addWall: (start: Point, end: Point) => void
  beginNodeDrag: () => void
  updateNodePosition: (nodeId: string, point: Point) => void
  finalizeNodeMove: (nodeId: string, point: Point) => void
}

/**
 * Drafting-style input, matching how CAD/floor-plan tools behave:
 *
 * - click on empty space or a corner  -> anchor the start of a wall
 * - move                              -> rubber-band preview follows cursor
 * - click again                       -> place that wall, and keep drawing
 *                                        from the point just placed
 * - Escape                            -> stop drawing
 * - press and *drag* a corner         -> move that corner instead
 *
 * Click-to-place (rather than drag-to-draw) is what makes closing a room
 * possible: the last wall of a loop needs both ends to land on corners that
 * already exist, which a drag starting on an existing corner could never do
 * because that gesture is reserved for moving it.
 */
export function useInteraction({
  state,
  addWall,
  beginNodeDrag,
  updateNodePosition,
  finalizeNodeMove,
}: UseInteractionOptions) {
  const pressRef = useRef<Press | null>(null)
  /** Anchor of the wall currently being drawn; null when not drawing. */
  const anchorRef = useRef<Point | null>(null)

  const [draft, setDraft] = useState<DraftWall | null>(null)
  const [moveSnap, setMoveSnap] = useState<SnapTarget | null>(null)

  /** Resolves a raw pointer position to where geometry would actually land. */
  const resolve = useCallback(
    (point: Point, excludeNodeId?: string): { point: Point; snap: SnapTarget | null } => {
      const snap = findSnapTarget(state, point, undefined, excludeNodeId)
      return { point: snap ? snap.point : snapToGrid(point), snap }
    },
    [state],
  )

  const cancelDrawing = useCallback(() => {
    anchorRef.current = null
    setDraft(null)
  }, [])

  const onDown = useCallback(
    (point: Point) => {
      const node = findNodeAt(state, point)
      pressRef.current = { origin: point, nodeId: node?.id ?? null, moved: false }
    },
    [state],
  )

  const onMove = useCallback(
    (point: Point) => {
      const press = pressRef.current

      if (press && !press.moved) {
        const travelled = Math.hypot(point.x - press.origin.x, point.y - press.origin.y)
        if (travelled > DRAG_THRESHOLD && press.nodeId) {
          press.moved = true
          beginNodeDrag()
        }
      }

      if (press?.moved && press.nodeId) {
        updateNodePosition(press.nodeId, point)
        const snap = findSnapTarget(state, point, undefined, press.nodeId)
        setMoveSnap(snap?.type === 'node' ? snap : null)
        return
      }

      // Not dragging a corner: keep the rubber-band preview on the cursor.
      const anchor = anchorRef.current
      if (anchor) {
        const { point: end, snap } = resolve(point)
        setDraft({ start: anchor, current: end, snap })
      }
    },
    [state, beginNodeDrag, updateNodePosition, resolve],
  )

  const onUp = useCallback(
    (point: Point) => {
      const press = pressRef.current
      pressRef.current = null

      if (press?.moved && press.nodeId) {
        finalizeNodeMove(press.nodeId, point)
        setMoveSnap(null)
        return
      }

      // A click (no meaningful movement): place a point.
      const { point: placed } = resolve(point)
      const anchor = anchorRef.current

      if (anchor === null) {
        anchorRef.current = placed
        setDraft({ start: placed, current: placed, snap: null })
        return
      }

      addWall(anchor, placed)
      // Keep drawing from here, so a room is one continuous sequence of
      // clicks rather than a separate gesture per wall.
      anchorRef.current = placed
      setDraft({ start: placed, current: placed, snap: null })
    },
    [addWall, finalizeNodeMove, resolve],
  )

  return { draft, moveSnap, isDrawing: draft !== null, onDown, onMove, onUp, cancelDrawing }
}
