import type { DrawingState, DrawNode, DrawWall, Point } from './types'
import { findSnapTarget, snapToGrid } from './geometry'

export function createInitialState(): DrawingState {
  return { nodes: {}, walls: [] }
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
    const walls = state.walls
      .filter((w) => w.id !== wall.id)
      .concat(
        { id: nextId('wall'), a: wall.a, b: newNode.id },
        { id: nextId('wall'), a: newNode.id, b: wall.b },
      )
    return {
      state: { nodes: { ...state.nodes, [newNode.id]: newNode }, walls },
      nodeId: newNode.id,
    }
  }

  const grid = snapToGrid(point)
  const newNode: DrawNode = { id: nextId('node'), ...grid }
  return {
    state: { nodes: { ...state.nodes, [newNode.id]: newNode }, walls: state.walls },
    nodeId: newNode.id,
  }
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
