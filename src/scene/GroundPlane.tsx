import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Point } from '../drawing/types'

interface GroundPlaneProps {
  onDown: (point: Point) => void
  onMove: (point: Point) => void
  onUp: (point: Point) => void
  onContextMenu: (point: Point, screen: { x: number; y: number }) => void
}

function toPoint(e: ThreeEvent<PointerEvent | MouseEvent>): Point {
  return { x: e.point.x, y: e.point.z }
}

/**
 * The single input surface: every pointer event (mouse or touch, R3F
 * normalizes both the same way) lands here as one {x, y} point in floor-plan
 * space.
 */
export function GroundPlane({ onDown, onMove, onUp, onContextMenu }: GroundPlaneProps) {
  const capturedId = useRef<number | null>(null)

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        // Only the primary button draws; right-click opens the menu.
        if (e.button !== 0) return
        e.stopPropagation()
        ;(e.nativeEvent.target as Element).setPointerCapture(e.pointerId)
        capturedId.current = e.pointerId
        onDown(toPoint(e))
      }}
      // Unconditional: with click-to-place drawing, the rubber-band preview
      // has to track the cursor while no button is held.
      onPointerMove={(e) => onMove(toPoint(e))}
      onPointerUp={(e) => {
        if (capturedId.current === null) return
        capturedId.current = null
        onUp(toPoint(e))
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
        e.nativeEvent.preventDefault()
        onContextMenu(toPoint(e), { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
