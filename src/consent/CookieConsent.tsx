import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Slide from '@mui/material/Slide'
import { CONSENT_EVENT, readConsent, setConsent, type ConsentRecord } from './consent'

/**
 * The PDPA consent banner.
 *
 * Shown only when no choice has been recorded, and reopened by the footer's
 * "cookie settings" link (withdrawing consent has to be as easy as giving it).
 *
 * Three things here are legal requirements, not design choices:
 *  - **Accept and decline are the same size, side by side.** A buried or greyed
 *    "decline" is not freely given consent, which makes the consent invalid.
 *  - **Nothing is pre-ticked and nothing loads before the choice** — the banner
 *    only records a decision; `RouteAnalytics` is what reacts to it.
 *  - **The page stays usable while it is open.** A wall that blocks the content
 *    until you accept is consent under duress.
 *
 * ⚠️ It renders nothing until mounted, deliberately. The prerenderer has no
 * `localStorage`, so a banner rendered at build time would be baked into the
 * static HTML of all 54 pages — shown to everyone, including people who already
 * chose, until React took over.
 */
export function CookieConsent() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOpen(readConsent() === null)

    // `detail: null` is the footer asking to reopen; a record means a choice was
    // just made somewhere (another tab, or the buttons below).
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentRecord | null>).detail
      setOpen(detail === null)
    }
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  if (!mounted) return null

  const choose = (choice: 'granted' | 'denied') => () => {
    setConsent(choice)
    setOpen(false)
  }

  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        role="dialog"
        aria-live="polite"
        aria-label={t('mkt.cookie.title')}
        sx={{
          position: 'fixed',
          left: { xs: 8, md: 16 },
          right: { xs: 8, md: 16 },
          bottom: { xs: 8, md: 16 },
          // Above the floating service bar, which also sits at the bottom on the
          // home pages (it uses theme.zIndex.appBar).
          zIndex: (theme) => theme.zIndex.appBar + 2,
          maxWidth: 720,
          mx: 'auto',
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, md: 16 } }}>{t('mkt.cookie.title')}</Typography>
        {/* PDPA requires informing people as well as asking them, so the banner
            always links to the notice — asking for consent without saying what
            for is not informed consent. */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {t('mkt.cookie.body')}{' '}
          <Link component={RouterLink} to="/privacy" underline="hover">
            {t('mkt.cookie.policy')}
          </Link>
        </Typography>

        {/* Equal buttons, decline first on nobody's side: same variant, same
            size, same row. */}
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} sx={{ mt: 2, gap: 1 }}>
          <Button fullWidth variant="outlined" onClick={choose('denied')} sx={{ flex: 1 }}>
            {t('mkt.cookie.decline')}
          </Button>
          <Button fullWidth variant="contained" color="secondary" onClick={choose('granted')} sx={{ flex: 1 }}>
            {t('mkt.cookie.accept')}
          </Button>
        </Stack>
      </Paper>
    </Slide>
  )
}

/** The footer entry that reopens the banner. Exported so the footer can place it. */
export function CookieSettingsLink() {
  const { t } = useTranslation()
  return (
    <Box
      component="button"
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))}
      sx={{
        background: 'none',
        border: 0,
        p: 0,
        font: 'inherit',
        color: 'text.secondary',
        cursor: 'pointer',
        textDecoration: 'underline',
        '&:hover': { color: 'text.primary' },
      }}
    >
      {t('mkt.cookie.settings')}
    </Box>
  )
}
