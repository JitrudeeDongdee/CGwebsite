import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { DrawingState } from '../drawing/types'
import { IsoThumbnail } from './ItemPreview'

/**
 * Covers the 3D view until its first frame is actually on screen.
 *
 * It shows the plan as the cheap isometric massing drawing the gallery
 * already uses — a rough picture of THEIR house, drawn instantly as SVG —
 * rather than a bare spinner over nothing. The 3D engine is ~920 kB of
 * JavaScript and its surface patterns are drawn pixel by pixel on arrival,
 * so on a phone there is a real wait here; what it must not look like is a
 * blank canvas, which is what the plain Suspense spinner left behind the
 * moment the chunk finished downloading but before anything was rendered.
 */
export function Scene3DLoading({ state }: { state: DrawingState }) {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 3,
      }}
    >
      <Stack spacing={2.5} sx={{ alignItems: 'center', maxWidth: 320, width: '100%' }}>
        <Box sx={{ opacity: 0.55 }}>
          <IsoThumbnail state={state} size={200} />
        </Box>
        <Stack spacing={1} sx={{ width: '100%' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            {t('building3d.loading')}
          </Typography>
          {/* Indeterminate on purpose: the wait is a download plus a burst of
              drawing, and a fake percentage would be a guess. */}
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>
    </Box>
  )
}
