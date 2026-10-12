import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon'
import PhoneIcon from '@mui/icons-material/Phone'
import MailIcon from '@mui/icons-material/Mail'
import FacebookIcon from '@mui/icons-material/Facebook'
import PlaceIcon from '@mui/icons-material/Place'
import { CONTACT_CHANNELS, contactHref, contactLabel, contactValue, type ContactKind } from '../content/contact'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useSeo } from '../seo/useSeo'
import { messagesReachTheTeam, sendContactMessage } from '../content/messages'

ensureMarketingI18n()

/** The LINE logo — MUI has no brand icon for it, so it's an inline glyph. */
function LineIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.59.121.303.079.776.039 1.085l-.17 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.176 14.393 24 12.458 24 10.304zM7.65 13.625H5.269a.631.631 0 0 1-.63-.63V8.233a.63.63 0 1 1 1.26 0v4.132H7.65a.63.63 0 1 1 0 1.26zm2.466-.63a.631.631 0 0 1-1.26 0V8.233a.63.63 0 1 1 1.26 0v4.762zm5.741 0a.629.629 0 0 1-.631.63.625.625 0 0 1-.51-.261l-2.441-3.321v2.952a.63.63 0 1 1-1.26 0V8.233a.628.628 0 0 1 .63-.63c.189 0 .369.09.489.248l2.466 3.336V8.233a.63.63 0 1 1 1.258 0v4.762zm3.862-3.011h-1.755v1.126h1.755a.63.63 0 1 1 0 1.26h-2.386a.631.631 0 0 1-.629-.63V8.233c0-.345.282-.63.63-.63h2.385a.63.63 0 1 1 0 1.26h-1.755v1.121z" />
    </SvgIcon>
  )
}

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/** The subject dropdown's options; labels live in i18n `mkt.contact.topics.*`.
 *  Also the allow-list for the `?topic=` deep-link param. */
const TOPIC_KEYS = ['quote', 'productPrice', 'service', 'other'] as const

export function ContactPage() {
  const { t, i18n } = useTranslation()
  useSeo({ title: t('mkt.contact.title'), description: t('mkt.contact.sub') })
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  // Deep links from a product carry ?topic=&detail= so the form opens pre-filled
  // (e.g. "สอบถามราคาสินค้า" + "ตู้เย็น" when you came from the fridge page).
  const [params] = useSearchParams()
  const paramTopic = params.get('topic') ?? ''
  const [form, setForm] = useState({
    name: '',
    organization: '',
    phone: '',
    email: '',
    topic: (TOPIC_KEYS as readonly string[]).includes(paramTopic) ? paramTopic : '',
    detail: params.get('detail') ?? '',
    message: '',
  })
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
      // The subject is the chosen topic plus any detail: "ขอใบเสนอราคา — ตู้เย็น".
      const topicLabel = form.topic ? t(`mkt.contact.topics.${form.topic}`) : ''
      const subject = [topicLabel, form.detail.trim()].filter(Boolean).join(' — ')
      await sendContactMessage({ name: form.name, organization: form.organization, phone: form.phone, email: form.email, subject, message: form.message })
      setSent(true)
      setForm({ name: '', organization: '', phone: '', email: '', topic: '', detail: '', message: '' })
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
    line: <LineIcon fontSize="small" />,
    email: <MailIcon fontSize="small" />,
    facebook: <FacebookIcon fontSize="small" />,
    address: <PlaceIcon fontSize="small" />,
  }
  // LINE and Facebook get their own brand colour on the icon tile; the rest keep
  // the site's primary red. Icon stays white, which reads on all three.
  const brandTile: Partial<Record<ContactKind, string>> = {
    line: '#06C755',
    facebook: '#1877F2',
  }
  const info = CONTACT_CHANNELS.map((c, index) => ({
    // `kind` repeats now (two phones, two e-mails), so the key cannot be the
    // label or the kind — React would reuse the first row's DOM for the second.
    key: `${c.kind}-${index}`,
    icon: icons[c.kind],
    tile: brandTile[c.kind],
    label: contactLabel(c, lang, t),
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={t('mkt.contact.name')} value={form.name} onChange={set('name')} required fullWidth size="small" />
              <TextField label={t('mkt.contact.organization')} value={form.organization} onChange={set('organization')} fullWidth size="small" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label={t('mkt.contact.phone')} value={form.phone} onChange={set('phone')} required fullWidth size="small" />
              <TextField label={t('mkt.contact.email')} type="email" value={form.email} onChange={set('email')} fullWidth size="small" />
            </Stack>
            {/* Subject: a topic (dropdown) + an optional free-text detail. */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                required
                label={t('mkt.contact.topicLabel')}
                value={form.topic}
                onChange={set('topic')}
                fullWidth
                size="small"
                sx={{ maxWidth: { sm: 260 } }}
              >
                <MenuItem value="" disabled>
                  {t('mkt.contact.topicChoose')}
                </MenuItem>
                {TOPIC_KEYS.map((key) => (
                  <MenuItem key={key} value={key}>
                    {t(`mkt.contact.topics.${key}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label={t('mkt.contact.topicDetail')} value={form.detail} onChange={set('detail')} fullWidth size="small" />
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
              <Stack key={i.key} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: i.tile ?? 'primary.main', color: '#fff', flexShrink: 0 }}>
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
