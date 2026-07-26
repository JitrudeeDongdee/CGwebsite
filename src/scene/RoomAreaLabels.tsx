import { Text } from '@react-three/drei'
import { useTheme } from '@mui/material/styles'
import type { Room } from '../drawing/rooms'

/**
 * Each room's area, printed at its centre the way a floor plan annotates
 * rooms. Numeric only (no unit) for the same reason as wall dimensions —
 * the WebGL font can't be relied on to cover Thai glyphs.
 */
export function RoomAreaLabels({ rooms }: { rooms: Room[] }) {
  const { scene } = useTheme()

  return (
    <>
      {rooms.map((room) => (
        <Text
          key={room.nodeIds.join('-')}
          position={[room.centroid.x, 0.3, room.centroid.y]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.3}
          color={scene.dimension}
          anchorX="center"
          anchorY="middle"
        >
          {room.area.toFixed(2)}
        </Text>
      ))}
    </>
  )
}
