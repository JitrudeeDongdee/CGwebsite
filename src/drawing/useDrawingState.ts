import { useCallback, useMemo, useState } from 'react'
import type { Point } from './types'
import { commitWall, createInitialState, finishNodeMove, moveNode } from './state'
import { findClosedLoop, polygonArea } from './geometry'

export function useDrawingState() {
  const [state, setState] = useState(createInitialState)

  const addWall = useCallback((start: Point, end: Point) => {
    setState((prev) => commitWall(prev, start, end))
  }, [])

  const updateNodePosition = useCallback((nodeId: string, point: Point) => {
    setState((prev) => moveNode(prev, nodeId, point))
  }, [])

  const finalizeNodeMove = useCallback((nodeId: string, point: Point) => {
    setState((prev) => finishNodeMove(prev, nodeId, point))
  }, [])

  const roomArea = useMemo(() => {
    const loop = findClosedLoop(state)
    if (!loop) return null
    return polygonArea(loop.map((id) => state.nodes[id]))
  }, [state])

  return { state, addWall, updateNodePosition, finalizeNodeMove, roomArea }
}
