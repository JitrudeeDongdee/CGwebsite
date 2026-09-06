import { Html } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import { pointInPolygon, type Room } from '../drawing/rooms'
import type { DrawRoomLabel } from '../drawing/types'

/**
 * Room name and area, printed at the room's centre the way a plan annotates
 * rooms.
 *
 * These are DOM labels rather than WebGL text: room names are user- and
 * Thai-language content, and the in-canvas font can't be relied on to cover
 * Thai glyphs. Wall dimensions stay as WebGL text because they're numeric.
 */
export function RoomAreaLabels({
  rooms,
  roomLabels,
}: {
  rooms: Room[]
  roomLabels: DrawRoomLabel[]
}) {
  const { t } = useTranslation()

  /**
   * Template names are stored as i18n keys so they follow the language
   * switch; names the user typed are plain text and pass through unchanged.
   */
  const displayName = (name: string) => (name.startsWith('rooms.') ? t(name) : name)

  return (
    <>
      {rooms.map((room) => {
        const label = roomLabels.find((item) => pointInPolygon(item, room.polygon))
        return (
          <Html
            key={room.nodeIds.join('-')}
            position={[room.centroid.x, 0.3, room.centroid.y]}
            center
            // The label is an annotation, not a target — clicks belong to the
            // canvas underneath so drawing still works over a room.
            style={{ pointerEvents: 'none', userSelect: 'none', textAlign: 'center' }}
          >
            {label && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--room-label-name)',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName(label.name)}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--room-label-area)', whiteSpace: 'nowrap' }}>
              {room.area.toFixed(2)} m²
            </div>
          </Html>
        )
      })}
    </>
  )
}
