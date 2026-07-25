import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useDrawingState } from '../drawing/useDrawingState'
import { useInteraction } from './useInteraction'
import { CameraControls } from './CameraControls'
import { GroundPlane } from './GroundPlane'
import { NodesView } from './NodesView'
import { WallsView } from './WallsView'
import { DraftWallView } from './DraftWallView'

export function DrawingCanvas({ onAreaChange }: { onAreaChange: (area: number | null) => void }) {
  const { state, addWall, updateNodePosition, roomArea } = useDrawingState()
  const { draft, isInteracting, onDown, onMove, onUp } = useInteraction(
    state,
    addWall,
    updateNodePosition,
  )

  useEffect(() => {
    onAreaChange(roomArea)
  }, [roomArea, onAreaChange])

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 20, 0], up: [0, 0, -1], zoom: 60, near: 0.1, far: 100 }}
      style={{ touchAction: 'none', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <CameraControls enabled={!isInteracting} />
      <gridHelper args={[60, 60, '#3a3f4a', '#22262e']} />
      <GroundPlane onDown={onDown} onMove={onMove} onUp={onUp} />
      <WallsView state={state} />
      <NodesView nodes={Object.values(state.nodes)} />
      <DraftWallView draft={draft} />
    </Canvas>
  )
}
