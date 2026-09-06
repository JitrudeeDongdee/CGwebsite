import { Text } from '@react-three/drei'
import { useTheme } from '@mui/material/styles'
import type { Point } from '../drawing/types'

interface DimensionLabelProps {
  a: Point
  b: Point
  /** Draft labels sit slightly higher and use the draft colour. */
  variant?: 'placed' | 'draft'
}

/**
 * Length of a wall, drawn alongside it the way a floor plan annotates
 * dimensions: parallel to the wall, offset just off it, and always reading
 * left-to-right (never upside down).
 *
 * Shows the bare number rather than "4.50 m" — the unit is stated once in
 * the side panel, and keeping the label numeric avoids depending on a font
 * that covers Thai glyphs inside the WebGL canvas.
 */
export function DimensionLabel({ a, b, variant = 'placed' }: DimensionLabelProps) {
  const { scene } = useTheme()

  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length < 0.01) return null

  let angle = Math.atan2(dy, dx)
  // Keep text upright: flip any angle that would render it mirrored.
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI

  // Offset perpendicular to the wall so the number sits beside, not on it.
  const offset = 0.22
  const nx = -dy / length
  const ny = dx / length

  const midX = (a.x + b.x) / 2 + nx * offset
  const midY = (a.y + b.y) / 2 + ny * offset

  return (
    <Text
      position={[midX, 0.3, midY]}
      rotation={[-Math.PI / 2, 0, -angle]}
      fontSize={0.22}
      color={variant === 'draft' ? scene.draft : scene.dimension}
      anchorX="center"
      anchorY="middle"
    >
      {length.toFixed(2)}
    </Text>
  )
}
