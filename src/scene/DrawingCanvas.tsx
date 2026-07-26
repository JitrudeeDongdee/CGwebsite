import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTheme } from '@mui/material/styles'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { DrawingState, Point } from '../drawing/types'
import { useInteraction } from './useInteraction'
import { CameraControls } from './CameraControls'
import { GroundPlane } from './GroundPlane'
import { NodesView } from './NodesView'
import { WallsView } from './WallsView'
import { DraftWallView } from './DraftWallView'
import { SnapIndicator } from './SnapIndicator'

interface DrawingCanvasProps {
  state: DrawingState
  addWall: (start: Point, end: Point) => void
  beginNodeDrag: () => void
  updateNodePosition: (nodeId: string, point: Point) => void
  finalizeNodeMove: (nodeId: string, point: Point) => void
  onContextMenu: (point: Point, screen: { x: number; y: number }) => void
  /** Lets the page cancel an in-progress wall from a keyboard handler. */
  cancelRef: React.RefObject<(() => void) | null>
}

export function DrawingCanvas({
  state,
  addWall,
  beginNodeDrag,
  updateNodePosition,
  finalizeNodeMove,
  onContextMenu,
  cancelRef,
}: DrawingCanvasProps) {
  const { draft, moveSnap, onDown, onMove, onUp, cancelDrawing } = useInteraction({
    state,
    addWall,
    beginNodeDrag,
    updateNodePosition,
    finalizeNodeMove,
  })
  const controlsRef = useRef<OrbitControls>(null)
  const { scene } = useTheme()

  cancelRef.current = cancelDrawing

  const handleDown = (point: Point) => {
    if (controlsRef.current) controlsRef.current.enabled = false
    onDown(point)
  }

  const handleUp = (point: Point) => {
    onUp(point)
    if (controlsRef.current) controlsRef.current.enabled = true
  }

  const handleContextMenu = (point: Point, screen: { x: number; y: number }) => {
    // While a wall is being drawn, right-click means "cancel it" (the CAD
    // convention) rather than opening the menu.
    if (cancelDrawing()) return
    onContextMenu(point, screen)
  }

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 20, 0], up: [0, 0, -1], zoom: 60, near: 0.1, far: 100 }}
      style={{ touchAction: 'none', width: '100%', height: '100%' }}
    >
      <color attach="background" args={[scene.background]} />
      <ambientLight intensity={1.2} />
      <CameraControls controlsRef={controlsRef} />
      <gridHelper args={[60, 60, scene.gridMajor, scene.gridMinor]} />
      <GroundPlane
        onDown={handleDown}
        onMove={onMove}
        onUp={handleUp}
        onContextMenu={handleContextMenu}
      />
      <WallsView state={state} />
      <NodesView nodes={Object.values(state.nodes)} />
      <DraftWallView draft={draft} />
      {moveSnap && <SnapIndicator point={moveSnap.point} />}
    </Canvas>
  )
}
