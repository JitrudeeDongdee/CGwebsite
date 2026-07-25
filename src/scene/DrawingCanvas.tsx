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
  updateNodePosition: (nodeId: string, point: Point) => void
  finalizeNodeMove: (nodeId: string, point: Point) => void
}

export function DrawingCanvas({
  state,
  addWall,
  updateNodePosition,
  finalizeNodeMove,
}: DrawingCanvasProps) {
  const { draft, moveSnap, onDown, onMove, onUp } = useInteraction(
    state,
    addWall,
    updateNodePosition,
    finalizeNodeMove,
  )
  const controlsRef = useRef<OrbitControls>(null)
  const { scene } = useTheme()

  const handleDown = (point: Point) => {
    if (controlsRef.current) controlsRef.current.enabled = false
    onDown(point)
  }

  const handleUp = (point: Point) => {
    onUp(point)
    if (controlsRef.current) controlsRef.current.enabled = true
  }

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 20, 0], up: [0, 0, -1], zoom: 60, near: 0.1, far: 100 }}
      style={{ touchAction: 'none', width: '100%', height: '100%' }}
    >
      <color attach="background" args={[scene.background]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <CameraControls controlsRef={controlsRef} />
      <gridHelper args={[60, 60, scene.gridMajor, scene.gridMinor]} />
      <GroundPlane onDown={handleDown} onMove={onMove} onUp={handleUp} />
      <WallsView state={state} />
      <NodesView nodes={Object.values(state.nodes)} />
      <DraftWallView draft={draft} />
      {moveSnap && <SnapIndicator point={moveSnap.point} />}
    </Canvas>
  )
}
