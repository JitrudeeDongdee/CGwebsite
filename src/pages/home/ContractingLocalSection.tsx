import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Wrap, Eyebrow } from './shared'
import { CONTACT_CHANNELS, contactValue } from '../../content/contact'

/**
 * Local-search copy for the contracting line (`/home/contracting` only).
 *
 * The page already led with "รับเหมาก่อสร้าง … เพชรบูรณ์", but measured on
 * 2026-10-07 the word "ผู้รับเหมา" appeared nowhere, "รับเหมาก่อสร้าง" twice,
 * and the h2s were generic ("สินค้าในหมวดนี้"). People search the same need in
 * several phrasings and by district, so this section says — in plain sentences,
 * not a keyword dump — what work is taken, that small jobs are welcome, and that
 * the whole province (every district, named) is covered. Both facts were
 * confirmed by the owner; the work types and agencies come from real portfolio
 * entries, so nothing here is invented.
 *
 * The FAQ is real body text (MUI keeps collapsed AccordionDetails mounted, so
 * the prerendered HTML carries every answer) plus FAQPage JSON-LD. Google only
 * shows FAQ rich results for government/health sites since 2023, so the markup
 * is for understanding, not for a snippet — the visible text is what matters.
 */

const FAQ_COUNT = 5
const WORK_COUNT = 8

export function ContractingLocalSection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const phoneChannel = CONTACT_CHANNELS.find((c) => c.kind === 'phone')
  const phone = phoneChannel ? contactValue(phoneChannel, lang) : ''

  const districts = t('mkt.contractingLocal.districts', { returnObjects: true }) as string[]
  const work = Array.from({ length: WORK_COUNT }, (_, i) => t(`mkt.contractingLocal.work${i + 1}`))
  const faq = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`mkt.contractingLocal.q${i + 1}`),
    a: t(`mkt.contractingLocal.a${i + 1}`, { phone, districts: districts.join(lang === 'en' ? ', ' : ' ') }),
  }))

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }

  return (
    <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Wrap>
        <Box sx={{ maxWidth: '46em' }}>
          <Eyebrow>{t('mkt.contractingLocal.eyebrow')}</Eyebrow>
          <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
            {t('mkt.contractingLocal.heading')}
          </Typography>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.8 }}>{t('mkt.contractingLocal.intro')}</Typography>
        </Box>

        <Box sx={{ mt: { xs: 3, md: 4 }, display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box>
            <Typography variant="h3" sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 600, mb: 1.5 }}>
              {t('mkt.contractingLocal.workHead')}
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
              {work.map((w) => (
                <Box component="li" key={w} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.main', mt: '3px' }} />
                  <Typography>{w}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="h3" sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 600, mb: 1.5 }}>
              {t('mkt.contractingLocal.areaHead')}
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{t('mkt.contractingLocal.areaBody')}</Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {districts.map((d) => (
                <Box component="li" key={d}>
                  <Chip label={d} variant="outlined" size="small" />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography variant="h3" sx={{ mt: { xs: 4, md: 6 }, mb: 1.5, fontSize: { xs: 18, md: 20 }, fontWeight: 600 }}>
          {t('mkt.contractingLocal.faqHead')}
        </Typography>
        {faq.map(({ q, a }, i) => (
          <Accordion key={q} disableGutters elevation={0} defaultExpanded={i === 0} slotProps={{ heading: { component: 'h4' } }} sx={{ border: 1, borderColor: 'divider', '&:not(:last-of-type)': { borderBottom: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{q}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>{a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>
          {t('mkt.contractingLocal.ctaLead')}{' '}
          <Link component={RouterLink} to="/contact">{t('mkt.contractingLocal.ctaLink')}</Link>
        </Typography>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      </Wrap>
    </Box>
  )
}
