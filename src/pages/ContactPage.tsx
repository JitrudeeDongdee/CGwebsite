import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import PhoneIcon from '@mui/icons-material/Phone'
import ChatIcon from '@mui/icons-material/Chat'
import MailIcon from '@mui/icons-material/Mail'
import FacebookIcon from '@mui/icons-material/Facebook'
import PlaceIcon from '@mui/icons-material/Place'
import { CONTACT_CHANNELS, contactHref, contactLabelKey, contactValue, type ContactKind } from '../content/contact'
import { ensureMarketingI18n } from '../marketing/i18n'
import { messagesReachTheTeam, sendContactMessage } from '../content/messages'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ContactPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFailed(false)
    setSending(true)
    try {
      await sendContactMessage(form)
      setSent(true)
      setForm({ name: '', phone: '', email: '', message: '' })
    } catch (err) {
      // Never clear the form on failure — the customer would have to retype
      // everything, and most people just leave instead.
      console.error('[contact] could not send the message:', err)
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  // Same source as the footer: `src/content/contact.json`.
  const icons: Record<ContactKind, ReactNode> = {
    phone: <PhoneIcon fontSize="small" />,
    line: <ChatIcon fontSize="small" />,
    email: <MailIcon fontSize="small" />,
    facebook: <FacebookIcon fontSize="small" />,
    address: <PlaceIcon fontSize="small" />,
  }
  const info = CONTACT_CHANNELS.map((c) => ({
    icon: icons[c.kind],
    label: t(contactLabelKey(c)),
    value: contactValue(c, lang),
    href: contactHref(c, lang),
  }))

  return (
    <Wrap sx={{ py: { xs: 6, md: 8 } }}>
      <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {t('mkt.contact.eyebrow')}
      </Typography>
      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 28, md: 38 }, fontWeight: 600 }}>
        {t('mkt.contact.title')}
      </Typography>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', maxWidth: '40em' }}>{t('mkt.contact.sub')}</Typography>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, mt: 4, alignItems: 'start' }}>
        <Paper component="form" onSubmit={submit} elevation={0} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          {sent && (
            <Alert severity="success" onClose={() => setSent(false)} sx={{ mb: 2 }}>
              {t('mkt.contact.sent')}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField label={t('mkt.contact.name')} value={form.name} onChange={set('name')} required fullWidth size="small" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={t('mkt.contact.phone')} value={form.phone} onChange={set('phone')} required fullWidth size="small" />
              <TextField label={t('mkt.contact.email')} type="email" value={form.email} onChange={set('email')} fullWidth size="small" />
            </Stack>
            <TextField label={t('mkt.contact.message')} value={form.message} onChange={set('message')} multiline minRows={4} fullWidth size="small" />
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              disabled={sending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t(sending ? 'mkt.contact.sending' : 'mkt.contact.send')}
            </Button>
            {failed && (
              <Alert severity="error" onClose={() => setFailed(false)}>
                {t('mkt.contact.failed')}
              </Alert>
            )}
            {/* Only shown while there is no backend — with one, the message really
                does reach the team and the warning would be a lie. */}
            {!messagesReachTheTeam && (
              <Alert severity="info" variant="outlined">
                <Typography variant="caption">{t('mkt.contact.localNotice')}</Typography>
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Stack spacing={2.5}>
            {info.map((i) => (
              <Stack key={i.label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}>
                  {i.icon}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{i.label}</Typography>
                  {i.href ? (
                    <Typography
                      component={Link}
                      href={i.href}
                      target={i.href.startsWith('http') ? '_blank' : undefined}
                      rel={i.href.startsWith('http') ? 'noopener' : undefined}
                      underline="hover"
                      color="text.primary"
                      sx={{ fontWeight: 500, display: 'block' }}
                    >
                      {i.value}
                    </Typography>
                  ) : (
                    <Typography sx={{ fontWeight: 500 }}>{i.value}</Typography>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Wrap>
  )
}
