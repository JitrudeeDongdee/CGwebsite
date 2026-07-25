import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { useDrawingState } from './drawing/useDrawingState'
import { DrawingCanvas } from './scene/DrawingCanvas'
import { AreaSummary } from './ui/AreaSummary'
import { SettingsMenu } from './ui/SettingsMenu'

function App() {
  const { t } = useTranslation()
  const { state, addWall, updateNodePosition, finalizeNodeMove, roomArea } = useDrawingState()

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense">
          <Typography variant="h3" component="h1" sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>
          <SettingsMenu />
        </Toolbar>
      </AppBar>

      <Box sx={{ position: 'relative', flexGrow: 1, minHeight: 0 }}>
        <DrawingCanvas
          state={state}
          addWall={addWall}
          updateNodePosition={updateNodePosition}
          finalizeNodeMove={finalizeNodeMove}
        />

        <Stack
          spacing={1}
          sx={{ position: 'absolute', top: 16, right: 16, alignItems: 'flex-end' }}
        >
          <AreaSummary area={roomArea} wallCount={state.walls.length} />
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            maxWidth: 420,
            pointerEvents: 'none',
          }}
        >
          {t('canvas.hint')}
          <br />
          {t('canvas.zoomHint')}
        </Typography>
      </Box>
    </Box>
  )
}

export default App
