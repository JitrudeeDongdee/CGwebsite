import { useCallback, useMemo, useRef, useState } from 'react'
import type { DrawingState, Point } from './types'
import {
  addFloor as addFloorTo,
  createInitialFloors,
  floorIndex,
  mapFloor,
  removeFloor as removeFloorFrom,
  type Floors,
} from './floors'
import {
  addFixture,
  addOpening,
  commitWall,
  deleteNode,
  deleteFixture,
  deleteOpening,
  deleteWall,
  duplicateWall,
  finishNodeMove,
  loadPlan,
  moveFixture,
  moveNode,
  moveWall,
  finishWallMove,
  rotateFixture,
  setRoomLabel,
  setWallFinish,
  clearWallFinishes,
} from './state'
import type { FixtureKind, OpeningKind, Point as PointType, WallFinish } from './types'
import { findRooms } from './rooms'

interface History {
  past: Floors[]
  present: Floors
  future: Floors[]
}

const MAX_HISTORY = 50

function initialHistory(): History {
  return { past: [], present: createInitialFloors(), future: [] }
}

export function useDrawingState() {
  const [history, setHistory] = useState<History>(initialHistory)
  /**
   * Which storey is being edited. Kept OUT of the history on purpose:
   * switching floors is looking at the plan, not changing it, so it must not
   * cost an undo step — and undo must not teleport the editor to another
   * floor either. It is clamped on read, so undoing the addition of a floor
   * cannot leave it pointing past the end.
   */
  const [wantedFloor, setWantedFloor] = useState(0)

  /**
   * State as it was when the current node drag started. A drag fires
   * updateNodePosition on every pointer move; those are amendments to the
   * live state, not separate undo steps, so we hold the pre-drag state here
   * and push exactly one history entry when the drag finishes.
   */
  const dragOriginRef = useRef<Floors | null>(null)

  // Mirrors the live state so a native event handler can snapshot it
  // synchronously, without doing side effects inside a state updater.
  const presentRef = useRef(history.present)
  presentRef.current = history.present

  /** The storey being edited, clamped to one that exists. */
  const activeFloor = floorIndex(history.present, wantedFloor)
  // Read inside state updaters, which run after the render that set it, so
  // it cannot come from the closure (same reason as the refs above).
  const activeRef = useRef(activeFloor)
  activeRef.current = activeFloor

  /** Records a discrete, undoable change to the storey being edited. */
  const commit = useCallback((next: (prev: DrawingState) => DrawingState) => {
    setHistory((h) => {
      const past = [...h.past, h.present].slice(-MAX_HISTORY)
      return { past, present: mapFloor(h.present, activeRef.current, next), future: [] }
    })
  }, [])

  /** The same, for a change to the whole stack rather than one storey. */
  const commitStack = useCallback((next: (prev: Floors) => Floors) => {
    setHistory((h) => {
      const past = [...h.past, h.present].slice(-MAX_HISTORY)
      return { past, present: next(h.present), future: [] }
    })
  }, [])

  /** Updates the live state without creating an undo step. */
  const amend = useCallback((next: (prev: DrawingState) => DrawingState) => {
    setHistory((h) => ({ ...h, present: mapFloor(h.present, activeRef.current, next) }))
  }, [])

  const addWall = useCallback(
    (start: Point, end: Point, thickness?: number) =>
      commit((prev) => commitWall(prev, start, end, thickness)),
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
      const at = activeRef.current
      const origin = dragOriginRef.current ?? h.present
      dragOriginRef.current = null
      const stack = mapFloor(h.present, at, (floor) => finishNodeMove(floor, nodeId, point))

      // A drag that changed nothing (e.g. a plain click on a node)
      // shouldn't cost an undo step. Compare the actual geometry, not
      // object identity — these helpers always return fresh objects. Only
      // the edited storey can have changed, so only it is compared.
      const was = origin[floorIndex(origin, at)]
      const now = stack[floorIndex(stack, at)]
      const before = was.nodes[nodeId]
      const after = now.nodes[nodeId]
      const moved = !before || !after || before.x !== after.x || before.y !== after.y
      const mergedOrDropped =
        now.walls.length !== was.walls.length ||
        Object.keys(now.nodes).length !== Object.keys(was.nodes).length

      if (!moved && !mergedOrDropped) return { ...h, present: origin }

      return { past: [...h.past, origin].slice(-MAX_HISTORY), present: stack, future: [] }
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
  // Clears the whole house, not just the storey on screen — "ล้างทั้งหมด"
  // leaving an untouched floor upstairs would be a surprise.
  const clearAll = useCallback(() => commitStack(() => createInitialFloors()), [commitStack])

  const placeOpening = useCallback(
    (wallId: string, offset: number, width: number, kind: OpeningKind, tall?: boolean) =>
      commit((prev) => addOpening(prev, wallId, offset, width, kind, tall)),
    [commit],
  )
  const removeOpening = useCallback(
    (openingId: string) => commit((prev) => deleteOpening(prev, openingId)),
    [commit],
  )
  /** A template or an imported file replaces the whole stack. */
  const applyTemplate = useCallback(
    (plan: DrawingState | Floors) => {
      const stack = Array.isArray(plan) ? plan : [plan]
      commitStack(() => (stack.length > 0 ? stack.map(loadPlan) : createInitialFloors()))
      setWantedFloor(0)
    },
    [commitStack],
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
        const present = mapFloor(h.present, activeRef.current, (floor) =>
          moveFixture(floor, fixtureId, point),
        )
        if (!origin) return { ...h, present }
        return { past: [...h.past, origin].slice(-MAX_HISTORY), present, future: [] }
      })
    },
    [],
  )
  const dragWallBy = useCallback(
    (wallId: string, delta: PointType) => amend((prev) => moveWall(prev, wallId, delta)),
    [amend],
  )
  const finalizeWallMove = useCallback((wallId: string) => {
    const origin = dragOriginRef.current
    dragOriginRef.current = null
    setHistory((h) => {
      const present = mapFloor(h.present, activeRef.current, (floor) =>
        finishWallMove(floor, wallId),
      )
      if (!origin) return { ...h, present }
      return { past: [...h.past, origin].slice(-MAX_HISTORY), present, future: [] }
    })
  }, [])

  const paintWall = useCallback(
    (wallId: string, patch: WallFinish) =>
      commit((prev) => setWallFinish(prev, wallId, patch)),
    [commit],
  )
  const resetWallFinishes = useCallback(
    () => commit((prev) => clearWallFinishes(prev)),
    [commit],
  )

  const nameRoom = useCallback(
    (point: PointType, name: string, existingId?: string) =>
      commit((prev) => setRoomLabel(prev, point, name, existingId)),
    [commit],
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

  const floors = history.present
  const state = floors[activeFloor]

  const addFloor = useCallback(() => {
    // The new storey copies the one you are standing on, then opens on it:
    // adding a floor and being left looking at the old one is a dead end.
    commitStack((stack) => addFloorTo(stack, activeRef.current))
    setWantedFloor((n) => n + 1)
  }, [commitStack])

  const removeFloor = useCallback(() => {
    commitStack((stack) => removeFloorFrom(stack, activeRef.current))
    setWantedFloor((n) => Math.max(0, n - 1))
  }, [commitStack])

  const selectFloor = useCallback((index: number) => setWantedFloor(index), [])

  // Every enclosed room of every storey. Per floor, so the editor can report
  // the storey on screen while the price is quoted on the whole house.
  const perFloor = useMemo(() => floors.map((floor) => findRooms(floor)), [floors])
  const plan = perFloor[activeFloor]
  const roomArea = plan.rooms.length > 0 ? plan.totalArea : null
  /** Summed over every storey — what the house costs to build. */
  const totalArea = useMemo(() => {
    const sum = perFloor.reduce((runningTotal, one) => runningTotal + one.totalArea, 0)
    return sum > 0 ? sum : null
  }, [perFloor])
  /** Each storey's plan paired with its own exterior walls, for the 3D view. */
  const floorPlans = useMemo(
    () => floors.map((floor, i) => ({ state: floor, exteriorWallIds: perFloor[i].exteriorWallIds })),
    [floors, perFloor],
  )

  return {
    state,
    floors,
    floorPlans,
    floorCount: floors.length,
    activeFloor,
    selectFloor,
    addFloor,
    removeFloor,
    /** The storey below the one being edited, to trace over. */
    floorBelow: activeFloor > 0 ? floors[activeFloor - 1] : null,
    roomArea,
    totalArea,
    floorAreas: perFloor.map((one) => (one.rooms.length > 0 ? one.totalArea : null)),
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
    dragWallBy,
    finalizeWallMove,
    nameRoom,
    paintWall,
    resetWallFinishes,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
