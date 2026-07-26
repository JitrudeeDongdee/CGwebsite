import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import OpenWith from '@mui/icons-material/OpenWith'
import Edit from '@mui/icons-material/Edit'
import Undo from '@mui/icons-material/Undo'
import Redo from '@mui/icons-material/Redo'
import CenterFocusStrong from '@mui/icons-material/CenterFocusStrong'
import type { ToolMode } from '../drawing/tools'

interface BottomToolbarProps {
  tool: ToolMode
  onSelectTool: (type: 'select' | 'draw') => void
  onUndo: () => void
  onRedo: () => void
  onFit: () => void
  canUndo: boolean
  canRedo: boolean
}

/**
 * The mode switch, floating over the bottom of the canvas.
 *
 * Placing a door/window from the side palette also counts as a mode, so
 * neither button reads as active while that's in progress.
 */
export function BottomToolbar({
  tool,
  onSelectTool,
  onUndo,
  onRedo,
  onFit,
  canUndo,
  canRedo,
}: BottomToolbarProps) {
  const { t } = useTranslation()

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        value={tool.type === 'opening' ? null : tool.type}
        onChange={(_, next: 'select' | 'draw' | null) => {
          if (next) onSelectTool(next)
        }}
      >
        <ToggleButton value="select" sx={{ px: 1.5 }}>
          <Tooltip title={t('tools.select')}>
            <OpenWith fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="draw" sx={{ px: 1.5 }}>
          <Tooltip title={t('tools.draw')}>
            <Edit fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip title={t('contextMenu.undo')}>
        <span>
          <IconButton size="small" disabled={!canUndo} onClick={onUndo}>
            <Undo fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('contextMenu.redo')}>
        <span>
          <IconButton size="small" disabled={!canRedo} onClick={onRedo}>
            <Redo fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('tools.fit')}>
        <IconButton size="small" onClick={onFit}>
          <CenterFocusStrong fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  )
}
