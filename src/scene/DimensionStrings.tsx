import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import { useTheme } from '@mui/material/styles'
import type { DrawingState } from '../drawing/types'

/** How far outside the building the dimension line sits, in metres. */
const OFFSET = 1.0
/** Extension lines run from the building out slightly past the dimension line. */
const EXTENSION_OVERSHOOT = 0.2
const LINE_WIDTH = 0.02
const TICK_LENGTH = 0.18
const HEIGHT = 0.03

interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function Bar({
  from,
  to,
  color,
  width = LINE_WIDTH,
}: {
  from: [number, number]
  to: [number, number]
  color: string
  width?: number
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  if (length === 0) return null

  return (
    <mesh
      position={[(from[0] + to[0]) / 2, HEIGHT, (from[1] + to[1]) / 2]}
      rotation={[-Math.PI / 2, 0, -Math.atan2(dy, dx)]}
    >
      <planeGeometry args={[length, width]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * One overall dimension: the line itself, an extension line at each end
 * reaching back to the building, 45° ticks where they cross, and the measured
 * length as text sitting on the line.
 */
function DimensionRun({
  start,
  end,
  /** Unit vector pointing from the building towards the dimension line. */
  away,
  color,
}: {
  start: [number, number]
  end: [number, number]
  away: [number, number]
  color: string
}) {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1])
  if (length < 0.01) return null

  const lineStart: [number, number] = [start[0] + away[0] * OFFSET, start[1] + away[1] * OFFSET]
  const lineEnd: [number, number] = [end[0] + away[0] * OFFSET, end[1] + away[1] * OFFSET]

  const overshoot = OFFSET + EXTENSION_OVERSHOOT
  const extensionEnds: [number, number][] = [
    [start[0] + away[0] * overshoot, start[1] + away[1] * overshoot],
    [end[0] + away[0] * overshoot, end[1] + away[1] * overshoot],
  ]

  // Ticks are drawn at 45° to the dimension line, the drafting convention.
  const dirX = (end[0] - start[0]) / length
  const dirY = (end[1] - start[1]) / length
  const tickX = (dirX + away[0]) * TICK_LENGTH
  const tickY = (dirY + away[1]) * TICK_LENGTH

  const mid: [number, number] = [(lineStart[0] + lineEnd[0]) / 2, (lineStart[1] + lineEnd[1]) / 2]

  let textAngle = Math.atan2(dirY, dirX)
  if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) textAngle += Math.PI

  return (
    <>
      <Bar from={lineStart} to={lineEnd} color={color} />

      <Bar from={start} to={extensionEnds[0]} color={color} width={LINE_WIDTH * 0.6} />
      <Bar from={end} to={extensionEnds[1]} color={color} width={LINE_WIDTH * 0.6} />

      <Bar
        from={[lineStart[0] - tickX / 2, lineStart[1] - tickY / 2]}
        to={[lineStart[0] + tickX / 2, lineStart[1] + tickY / 2]}
        color={color}
      />
      <Bar
        from={[lineEnd[0] - tickX / 2, lineEnd[1] - tickY / 2]}
        to={[lineEnd[0] + tickX / 2, lineEnd[1] + tickY / 2]}
        color={color}
      />

      <Text
        position={[mid[0] + away[0] * 0.28, 0.3, mid[1] + away[1] * 0.28]}
        rotation={[-Math.PI / 2, 0, -textAngle]}
        fontSize={0.26}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {length.toFixed(2)}
      </Text>
    </>
  )
}

function boundsOf(state: DrawingState): BoundingBox | null {
  const nodes = Object.values(state.nodes)
  if (nodes.length < 2 || state.walls.length === 0) return null

  return nodes.reduce<BoundingBox>(
    (box, node) => ({
      minX: Math.min(box.minX, node.x),
      maxX: Math.max(box.maxX, node.x),
      minY: Math.min(box.minY, node.y),
      maxY: Math.max(box.maxY, node.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )
}

/**
 * Overall width and depth of the building, dimensioned outside the plan —
 * the drafting convention of keeping overall dimensions clear of the drawing
 * rather than on top of it.
 */
export function DimensionStrings({ state }: { state: DrawingState }) {
  const { scene } = useTheme()
  const bounds = useMemo(() => boundsOf(state), [state])

  if (!bounds) return null

  const { minX, maxX, minY, maxY } = bounds
  if (maxX - minX < 0.01 || maxY - minY < 0.01) return null

  return (
    <>
      {/* Width, below the plan. */}
      <DimensionRun
        start={[minX, maxY]}
        end={[maxX, maxY]}
        away={[0, 1]}
        color={scene.dimension}
      />
      {/* Depth, to the left of the plan. */}
      <DimensionRun
        start={[minX, maxY]}
        end={[minX, minY]}
        away={[-1, 0]}
        color={scene.dimension}
      />
    </>
  )
}
