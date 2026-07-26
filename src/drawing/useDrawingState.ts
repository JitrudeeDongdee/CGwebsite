import { useCallback, useMemo, useRef, useState } from 'react'
import type { DrawingState, Point } from './types'
import {
  addFixture,
  addOpening,
  commitWall,
  createInitialState,
  deleteNode,
  deleteFixture,
  deleteOpening,
  deleteWall,
  duplicateWall,
  finishNodeMove,
  loadPlan,
  moveFixture,
  moveNode,
  rotateFixture,
} from './state'
import type { FixtureKind, OpeningKind, Point as PointType } from './types'
import { findRooms } from './rooms'

interface History {
  past: DrawingState[]
  present: DrawingState
  future: DrawingState[]
}

const MAX_HISTORY = 50

function initialHistory(): History {
  return { past: [], present: createInitialState(), future: [] }
}

export function useDrawingState() {
  const [history, setHistory] = useState<History>(initialHistory)

  /**
   * State as it was when the current node drag started. A drag fires
   * updateNodePosition on every pointer move; those are amendments to the
   * live state, not separate undo steps, so we hold the pre-drag state here
   * and push exactly one history entry when the drag finishes.
   */
  const dragOriginRef = useRef<DrawingState | null>(null)

  // Mirrors the live state so a native event handler can snapshot it
  // synchronously, without doing side effects inside a state updater.
  const presentRef = useRef(history.present)
  presentRef.current = history.present

  /** Records a discrete, undoable change. */
  const commit = useCallback((next: (prev: DrawingState) => DrawingState) => {
    setHistory((h) => {
      const past = [...h.past, h.present].slice(-MAX_HISTORY)
      return { past, present: next(h.present), future: [] }
    })
  }, [])

  /** Updates the live state without creating an undo step. */
  const amend = useCallback((next: (prev: DrawingState) => DrawingState) => {
    setHistory((h) => ({ ...h, present: next(h.present) }))
  }, [])

  const addWall = useCallback(
    (start: Point, end: Point) => commit((prev) => commitWall(prev, start, end)),
    [commit],
  )

  const beginNodeDrag = useCallback(() => {
    dragOriginRef.current = presentRef.current
  }, [])

  const updateNodePosition = useCallback(
    (nodeId: string, point: Point) => amend((prev) => moveNode(prev, nodeId, point)),
    [amend],
  )

  const finalizeNodeMove = useCallback((nodeId: string, point: Point) => {
    setHistory((h) => {
      const origin = dragOriginRef.current ?? h.present
      dragOriginRef.current = null
      const present = finishNodeMove(h.present, nodeId, point)

      // A drag that changed nothing (e.g. a plain click on a node)
      // shouldn't cost an undo step. Compare the actual geometry, not
      // object identity — these helpers always return fresh objects.
      const before = origin.nodes[nodeId]
      const after = present.nodes[nodeId]
      const moved = !before || !after || before.x !== after.x || before.y !== after.y
      const mergedOrDropped =
        present.walls.length !== origin.walls.length ||
        Object.keys(present.nodes).length !== Object.keys(origin.nodes).length

      if (!moved && !mergedOrDropped) return { ...h, present: origin }

      return { past: [...h.past, origin].slice(-MAX_HISTORY), present, future: [] }
    })
  }, [])

  const removeWall = useCallback(
    (wallId: string) => commit((prev) => deleteWall(prev, wallId)),
    [commit],
  )
  const removeNode = useCallback(
    (nodeId: string) => commit((prev) => deleteNode(prev, nodeId)),
    [commit],
  )
  const copyWall = useCallback(
    (wallId: string) => commit((prev) => duplicateWall(prev, wallId)),
    [commit],
  )
  const clearAll = useCallback(() => commit(() => createInitialState()), [commit])

  const placeOpening = useCallback(
    (wallId: string, offset: number, width: number, kind: OpeningKind) =>
      commit((prev) => addOpening(prev, wallId, offset, width, kind)),
    [commit],
  )
  const removeOpening = useCallback(
    (openingId: string) => commit((prev) => deleteOpening(prev, openingId)),
    [commit],
  )
  const applyTemplate = useCallback(
    (plan: DrawingState) => commit(() => loadPlan(plan)),
    [commit],
  )

  const placeFixture = useCallback(
    (kind: FixtureKind, point: PointType) => commit((prev) => addFixture(prev, kind, point)),
    [commit],
  )
  const updateFixturePosition = useCallback(
    (fixtureId: string, point: PointType) =>
      amend((prev) => moveFixture(prev, fixtureId, point)),
    [amend],
  )
  const finalizeFixtureMove = useCallback(
    (fixtureId: string, point: PointType) => {
      const origin = dragOriginRef.current
      dragOriginRef.current = null
      setHistory((h) => {
        const present = moveFixture(h.present, fixtureId, point)
        if (!origin) return { ...h, present }
        return { past: [...h.past, origin].slice(-MAX_HISTORY), present, future: [] }
      })
    },
    [],
  )
  const turnFixture = useCallback(
    (fixtureId: string) => commit((prev) => rotateFixture(prev, fixtureId)),
    [commit],
  )
  const removeFixture = useCallback(
    (fixtureId: string) => commit((prev) => deleteFixture(prev, fixtureId)),
    [commit],
  )

  const undo = useCallback(() => {
    setHistory((h) => {
      const previous = h.past.at(-1)
      if (previous === undefined) return h
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((h) => {
      const [next, ...rest] = h.future
      if (next === undefined) return h
      return { past: [...h.past, h.present], present: next, future: rest }
    })
  }, [])

  const state = history.present

  // Every enclosed room, so a plan with interior partitions reports the sum
  // of its rooms rather than whichever single loop happened to be found.
  const plan = useMemo(() => findRooms(state), [state])
  const roomArea = plan.rooms.length > 0 ? plan.totalArea : null

  return {
    state,
    roomArea,
    rooms: plan.rooms,
    exteriorWallIds: plan.exteriorWallIds,
    addWall,
    beginNodeDrag,
    updateNodePosition,
    finalizeNodeMove,
    removeWall,
    removeNode,
    copyWall,
    clearAll,
    placeOpening,
    removeOpening,
    applyTemplate,
    placeFixture,
    updateFixturePosition,
    finalizeFixtureMove,
    turnFixture,
    removeFixture,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
