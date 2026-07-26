import { useEffect, type RefObject } from 'react'
import * as THREE from 'three'
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

  // Arrow-key panning. OrbitControls' own key handling was removed in
  // recent three versions, so the camera and its target are shifted directly.
  useEffect(() => {
    const STEP = 0.6

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      const delta = { x: 0, y: 0 }
      if (event.key === 'ArrowLeft') delta.x = -STEP
      else if (event.key === 'ArrowRight') delta.x = STEP
      else if (event.key === 'ArrowUp') delta.y = -STEP
      else if (event.key === 'ArrowDown') delta.y = STEP
      else return

      event.preventDefault()
      // Keep the step constant on screen regardless of zoom level.
      const scale = 60 / (camera as THREE.OrthographicCamera).zoom
      camera.position.x += delta.x * scale
      camera.position.z += delta.y * scale

      const controls = controlsRef.current
      if (controls) {
        controls.target.x += delta.x * scale
        controls.target.z += delta.y * scale
        controls.update()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [camera, controlsRef])

  useFrame(() => controlsRef.current?.update())

  return (
    <orbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableRotate={false}
      // Left-drag pans; our own tools claim the pointer first and switch
      // controls off, so this only fires on empty-canvas drags.
      mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
      screenSpacePanning
      minZoom={8}
      maxZoom={200}
    />
  )
}
