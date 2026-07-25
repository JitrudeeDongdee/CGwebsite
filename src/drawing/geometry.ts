import type { DrawingState, DrawWall, Point, SnapTarget } from './types'

export const GRID_SIZE = 0.5
export const SNAP_THRESHOLD = 0.35
export const NODE_VISUAL_RADIUS = 0.07
export const NODE_HIT_RADIUS = 0.35

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function snapToGrid(p: Point, size = GRID_SIZE): Point {
  return { x: Math.round(p.x / size) * size, y: Math.round(p.y / size) * size }
}

export function wallMidpoint(wall: DrawWall, state: DrawingState): Point {
  const a = state.nodes[wall.a]
  const b = state.nodes[wall.b]
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Finds the nearest existing node or wall-midpoint within threshold, so a
 * dragged wall endpoint can join existing geometry as the same joint.
 */
export function findSnapTarget(
  state: DrawingState,
  point: Point,
  threshold: number = SNAP_THRESHOLD,
  excludeNodeId?: string,
): SnapTarget | null {
  let best: SnapTarget | null = null
  let bestDist = threshold

  for (const node of Object.values(state.nodes)) {
    if (node.id === excludeNodeId) continue
    const d = distance(point, node)
    if (d < bestDist) {
      bestDist = d
      best = { type: 'node', nodeId: node.id, point: { x: node.x, y: node.y } }
    }
  }

  for (const wall of state.walls) {
    if (wall.a === excludeNodeId || wall.b === excludeNodeId) continue
    const mid = wallMidpoint(wall, state)
    const d = distance(point, mid)
    if (d < bestDist) {
      bestDist = d
      best = { type: 'wallMidpoint', wallId: wall.id, point: mid }
    }
  }

  return best
}

export function polygonArea(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(sum) / 2
}

/**
 * Finds one simple cycle in the undirected wall graph via DFS back-edge
 * detection. Good enough for the spike's single-room case; multi-room face
 * detection is out of scope.
 */
export function findClosedLoop(state: DrawingState): string[] | null {
  const adjacency = new Map<string, string[]>()
  for (const wall of state.walls) {
    if (!adjacency.has(wall.a)) adjacency.set(wall.a, [])
    if (!adjacency.has(wall.b)) adjacency.set(wall.b, [])
    adjacency.get(wall.a)!.push(wall.b)
    adjacency.get(wall.b)!.push(wall.a)
  }

  const visited = new Set<string>()

  function dfs(nodeId: string, parent: string | null, path: string[]): string[] | null {
    visited.add(nodeId)
    path.push(nodeId)
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (neighbor === parent) continue
      const idx = path.indexOf(neighbor)
      if (idx !== -1) {
        return path.slice(idx)
      }
      if (!visited.has(neighbor)) {
        const result = dfs(neighbor, nodeId, path)
        if (result) return result
      }
    }
    path.pop()
    return null
  }

  for (const nodeId of adjacency.keys()) {
    if (!visited.has(nodeId)) {
      const loop = dfs(nodeId, null, [])
      if (loop) return loop
    }
  }
  return null
}
