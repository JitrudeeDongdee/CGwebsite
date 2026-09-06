import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

/**
 * Shown while a lazily-loaded route chunk downloads. Deliberately plain — on a
 * fast connection it flashes for a few frames, so anything more elaborate reads
 * as a glitch. Lives in its own file so both layouts can use it without importing
 * from `App` (which imports them — that would be a cycle).
 */
export function RouteFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh', width: '100%' }}>
      <CircularProgress />
    </Box>
  )
}
