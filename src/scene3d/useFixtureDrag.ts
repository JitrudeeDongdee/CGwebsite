import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { Point } from '../drawing/types'

/**
 * Dragging furniture in the 3D view.
 *
 * The piece is grabbed where the pointer actually hit it and then slid along
 * the HORIZONTAL PLANE THROUGH THAT HIT, so it tracks the cursor at the
 * height it was grabbed rather than jumping to the floor or the camera's
 * idea of depth. The plane is taken from the hit itself, which means this
 * needs to know nothing about the scene's offsets — the recentring group,
 * the raised floor and the storey height all drop out.
 *
 * Plan coordinates and world coordinates differ by a constant translation
 * and nothing else, so the DELTA in world x/z is the delta in plan x/y. That
 * is why no mapping between the two is needed either.
 */
export interface FixtureDrag {
  /** Call from a piece's `onPointerDown`. */
  grab: (event: ThreeEvent<PointerEvent>, fixtureId: string, at: Point) => void
  /** True while something is being dragged — the cursor reads it. */
  isDragging: () => boolean
}

export function useFixtureDrag({
  onStart,
  onMove,
  onDrop,
  orbit,
}: {
  /** Snapshot the state so the whole drag is one undo step. */
  onStart: () => void
  /** Every pointer move: live position, no undo entry. */
  onMove: (fixtureId: string, point: Point) => void
  /** Pointer up: commit the move as a single undo step. */
  onDrop: (fixtureId: string, point: Point) => void
  /** The controls to switch off while dragging, mutated through the ref. */
  orbit: React.RefObject<{ enabled: boolean } | null>
}): FixtureDrag {
  const { camera, gl, raycaster } = useThree()

  // Everything the native move/up handlers read is a ref: they fire during
  // the same gesture that writes it, and a state update would not be visible
  // to the next event (the race documented in MEMORY.md).
  const drag = useRef<{
    id: string
    /** Where the piece was, in plan metres, when it was grabbed. */
    from: Point
    /** Where the ray met the plane at that moment, in world metres. */
    hit: { x: number; z: number }
    /** Last point handed out, so pointer-up commits exactly what was shown. */
    last: Point
  } | null>(null)

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  /** Where the pointer meets the drag plane, in world metres. */
  const planePoint = useCallback(
    (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null
    },
    [camera, gl, ndc, plane, raycaster, hit],
  )

  const grab = useCallback(
    (event: ThreeEvent<PointerEvent>, fixtureId: string, at: Point) => {
      // Or the orbit spins the camera while the piece is being dragged.
      event.stopPropagation()
      // Imperative, in this same synchronous handler: OrbitControls listens to
      // native pointer events of its own, so a React prop set here would not
      // reach it before its own listener saw the first move (MEMORY.md).
      if (orbit.current) orbit.current.enabled = false
      gl.domElement.style.cursor = 'grabbing'

      // The plane through the point that was actually grabbed.
      plane.constant = -event.point.y
      drag.current = {
        id: fixtureId,
        from: at,
        hit: { x: event.point.x, z: event.point.z },
        last: at,
      }
      onStart()
    },
    [gl, onStart, orbit, plane],
  )

  useEffect(() => {
    const element = gl.domElement

    const move = (event: PointerEvent) => {
      const state = drag.current
      if (!state) return
      const point = planePoint(event)
      if (!point) return
      const next = {
        x: state.from.x + (point.x - state.hit.x),
        y: state.from.y + (point.z - state.hit.z),
      }
      state.last = next
      onMove(state.id, next)
    }

    const end = () => {
      const state = drag.current
      // These listeners see EVERY release on the page, so a release that was
      // not a drag must change nothing: clearing the cursor here would drop
      // the grab hand while the pointer is still resting on a piece.
      if (!state) return
      drag.current = null
      if (orbit.current) orbit.current.enabled = true
      element.style.cursor = ''
      onDrop(state.id, state.last)
    }

    // All three on the WINDOW, not the canvas: a drag that leaves the canvas
    // would otherwise freeze until the pointer came back, and one released
    // outside would never commit — leaving the camera switched off. Moves are
    // free when nothing is being dragged, since `move` returns immediately.
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    // What a touch gets when the browser takes the gesture over.
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [gl, onDrop, onMove, orbit, planePoint])

  const isDragging = useCallback(() => drag.current !== null, [])

  return { grab, isDragging }
}
