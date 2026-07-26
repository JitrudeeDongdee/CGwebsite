import type { DrawingState, DrawNode, DrawOpening, DrawWall, OpeningKind, Point } from './types'
import { GRID_SIZE, distance, findSnapTarget, snapToGrid } from './geometry'

export function createInitialState(): DrawingState {
  return { nodes: {}, walls: [], openings: [] }
}

function nextId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}

/**
 * Resolves a raw draw-endpoint into a node id: reuse an existing node/wall
 * joint if the point snaps to one (splitting the wall for a midpoint snap),
 * otherwise create a fresh node on the grid.
 */
function resolveEndpoint(
  state: DrawingState,
  point: Point,
  excludeNodeId?: string,
): { state: DrawingState; nodeId: string } {
  const snap = findSnapTarget(state, point, undefined, excludeNodeId)

  if (snap?.type === 'node') {
    return { state, nodeId: snap.nodeId }
  }

  if (snap?.type === 'wallMidpoint') {
    const wall = state.walls.find((w) => w.id === snap.wallId)!
    const newNode: DrawNode = { id: nextId('node'), ...snap.point }
    const firstHalf: DrawWall = { id: nextId('wall'), a: wall.a, b: newNode.id }
    const secondHalf: DrawWall = { id: nextId('wall'), a: newNode.id, b: wall.b }

    const walls = state.walls.filter((w) => w.id !== wall.id).concat(firstHalf, secondHalf)

    // The wall this opening sat on no longer exists, so hand each opening to
    // whichever half now contains it. One straddling the cut can't belong to
    // either and is dropped.
    const splitAt = distance(state.nodes[wall.a], snap.point)
    const openings = state.openings.flatMap((opening) => {
      if (opening.wallId !== wall.id) return [opening]
      if (opening.offset + opening.width / 2 <= splitAt) {
        return [{ ...opening, wallId: firstHalf.id }]
      }
      if (opening.offset - opening.width / 2 >= splitAt) {
        return [{ ...opening, wallId: secondHalf.id, offset: opening.offset - splitAt }]
      }
      return []
    })

    return {
      state: { nodes: { ...state.nodes, [newNode.id]: newNode }, walls, openings },
      nodeId: newNode.id,
    }
  }

  const grid = snapToGrid(point)
  const newNode: DrawNode = { id: nextId('node'), ...grid }
  return {
    state: { ...state, nodes: { ...state.nodes, [newNode.id]: newNode } },
    nodeId: newNode.id,
  }
}

/** Drops openings whose wall has gone away. */
function pruneOpenings(state: DrawingState): DrawingState {
  const wallIds = new Set(state.walls.map((wall) => wall.id))
  const openings = state.openings.filter((opening) => wallIds.has(opening.wallId))
  return openings.length === state.openings.length ? state : { ...state, openings }
}

export function commitWall(state: DrawingState, start: Point, end: Point): DrawingState {
  const startResolved = resolveEndpoint(state, start)
  const endResolved = resolveEndpoint(startResolved.state, end, startResolved.nodeId)

  if (startResolved.nodeId === endResolved.nodeId) {
    return endResolved.state
  }

  const wall: DrawWall = { id: nextId('wall'), a: startResolved.nodeId, b: endResolved.nodeId }
  return { ...endResolved.state, walls: [...endResolved.state.walls, wall] }
}

export function moveNode(state: DrawingState, nodeId: string, point: Point): DrawingState {
  const node = state.nodes[nodeId]
  if (!node) return state
  const snapped = snapToGrid(point)
  return {
    ...state,
    nodes: { ...state.nodes, [nodeId]: { ...node, x: snapped.x, y: snapped.y } },
  }
}

/**
 * Finalizes a node drag: if the release point lands on another existing
 * node, merges into it (every wall pointing at the dragged node is
 * re-pointed at the target, and the dragged node is dropped) instead of
 * leaving two nodes overlapping but disconnected. That merge is what lets
 * dragging one corner onto another actually close a wall loop.
 */
export function finishNodeMove(state: DrawingState, nodeId: string, point: Point): DrawingState {
  const moved = moveNode(state, nodeId, point)
  const target = findSnapTarget(moved, point, undefined, nodeId)

  if (target?.type !== 'node') {
    return moved
  }

  const targetId = target.nodeId
  const { [nodeId]: _removed, ...remainingNodes } = moved.nodes
  const walls = moved.walls
    .map((wall) => ({
      ...wall,
      a: wall.a === nodeId ? targetId : wall.a,
      b: wall.b === nodeId ? targetId : wall.b,
    }))
    .filter((wall) => wall.a !== wall.b)

  return pruneOpenings({ ...moved, nodes: remainingNodes, walls })
}

/**
 * Drops nodes no wall references any more. Without this, deleting walls
 * leaves invisible-but-real points behind that still attract snapping and
 * still count as geometry.
 */
function dropOrphanNodes(state: DrawingState): DrawingState {
  const used = new Set<string>()
  for (const wall of state.walls) {
    used.add(wall.a)
    used.add(wall.b)
  }

  const nodes: Record<string, DrawNode> = {}
  for (const [id, node] of Object.entries(state.nodes)) {
    if (used.has(id)) nodes[id] = node
  }
  return pruneOpenings({ ...state, nodes })
}

export function deleteWall(state: DrawingState, wallId: string): DrawingState {
  return dropOrphanNodes({
    ...state,
    walls: state.walls.filter((wall) => wall.id !== wallId),
  })
}

/** Removes a node along with every wall attached to it. */
export function deleteNode(state: DrawingState, nodeId: string): DrawingState {
  return dropOrphanNodes({
    ...state,
    walls: state.walls.filter((wall) => wall.a !== nodeId && wall.b !== nodeId),
  })
}

/**
 * Copies a wall offset by one grid step, as its own pair of fresh nodes so
 * the copy is independent of the original rather than sharing its corners.
 */
export function duplicateWall(state: DrawingState, wallId: string): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const offset = GRID_SIZE
  const newA: DrawNode = { id: nextId('node'), x: a.x + offset, y: a.y + offset }
  const newB: DrawNode = { id: nextId('node'), x: b.x + offset, y: b.y + offset }

  return {
    ...state,
    nodes: { ...state.nodes, [newA.id]: newA, [newB.id]: newB },
    walls: [...state.walls, { id: nextId('wall'), a: newA.id, b: newB.id }],
  }
}

/**
 * Places a door or window on the wall nearest `point`, centred where the
 * user clicked and clamped so it can't hang off either end.
 */
export function addOpening(
  state: DrawingState,
  wallId: string,
  offsetAlongWall: number,
  width: number,
  kind: OpeningKind,
): DrawingState {
  const wall = state.walls.find((w) => w.id === wallId)
  if (!wall) return state

  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  if (!a || !b) return state

  const wallLength = distance(a, b)
  // Leave the opening fully within the wall; too short a wall can't take it.
  if (wallLength <= width) return state

  const half = width / 2
  const offset = Math.min(Math.max(offsetAlongWall, half), wallLength - half)

  const opening: DrawOpening = { id: nextId('opening'), wallId, offset, width, kind }
  return { ...state, openings: [...state.openings, opening] }
}

export function deleteOpening(state: DrawingState, openingId: string): DrawingState {
  return { ...state, openings: state.openings.filter((o) => o.id !== openingId) }
}

/** Replaces the whole plan, e.g. when loading a starter template. */
export function loadPlan(plan: DrawingState): DrawingState {
  return { nodes: { ...plan.nodes }, walls: [...plan.walls], openings: [...plan.openings] }
}
