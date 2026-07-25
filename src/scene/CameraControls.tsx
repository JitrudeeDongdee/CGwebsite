import { useRef } from 'react'
import { extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

extend({ OrbitControls })

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
  }
}

interface CameraControlsProps {
  enabled: boolean
}

/**
 * Two-finger pinch/pan via three's OrbitControls, rotate disabled so it
 * stays a locked top-down view. Rotate being off makes single-finger drag a
 * no-op here, leaving that gesture free for our own node/wall dragging.
 */
export function CameraControls({ enabled }: CameraControlsProps) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls>(null)

  useFrame(() => controlsRef.current?.update())

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enabled={enabled}
      enableRotate={false}
      minZoom={20}
      maxZoom={200}
    />
  )
}
