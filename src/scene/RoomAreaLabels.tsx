import { Text } from '@react-three/drei'
import { useTheme } from '@mui/material/styles'
import type { Room } from '../drawing/rooms'

/**
 * Each room's area, printed at its centre the way a floor plan annotates
 * rooms. This one carries its unit — a bare "16.00" inside a room is
 * genuinely ambiguous against the wall lengths around it. "m²" rather than
 * "ตร.ม." because the WebGL font can't be relied on for Thai glyphs, and
 * the symbol reads the same in both languages.
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
          {`${room.area.toFixed(2)} m²`}
        </Text>
      ))}
    </>
  )
}
