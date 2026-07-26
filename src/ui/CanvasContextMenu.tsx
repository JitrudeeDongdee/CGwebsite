import { useTranslation } from 'react-i18next'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Undo from '@mui/icons-material/Undo'
import Redo from '@mui/icons-material/Redo'
import ClearAll from '@mui/icons-material/ClearAll'

export interface ContextTarget {
  screen: { x: number; y: number }
  wallId: string | null
  nodeId: string | null
  openingId: string | null
}

interface CanvasContextMenuProps {
  target: ContextTarget | null
  onClose: () => void
  onDeleteOpening: (openingId: string) => void
  onDeleteWall: (wallId: string) => void
  onDeleteNode: (nodeId: string) => void
  onCopyWall: (wallId: string) => void
  onUndo: () => void
  onRedo: () => void
  onClearAll: () => void
  canUndo: boolean
  canRedo: boolean
  hasGeometry: boolean
}

export function CanvasContextMenu({
  target,
  onClose,
  onDeleteOpening,
  onDeleteWall,
  onDeleteNode,
  onCopyWall,
  onUndo,
  onRedo,
  onClearAll,
  canUndo,
  canRedo,
  hasGeometry,
}: CanvasContextMenuProps) {
  const { t } = useTranslation()

  const run = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <Menu
      open={target !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        target ? { top: target.screen.y, left: target.screen.x } : undefined
      }
    >
      {target?.openingId && (
        <MenuItem onClick={() => run(() => onDeleteOpening(target.openingId!))}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('openings.deleteOpening')}</ListItemText>
        </MenuItem>
      )}

      {target?.nodeId && (
        <MenuItem onClick={() => run(() => onDeleteNode(target.nodeId!))}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('contextMenu.deleteNode')}</ListItemText>
        </MenuItem>
      )}

      {target?.wallId && !target.nodeId && (
        <MenuItem onClick={() => run(() => onDeleteWall(target.wallId!))}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('contextMenu.deleteWall')}</ListItemText>
        </MenuItem>
      )}

      {target?.wallId && !target.nodeId && (
        <MenuItem onClick={() => run(() => onCopyWall(target.wallId!))}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('contextMenu.copyWall')}</ListItemText>
        </MenuItem>
      )}

      {(target?.wallId || target?.nodeId || target?.openingId) && <Divider />}

      <MenuItem disabled={!canUndo} onClick={() => run(onUndo)}>
        <ListItemIcon>
          <Undo fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('contextMenu.undo')}</ListItemText>
      </MenuItem>

      <MenuItem disabled={!canRedo} onClick={() => run(onRedo)}>
        <ListItemIcon>
          <Redo fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('contextMenu.redo')}</ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem disabled={!hasGeometry} onClick={() => run(onClearAll)}>
        <ListItemIcon>
          <ClearAll fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('contextMenu.clearAll')}</ListItemText>
      </MenuItem>
    </Menu>
  )
}
