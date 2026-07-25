import type { RefObject } from 'react'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

extend({ OrbitControls })

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
  }
}

interface CameraControlsProps {
  controlsRef: RefObject<OrbitControls | null>
}

/**
 * Two-finger pinch/pan via three's OrbitControls, rotate disabled so it
 * stays a locked top-down view. `enabled` is toggled imperatively via
 * controlsRef (see DrawingCanvas) rather than as a React prop: a native
 * pointerdown reaches OrbitControls' own listener before a React state
 * update can re-render `enabled` into this instance, so gating it through
 * state alone lets the very first drag of a gesture slip through and skew
 * the camera mid-draw.
 */
export function CameraControls({ controlsRef }: CameraControlsProps) {
  const { camera, gl } = useThree()

  useFrame(() => controlsRef.current?.update())

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableRotate={false}
      minZoom={20}
      maxZoom={200}
    />
  )
}
