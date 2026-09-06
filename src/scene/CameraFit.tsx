import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawingState } from '../drawing/types'

/** Metres of clear space kept around the plan, so dimension strings fit. */
const MARGIN = 2.5

interface CameraFitProps {
  state: DrawingState
  /** Changing this requests a refit; 0 means "never fitted yet". */
  token: number
  controlsRef: React.RefObject<OrbitControls | null>
}

/**
 * Frames the whole plan in view. Used when a starter template is loaded —
 * templates vary from 6x4 to 8x6, and the canvas width depends on the side
 * panels, so a fixed zoom would either crop the plan or leave it tiny.
 */
export function CameraFit({ state, token, controlsRef }: CameraFitProps) {
  const { camera, size } = useThree()

  useEffect(() => {
    if (token === 0) return

    const nodes = Object.values(state.nodes)
    if (nodes.length === 0) return

    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const width = maxX - minX + MARGIN * 2
    const height = maxY - minY + MARGIN * 2
    if (width <= 0 || height <= 0) return

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    camera.zoom = Math.min(size.width / width, size.height / height)
    camera.position.set(centerX, camera.position.y, centerY)
    camera.updateProjectionMatrix()

    const controls = controlsRef.current
    if (controls) {
      controls.target.set(centerX, 0, centerY)
      controls.update()
    }
    // Only refit when explicitly asked — not on every edit, which would
    // yank the view around while the user is drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return null
}
