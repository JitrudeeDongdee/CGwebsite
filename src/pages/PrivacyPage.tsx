import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import { CONTACT_CHANNELS, contactHref, contactLabel, contactValue } from '../content/contact'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useSeo } from '../seo/useSeo'

ensureMarketingI18n()

/**
 * The PDPA privacy notice.
 *
 * Everything on this page describes what the code actually does — the tables in
 * the init migration, the localStorage keys, the services the app really talks
 * to. ⚠️ Keep it that way: if a new form, cookie or processor is added, this
 * page is part of the change, not a follow-up. A notice that describes last
 * month's behaviour is worse than none, because people rely on it.
 *
 * The contact block is rendered from `src/content/contact.json`, the same source
 * as the footer, so the controller's details cannot drift out of date here.
 */

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 820, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

function Section({ head, children }: { head: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography component="h2" sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 600, mb: 1 }}>
        {head}
      </Typography>
      {children}
    </Box>
  )
}

/** A labelled point: a bold term and the plain-language explanation under it. */
function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{term}</Typography>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <Box component="ul" sx={{ pl: 3, m: 0, mt: 1 }}>
      {items.map((text) => (
        <Typography key={text} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
          {text}
        </Typography>
      ))}
    </Box>
  )
}

export function PrivacyPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  useSeo({ title: t('mkt.privacy.title'), description: t('mkt.privacy.intro') })

  return (
    <Wrap sx={{ py: { xs: 5, md: 7 } }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 600 }}>
        {t('mkt.privacy.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('mkt.privacy.updated')}
      </Typography>
      <Typography sx={{ mt: 2, color: 'text.secondary' }}>{t('mkt.privacy.intro')}</Typography>

      <Section head={t('mkt.privacy.controllerHead')}>
        <Typography variant="body2" color="text.secondary">
          {t('mkt.privacy.controllerBody')}
        </Typography>
      </Section>

      <Section head={t('mkt.privacy.collectHead')}>
        {[1, 2, 3, 4].map((n) => (
          <Term key={n} term={t(`mkt.privacy.collect${n}`)}>
            {t(`mkt.privacy.collect${n}d`)}
          </Term>
        ))}
      </Section>

      <Section head={t('mkt.privacy.cookiesHead')}>
        {[1, 2, 3].map((n) => (
          <Term key={n} term={t(`mkt.privacy.cookie${n}`)}>
            {t(`mkt.privacy.cookie${n}d`)}
          </Term>
        ))}
      </Section>

      <Section head={t('mkt.privacy.useHead')}>
        <Bullets items={[1, 2, 3].map((n) => t(`mkt.privacy.use${n}`))} />
      </Section>

      <Section head={t('mkt.privacy.shareHead')}>
        <Typography variant="body2" color="text.secondary">
          {t('mkt.privacy.shareBody')}
        </Typography>
        <Bullets items={[1, 2, 3, 4, 5].map((n) => t(`mkt.privacy.share${n}`))} />
      </Section>

      <Section head={t('mkt.privacy.retentionHead')}>
        <Typography variant="body2" color="text.secondary">
          {t('mkt.privacy.retentionBody')}
        </Typography>
      </Section>

      <Section head={t('mkt.privacy.rightsHead')}>
        <Bullets items={[1, 2, 3, 4, 5, 6, 7].map((n) => t(`mkt.privacy.right${n}`))} />
      </Section>

      <Section head={t('mkt.privacy.contactHead')}>
        <Typography variant="body2" color="text.secondary">
          {t('mkt.privacy.contactBody')}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          {CONTACT_CHANNELS.map((c, i) => {
            const value = contactValue(c, lang)
            const href = contactHref(c, lang)
            return (
              <Stack key={`${c.kind}-${i}`} direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 110 }}>
                  {contactLabel(c, lang, t)}
                </Typography>
                {href ? (
                  <Link href={href} underline="hover" variant="body2" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener">
                    {value}
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {value}
                  </Typography>
                )}
              </Stack>
            )
          })}
        </Stack>
      </Section>

      <Section head={t('mkt.privacy.changesHead')}>
        <Typography variant="body2" color="text.secondary">
          {t('mkt.privacy.changesBody')}
        </Typography>
      </Section>
    </Wrap>
  )
}
