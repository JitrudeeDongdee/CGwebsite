import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

interface RoomNameDialogProps {
  open: boolean
  /** Current name, translated for display if it came from a template. */
  initialName: string
  onClose: () => void
  onSave: (name: string) => void
}

export function RoomNameDialog({ open, initialName, onClose, onSave }: RoomNameDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)

  // Re-seed each time it opens, since the same dialog serves every room.
  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  const submit = () => {
    onSave(name)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('rooms.renameTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('rooms.nameLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('rooms.cancel')}
        </Button>
        <Button onClick={submit} variant="contained">
          {t('rooms.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
