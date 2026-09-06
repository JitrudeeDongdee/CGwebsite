import { Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import { SiteHeader, Brand } from '../ui/SiteHeader'
import { RouteFallback } from '../ui/RouteFallback'
import { contactHref, contactLabelKey, contactValue, footerChannels } from '../content/contact'
import { ensureMarketingI18n } from './i18n'

ensureMarketingI18n()

export function MarketingLayout() {
  const { pathname } = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // The marketing shell scrolls inside its own container (body is locked for the
  // designer), so route changes don't reset the browser's scroll — reset it here,
  // otherwise clicking a card mid-page lands the next page mid-page too.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <Box ref={scrollRef} sx={{ height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <SiteHeader />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </Box>
      <MarketingFooter />
    </Box>
  )
}

/** One footer entry: an in-app route (`to`), an external/protocol link (`href`), or plain text. */
type FooterLink = { label: string; to?: string; href?: string }

function MarketingFooter() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'

  const col = (head: string, items: FooterLink[]) => (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>{head}</Typography>
      {items.map((it) =>
        it.to || it.href ? (
          <Link
            key={it.label}
            {...(it.to ? { component: RouterLink, to: it.to } : { href: it.href })}
            variant="body2"
            underline="hover"
            color="text.secondary"
          >
            {it.label}
          </Link>
        ) : (
          <Typography key={it.label} variant="body2" color="text.secondary">
            {it.label}
          </Typography>
        ),
      )}
    </Stack>
  )

  const services: FooterLink[] = [
    { label: t('mkt.home.svc1'), to: '/home/house' },
    { label: t('mkt.home.svc2'), to: '/home/electronics' },
    { label: t('mkt.home.svc3'), to: '/home/furniture' },
    { label: t('mkt.home.svc4'), to: '/home/rental' },
  ]
  const company: FooterLink[] = [
    { label: t('mkt.nav.about'), to: '/about' },
    { label: t('mkt.nav.work'), to: '/portfolio' },
    { label: t('mkt.nav.models'), to: '/products?category=house' },
    { label: t('mkt.nav.contact'), to: '/contact' },
  ]
  // Contact details come from `src/content/contact.json` — the single place to edit them.
  const contact: FooterLink[] = footerChannels(lang).map((c) => {
    const value = contactValue(c, lang)
    return {
      label: c.kind === 'email' ? value : `${t(contactLabelKey(c))} ${value}`,
      href: contactHref(c, lang),
    }
  })

  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 5, mt: 4 }}>
      <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3 }}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: '1.6fr 1fr 1fr 1fr' } }}>
          <Stack spacing={1.5}>
            <Brand />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '26em' }}>
              {t('mkt.footer.tagline')}
            </Typography>
          </Stack>
          {col(t('mkt.footer.servicesHead'), services)}
          {col(t('mkt.footer.companyHead'), company)}
          {col(t('mkt.footer.contactHead'), contact)}
        </Box>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">© 2567 Thai Dongdee Engineering. {t('mkt.footer.rights')}.</Typography>
          <Typography variant="caption" color="text.secondary">{t('mkt.placeholderNote')}</Typography>
        </Stack>
      </Box>
    </Box>
  )
}
