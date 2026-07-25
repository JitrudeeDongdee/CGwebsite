import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Point } from '../drawing/types'

interface GroundPlaneProps {
  onDown: (point: Point) => void
  onMove: (point: Point) => void
  onUp: (point: Point) => void
}

function toPoint(e: ThreeEvent<PointerEvent>): Point {
  return { x: e.point.x, y: e.point.z }
}

/**
 * The single input surface: every pointerdown/move/up (mouse or touch, R3F
 * normalizes both the same way) lands here as one {x, y} point in floor-plan
 * space. Pointer capture keeps move events flowing to this mesh even once
 * the drag is no longer directly over it.
 */
export function GroundPlane({ onDown, onMove, onUp }: GroundPlaneProps) {
  const capturedId = useRef<number | null>(null)

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation()
        ;(e.target as Element).setPointerCapture(e.pointerId)
        capturedId.current = e.pointerId
        onDown(toPoint(e))
      }}
      onPointerMove={(e) => {
        if (capturedId.current === null) return
        onMove(toPoint(e))
      }}
      onPointerUp={(e) => {
        if (capturedId.current === null) return
        capturedId.current = null
        onUp(toPoint(e))
      }}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
