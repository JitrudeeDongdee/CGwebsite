import { useCallback, useRef, useState } from 'react'
import type { DrawingState, FixtureKind, OpeningKind, Point, SnapTarget } from '../drawing/types'
import { findNodeAt, findSnapTarget, findWallAt, snapToGrid } from '../drawing/geometry'
import { offsetAlongWall } from '../drawing/openings'
import { findFixtureAt } from '../drawing/fixtures'
import type { ToolMode } from '../drawing/tools'

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
  /** Set when the press landed on a fixture instead of a corner. */
  fixtureId: string | null
  moved: boolean
}

interface UseInteractionOptions {
  state: DrawingState
  addWall: (start: Point, end: Point) => void
  beginNodeDrag: () => void
  updateNodePosition: (nodeId: string, point: Point) => void
  finalizeNodeMove: (nodeId: string, point: Point) => void
  /** What a click means: move only, draw walls, or place an opening. */
  tool: ToolMode
  placeOpening: (wallId: string, offset: number, width: number, kind: OpeningKind) => void
  placeFixture: (kind: FixtureKind, point: Point) => void
  updateFixturePosition: (fixtureId: string, point: Point) => void
  finalizeFixtureMove: (fixtureId: string, point: Point) => void
}

/**
 * Drafting-style input, matching how CAD/floor-plan tools behave:
 *
 * - click on empty space or a corner  -> anchor the start of a wall
 * - move                              -> rubber-band preview follows cursor
 * - click again                       -> place that wall and end the gesture,
 *                                        so nothing trails the cursor after
 * - Escape / right-click              -> cancel a wall that was started
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
  tool,
  placeOpening,
  placeFixture,
  updateFixturePosition,
  finalizeFixtureMove,
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

  /**
   * Returns whether a wall was actually in progress. Always clears both the
   * anchor and the preview — never early-returns on one of them — so the two
   * can't drift into a state where a stale anchor survives with no visible
   * preview (or vice versa).
   */
  const cancelDrawing = useCallback(() => {
    const wasDrawing = anchorRef.current !== null
    anchorRef.current = null
    setDraft(null)
    return wasDrawing
  }, [])

  const onDown = useCallback(
    (point: Point) => {
      const node = findNodeAt(state, point)
      // Corners win over fixtures: they're smaller and harder to hit.
      const fixture = node ? null : findFixtureAt(state.fixtures, point)
      pressRef.current = {
        origin: point,
        nodeId: node?.id ?? null,
        fixtureId: fixture?.id ?? null,
        moved: false,
      }
    },
    [state],
  )

  const onMove = useCallback(
    (point: Point) => {
      const press = pressRef.current

      if (press && !press.moved) {
        const travelled = Math.hypot(point.x - press.origin.x, point.y - press.origin.y)
        if (travelled > DRAG_THRESHOLD && (press.nodeId || press.fixtureId)) {
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

      if (press?.moved && press.fixtureId) {
        updateFixturePosition(press.fixtureId, point)
        return
      }

      // Not dragging a corner: keep the rubber-band preview on the cursor.
      // Suppressed while placing an opening — clicks mean "drop it here".
      const anchor = anchorRef.current
      if (anchor && tool.type === 'draw') {
        const { point: end, snap } = resolve(point)
        setDraft({ start: anchor, current: end, snap })
      }
    },
    [state, beginNodeDrag, updateNodePosition, updateFixturePosition, resolve, tool],
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

      if (press?.moved && press.fixtureId) {
        finalizeFixtureMove(press.fixtureId, point)
        return
      }

      if (tool.type === 'fixture') {
        placeFixture(tool.kind, snapToGrid(point))
        return
      }

      // With a door/window selected, a click drops it on the wall under the
      // cursor rather than drawing.
      if (tool.type === 'opening') {
        const wall = findWallAt(state, point)
        if (wall) {
          const offset = offsetAlongWall(state, wall.id, point)
          if (offset !== null) {
            placeOpening(wall.id, offset, tool.width, tool.kind)
          }
        }
        return
      }

      // Select mode moves existing geometry and never creates any.
      if (tool.type !== 'draw') return

      // A click (no meaningful movement): place a point.
      const { point: placed } = resolve(point)
      const anchor = anchorRef.current

      if (anchor === null) {
        anchorRef.current = placed
        setDraft({ start: placed, current: placed, snap: null })
        return
      }

      // One wall per pair of clicks: placing it ends the gesture, so the
      // preview stops following the cursor until you start the next wall.
      addWall(anchor, placed)
      anchorRef.current = null
      setDraft(null)
    },
    [
      addWall,
      finalizeNodeMove,
      finalizeFixtureMove,
      placeFixture,
      resolve,
      state,
      tool,
      placeOpening,
    ],
  )

  return { draft, moveSnap, isDrawing: draft !== null, onDown, onMove, onUp, cancelDrawing }
}
