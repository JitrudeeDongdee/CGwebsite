import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import type { LeadContact } from '../leads/types'

const TIMELINE_OPTIONS = [
  { value: 'asap', labelKey: 'lead.timelineAsap' },
  { value: '3m', labelKey: 'lead.timeline3m' },
  { value: '6m', labelKey: 'lead.timeline6m' },
  { value: '1y', labelKey: 'lead.timeline1y' },
  { value: 'undecided', labelKey: 'lead.timelineUndecided' },
]

const EMPTY_CONTACT: LeadContact = {
  name: '',
  phone: '',
  email: '',
  province: '',
  timeline: 'asap',
}

type FieldErrors = Partial<Record<keyof LeadContact, string>>

interface LeadFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (contact: LeadContact) => Promise<void>
  /** Warn the customer that no area/estimate will be attached. */
  hasEstimate: boolean
}

export function LeadFormDialog({ open, onClose, onSubmit, hasEstimate }: LeadFormDialogProps) {
  const { t } = useTranslation()
  const [contact, setContact] = useState<LeadContact>(EMPTY_CONTACT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const setField = (field: keyof LeadContact, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!contact.name.trim()) next.name = t('lead.required')
    if (!contact.province.trim()) next.province = t('lead.required')

    if (!contact.phone.trim()) {
      next.phone = t('lead.required')
    } else if (contact.phone.replace(/\D/g, '').length < 9) {
      next.phone = t('lead.invalidPhone')
    }

    // Email is optional (phone is the primary channel), but if given it
    // should at least look like an address.
    if (contact.email.trim() && !/^\S+@\S+\.\S+$/.test(contact.email.trim())) {
      next.email = t('lead.invalidEmail')
    }

    return next
  }

  const handleSubmit = async () => {
    const found = validate()
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(contact)
      setContact(EMPTY_CONTACT)
      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('lead.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText variant="body2">{t('lead.description')}</DialogContentText>

        {!hasEstimate && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
            {t('lead.noRoomWarning')}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label={t('lead.name')}
            value={contact.name}
            onChange={(e) => setField('name', e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            required
            fullWidth
          />
          <TextField
            label={t('lead.phone')}
            value={contact.phone}
            onChange={(e) => setField('phone', e.target.value)}
            error={Boolean(errors.phone)}
            helperText={errors.phone}
            required
            fullWidth
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
          />
          <TextField
            label={t('lead.email')}
            value={contact.email}
            onChange={(e) => setField('email', e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
            fullWidth
            slotProps={{ htmlInput: { inputMode: 'email' } }}
          />
          <TextField
            label={t('lead.province')}
            value={contact.province}
            onChange={(e) => setField('province', e.target.value)}
            error={Boolean(errors.province)}
            helperText={errors.province}
            required
            fullWidth
          />
          <TextField
            select
            label={t('lead.timeline')}
            value={contact.timeline}
            onChange={(e) => setField('timeline', e.target.value)}
            fullWidth
          >
            {TIMELINE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          {t('lead.localOnlyNotice')}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('lead.cancel')}
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? t('lead.sending') : t('lead.send')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
