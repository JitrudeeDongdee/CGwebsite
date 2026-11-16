import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import RotateLeft from '@mui/icons-material/RotateLeft'
import RotateRight from '@mui/icons-material/RotateRight'
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import CenterFocusStrong from '@mui/icons-material/CenterFocusStrong'
import FlipToBack from '@mui/icons-material/FlipToBack'
import {
  TILT_STEP,
  TURN_STEP,
  ZOOM_STEP,
  type CameraRequest,
} from '../scene3d/cameraMoves'

/**
 * Camera controls for the 3D view.
 *
 * The 3D view could only be moved by dragging, which is fine with a mouse and
 * close to unusable on a trackpad — and gives no way back when the house ends
 * up off screen or edge-on. These are the same moves as buttons.
 *
 * ⚠️ Imports only `cameraMoves`, which has no three.js in it. Importing
 * anything else from `scene3d/` would pull the ~240 kB three chunk into the
 * 2D editor, which renders this component's siblings.
 *
 * It sits **bottom-left**, where the 2D editor puts its own toolbar — so the
 * controls stay in the same corner of the screen as you switch views instead
 * of jumping across it. That corner is free in 3D: `BottomToolbar` renders
 * only in the plan view. Top-left is the floor switcher and bottom-right the
 * catalogue dock, both of which this clears.
 *
 * Laid out wide and short (4 x 2) rather than tall, for the same reason: it
 * then has the footprint of the toolbar it stands in for.
 */
export function CameraButtons({ onMove }: { onMove: (move: CameraRequest) => void }) {
  const { t } = useTranslation()

  const Btn = ({
    title,
    onClick,
    children,
  }: {
    title: string
    onClick: () => void
    children: React.ReactNode
  }) => (
    <Tooltip title={title} placement="left">
      <IconButton size="small" onClick={onClick} sx={{ p: 0.5 }}>
        {children}
      </IconButton>
    </Tooltip>
  )

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 2,
        p: 0.5,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, auto)',
        gap: 0.25,
        borderRadius: 2,
      }}
    >
      <Btn title={t('camera.zoomOut')} onClick={() => onMove({ kind: 'zoom', factor: ZOOM_STEP })}>
        <ZoomOut fontSize="small" />
      </Btn>
      <Btn title={t('camera.zoomIn')} onClick={() => onMove({ kind: 'zoom', factor: 1 / ZOOM_STEP })}>
        <ZoomIn fontSize="small" />
      </Btn>

      <Btn title={t('camera.turnLeft')} onClick={() => onMove({ kind: 'turn', degrees: -TURN_STEP })}>
        <RotateLeft fontSize="small" />
      </Btn>
      <Btn title={t('camera.turnRight')} onClick={() => onMove({ kind: 'turn', degrees: TURN_STEP })}>
        <RotateRight fontSize="small" />
      </Btn>

      <Btn title={t('camera.tiltDown')} onClick={() => onMove({ kind: 'tilt', degrees: -TILT_STEP })}>
        <KeyboardArrowDown fontSize="small" />
      </Btn>
      <Btn title={t('camera.tiltUp')} onClick={() => onMove({ kind: 'tilt', degrees: TILT_STEP })}>
        <KeyboardArrowUp fontSize="small" />
      </Btn>

      <Btn title={t('camera.top')} onClick={() => onMove({ kind: 'view', view: 'top' })}>
        <FlipToBack fontSize="small" />
      </Btn>
      <Btn title={t('camera.home')} onClick={() => onMove({ kind: 'view', view: 'home' })}>
        <CenterFocusStrong fontSize="small" />
      </Btn>
    </Paper>
  )
}
