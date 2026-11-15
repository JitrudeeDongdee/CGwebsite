import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/**
 * Asked for once, on the first save of a plan.
 *
 * A plan saved as "Untitled" is a plan nobody can find again, and the saved
 * list is ordered by name far more often than by date. Later saves do not
 * ask again — they just save, because being prompted every time is what
 * stops people saving at all.
 */
export function PlanNameDialog({
  open,
  initialName,
  onClose,
  onSave,
}: {
  open: boolean
  initialName: string
  onClose: () => void
  onSave: (name: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  const trimmed = name.trim()
  const submit = () => {
    if (!trimmed) return
    onSave(trimmed)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('plans.nameTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('plans.nameLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit()
          }}
        />
        {/* Said plainly, because a link that only works on one machine is
            exactly the kind of thing people assume works everywhere. */}
        <Alert severity="info" variant="outlined" sx={{ mt: 2, py: 0 }}>
          <Typography variant="caption">{t('plans.localOnly')}</Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('rooms.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={!trimmed}>
          {t('plans.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
