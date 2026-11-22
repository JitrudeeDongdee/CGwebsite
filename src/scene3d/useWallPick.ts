import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import type { Point } from '../drawing/types'

/**
 * Clicking a wall in the 3D view.
 *
 * ⚠️ This raycasts the scene ITSELF rather than hanging r3f's `onPointerDown`
 * on each wall mesh, and that is a design choice, not a workaround. r3f only
 * hit-tests objects that carry handlers, so with handlers on the walls alone
 * the roof, the glazing and the furniture would not occlude them: a click on
 * the roof would paint the wall hidden behind it, and a click on a window
 * would paint the wall it is set into. Casting against the whole scene and
 * insisting the NEAREST VISIBLE surface is a wall gets both right for free —
 * what you cannot see, you cannot brush.
 *
 * The hit is a point on the wall's own face, so `offsetAlongWall` gets the
 * place that was actually clicked. An invisible floor-level pick plane (the
 * mechanism the fixture palette uses) cannot: from the ~15 degree exterior
 * camera the ray crosses the floor several metres BEHIND the face, which for
 * a band of cladding is the difference between the right wall and the next
 * one along.
 */
export interface WallHit {
  wallId: string
  /** Where on the wall, in plan metres. */
  point: Point
}

/** How far the pointer may travel and still count as a click, not an orbit. */
const CLICK_SLOP = 5

/**
 * Visible all the way up to the scene.
 *
 * three.js raycasting ignores `visible` entirely, so the cutaway's hidden
 * near walls are still hit — and in that view they are exactly the walls
 * standing between the camera and the one being aimed at.
 */
function onScreen(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object
  while (node) {
    if (!node.visible) return false
    node = node.parent
  }
  const material = (object as THREE.Mesh).material
  if (material && !Array.isArray(material) && material.visible === false) return false
  return true
}

export function useWallPick({
  centre,
  activeFloor,
  onPick,
}: {
  /** The scene is drawn inside a group translated by -centre. */
  centre: [number, number, number]
  /** Only this storey's walls answer: an edit is applied to its plan. */
  activeFloor: number
  onPick: (hit: WallHit) => void
}): void {
  const { camera, gl, raycaster, scene } = useThree()

  // Read inside native handlers that fire during the same gesture that wrote
  // them, so refs rather than state (the race documented in MEMORY.md).
  const down = useRef<{ x: number; y: number } | null>(null)
  const latest = useRef({ centre, activeFloor, onPick })
  latest.current = { centre, activeFloor, onPick }

  const ndc = useMemo(() => new THREE.Vector2(), [])

  const pick = useCallback(
    (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)

      // Sorted near to far by three.js already; the first one you can
      // actually see is the surface that was clicked.
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        if (!onScreen(hit.object)) continue
        const data = hit.object.userData as { wallId?: string; level?: number }
        // The nearest visible thing is not a wall, so the click landed on the
        // roof, a window or a sofa. Stop — do not reach past it.
        if (!data.wallId) return
        if ((data.level ?? 0) !== latest.current.activeFloor) return
        const { centre: at, onPick: fire } = latest.current
        fire({
          wallId: data.wallId,
          // world = plan - centre, so this is the way back.
          point: { x: hit.point.x + at[0], y: hit.point.z + at[2] },
        })
        return
      }
    },
    [camera, gl, ndc, raycaster, scene],
  )

  // Nothing else in the 3D view says a wall can be clicked, and this hook is
  // only mounted while a brush is armed — so the cursor is the hint.
  useEffect(() => {
    const element = gl.domElement
    element.style.cursor = 'crosshair'
    return () => {
      element.style.cursor = ''
    }
  }, [gl])

  useEffect(() => {
    const element = gl.domElement

    const start = (event: PointerEvent) => {
      down.current = { x: event.clientX, y: event.clientY }
    }

    const end = (event: PointerEvent) => {
      const from = down.current
      down.current = null
      if (!from) return
      // An orbit drag presses and releases on the same spot of the scene, so
      // only the pointer's travel across the screen tells the two apart —
      // the same measure the 2D editor's DRAG_THRESHOLD makes.
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > CLICK_SLOP) return
      pick(event)
    }

    const cancel = () => {
      down.current = null
    }

    // Down on the canvas only, so a press that began on the dock or the
    // toolbar never brushes a wall. Up on the window, so a release just
    // outside the canvas clears the press instead of leaving it armed.
    element.addEventListener('pointerdown', start)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    return () => {
      element.removeEventListener('pointerdown', start)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [gl, pick])
}
