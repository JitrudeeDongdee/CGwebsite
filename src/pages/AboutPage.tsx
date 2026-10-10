import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import VerifiedIcon from '@mui/icons-material/Verified'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import HandshakeIcon from '@mui/icons-material/Handshake'
import BoltIcon from '@mui/icons-material/Bolt'
import PersonIcon from '@mui/icons-material/Person'
import ConstructionIcon from '@mui/icons-material/Construction'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { SmartImage } from '../ui/SmartImage'
import { useCatalog } from '../catalog/CatalogProvider'
import { useLocalized } from '../catalog/useLocalized'
import { projectImagePaths, projectPath } from '../catalog/images'
import { PortfolioSection } from './home/PortfolioSection'
import type { WorkCard } from './home/shared'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useSeo } from '../seo/useSeo'
import { formatCapital, formatIsoDate, type Certificate } from '../content/company'
import { useCompany } from '../company/CompanyProvider'
import { documentUrl } from '../supabase/storage'
import { CONTACT_CHANNELS, contactValue } from '../content/contact'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function AboutPage() {
  const { t } = useTranslation()
  useSeo({ title: t('mkt.about.title'), description: t('mkt.about.body') })
  const values = [
    { icon: <VerifiedIcon />, title: t('mkt.about.val1'), desc: t('mkt.about.val1d') },
    { icon: <HandshakeIcon />, title: t('mkt.about.val2'), desc: t('mkt.about.val2d') },
    { icon: <BoltIcon />, title: t('mkt.about.val3'), desc: t('mkt.about.val3d') },
    { icon: <ConstructionIcon />, title: t('mkt.about.val4'), desc: t('mkt.about.val4d') },
  ]
  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        {/* The intro is context, not the pitch — at 30/18px it filled a phone
            screen before the reader reached a single card. */}
        <Wrap sx={{ py: { xs: 4, md: 8 } }}>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: { xs: 11, md: 12 }, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.about.eyebrow')}
          </Typography>
          <Typography variant="h1" sx={{ mt: { xs: 1, md: 1.5 }, fontSize: { xs: 23, md: 42 }, lineHeight: 1.3, fontWeight: 600, maxWidth: '18em' }}>
            {t('mkt.about.title')}
          </Typography>
          <Typography sx={{ mt: { xs: 1.5, md: 2.5 }, color: 'text.secondary', fontSize: { xs: 14.5, md: 18 }, lineHeight: 1.65, maxWidth: '46em' }}>
            {t('mkt.about.body')}
          </Typography>
        </Wrap>
      </Box>

      <Wrap sx={{ py: { xs: 5, md: 8 } }}>
        {/* On a phone the CEO comes first and the supporting points follow him;
            on desktop the four cards still lead, where they cost no scrolling.
            Done with `order` rather than two copies of the markup — the DOM
            keeps the desktop order, which is the sensible reading order either
            way (both blocks are self-contained). */}
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* Two per row on a phone, and compact: these are supporting points, so
            on a small screen the icon sits beside the title rather than above
            it and the card gives its height back to the CEO block below. */}
        <Box
          sx={{
            order: { xs: 2, sm: 1 },
            mt: { xs: 4, sm: 0 },
            display: 'grid', gap: { xs: 1, sm: 2 },
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          }}
        >
          {values.map((v) => (
            <Paper key={v.title} elevation={0} sx={{ p: { xs: 1.25, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider' }}>
              <Stack
                direction={{ xs: 'row', sm: 'column' }}
                spacing={{ xs: 1, sm: 0 }}
                sx={{ alignItems: { xs: 'center', sm: 'stretch' }, mb: { xs: 0.75, sm: 0 } }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: { xs: 28, sm: 44 }, height: { xs: 28, sm: 44 },
                    borderRadius: 2, display: 'grid', placeItems: 'center', mb: { sm: 1.5 },
                    bgcolor: 'primary.main', color: 'primary.contrastText',
                    '& .MuiSvgIcon-root': { fontSize: { xs: 17, sm: 24 } },
                  }}
                >
                  {v.icon}
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, sm: 17 }, mb: { sm: 0.5 } }}>{v.title}</Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: 12.5, sm: 14 }, lineHeight: 1.55 }}
              >
                {v.desc}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* CEO */}
        <Box
          sx={{
            order: { xs: 1, sm: 2 },
            mt: { xs: 0, md: 7 },
            display: 'grid',
            gap: { xs: 0, md: 5 },
            gridTemplateColumns: { xs: '1fr', sm: '380px 1fr' },
            alignItems: 'center',
          }}
        >
          {/* On a phone the portrait leads, full width and portrait-shaped, with
              the name set over it — a shrunk square in the middle of the column
              read as an afterthought rather than as the face of the company. */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: { xs: '4 / 5', sm: '1 / 1' },
              borderRadius: 4,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {/* Shows public/team/ceo.jpg once it exists; placeholder until then. */}
            <SmartImage
              src="team/ceo.jpg"
              alt={t('mkt.about.ceoName')}
              fallback={
                <Box
                  sx={{
                    width: '100%', height: '100%', bgcolor: 'background.paper',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 1, color: 'text.disabled',
                  }}
                >
                  <PersonIcon sx={{ fontSize: 72 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, textAlign: 'center' }}>
                    {t('mkt.about.ceoPhotoNote')}
                  </Typography>
                </Box>
              }
            />
            <Box
              sx={{
                display: { xs: 'flex', sm: 'none' },
                position: 'absolute', inset: 0, p: 2.5,
                flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                background: 'linear-gradient(0deg, rgba(11,34,49,0.92), transparent 55%)',
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>
                {t('mkt.about.ceoEyebrow')}
              </Typography>
              <Typography variant="h2" sx={{ mt: 0.5, fontSize: 26, fontWeight: 600 }}>
                {t('mkt.about.ceoName')}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>{t('mkt.about.ceoTitle')}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: { xs: 2.5, sm: 0 } }}>
            {/* The name plate above already carries these on a phone. */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {t('mkt.about.ceoEyebrow')}
              </Typography>
              <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 22, md: 28 }, fontWeight: 600 }}>
                {t('mkt.about.ceoName')}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {t('mkt.about.ceoTitle')}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontStyle: 'italic', maxWidth: '32em', color: 'text.primary' }}>
              {t('mkt.about.ceoQuote')}
            </Typography>
          </Box>
        </Box>
        </Box>

        <LegalInfo />

        <Certificates />
      </Wrap>

      {/* Full-width, so the shared PortfolioSection's own Wrap sets the gutter
          (nesting it inside the page Wrap would double the side padding). */}
      <WorkStrip />

      <Wrap sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          <Button component={RouterLink} to="/design" variant="contained" color="secondary" size="large">
            {t('mkt.nav.designCta')}
          </Button>
          <Button component={RouterLink} to="/contact" variant="outlined" size="large">
            {t('mkt.nav.contact')}
          </Button>
        </Stack>
      </Wrap>
    </Box>
  )
}

/**
 * Legal-entity facts (from the DBD registration) — a trust block for a business
 * where customers commit real money. Values come from the `company_info` table
 * (edited at /admin/company), with `content/company.ts` as the fallback; empty
 * ones are dropped so nothing shows blank. The address is read from contact.json
 * (one source), and `legalStatus` renders as a green chip.
 */
function LegalInfo() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const { info: company } = useCompany()
  const address = CONTACT_CHANNELS.find((c) => c.kind === 'address')
  const addressText = address ? contactValue(address, lang) : ''

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: t('mkt.about.legalName'), value: L(company.legalName) },
    { label: t('mkt.about.legalReg'), value: company.registrationNo, mono: true },
    { label: t('mkt.about.legalDate'), value: formatIsoDate(company.registeredOn, lang) },
    { label: t('mkt.about.legalCapital'), value: formatCapital(company.capital, lang) },
    { label: t('mkt.about.legalBiz'), value: L(company.businessType) },
    { label: t('mkt.about.legalActivities'), value: L(company.activities) },
    { label: t('mkt.about.legalAddress'), value: addressText },
  ].filter((r) => r.value && r.value !== '—' && r.value !== '-')

  return (
    <Box sx={{ mt: { xs: 6, md: 9 } }}>
      <Paper
        elevation={0}
        sx={{ borderRadius: 4, border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 4 } }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              flexShrink: 0, width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center',
              bgcolor: 'primary.main', color: 'primary.contrastText',
            }}
          >
            <VerifiedUserIcon />
          </Box>
          <Box>
            <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {t('mkt.about.legalEyebrow')}
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 600, lineHeight: 1.3 }}>
              {t('mkt.about.legalHeading')}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
          {t('mkt.about.legalSub')}
          {L(company.status) && (
            <Box
              component="span"
              sx={{
                ml: 1, px: 1, py: 0.25, borderRadius: 1, fontSize: 12, fontWeight: 600,
                color: 'success.dark', bgcolor: 'success.light', whiteSpace: 'nowrap',
              }}
            >
              {L(company.status)}
            </Box>
          )}
        </Typography>

        <Box
          component="dl"
          sx={{
            mt: 3, mb: 0, display: 'grid', gap: { xs: 1.75, md: 2 },
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          {rows.map((r) => (
            <Box key={r.label}>
              <Typography component="dt" variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {r.label}
              </Typography>
              <Typography
                component="dd"
                sx={{ m: 0, mt: 0.25, fontWeight: 500, fontFamily: r.mono ? 'ui-monospace, monospace' : undefined, letterSpacing: r.mono ? '0.03em' : undefined }}
              >
                {r.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}

/**
 * Licences, registrations and certificates, uploaded at /admin/certificates.
 *
 * Each card opens the real file — a scan anyone can zoom into says more than a
 * list of claims. Hidden entirely when there is nothing to show (expired and
 * unpublished documents are already filtered out by `CompanyProvider`).
 */
function Certificates() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const { certificates } = useCompany()
  if (certificates.length === 0) return null

  return (
    <Box sx={{ mt: { xs: 6, md: 9 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            flexShrink: 0, width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center',
            bgcolor: 'secondary.main', color: 'secondary.contrastText',
          }}
        >
          <WorkspacePremiumIcon />
        </Box>
        <Box>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.about.certEyebrow')}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 600, lineHeight: 1.3 }}>
            {t('mkt.about.certHeading')}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.about.certSub')}</Typography>

      {/* Flex-wrap rather than a grid so a short row is CENTRED: a grid would
          leave one or two documents hugging the left edge. Card widths are the
          same as the 2- and 4-column grid would give (gap 12px / 20px). */}
      <Box
        sx={{
          mt: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: { xs: 1.5, md: 2.5 },
          '& > *': { width: { xs: 'calc((100% - 12px) / 2)', md: 'calc((100% - 60px) / 4)' } },
        }}
      >
        {certificates.map((c) => (
          <CertificateCard key={c.id} cert={c} lang={lang} title={L(c.title)} issuer={c.issuer ? L(c.issuer) : ''} />
        ))}
      </Box>
    </Box>
  )
}

function CertificateCard({ cert, lang, title, issuer }: { cert: Certificate; lang: 'th' | 'en'; title: string; issuer: string }) {
  const { t } = useTranslation()
  const href = documentUrl(cert.filePath)
  const meta = [
    issuer && `${t('mkt.about.certIssuer')} ${issuer}`,
    cert.docNo && `${t('mkt.about.certNo')} ${cert.docNo}`,
    cert.issuedOn && `${t('mkt.about.certIssued')} ${formatIsoDate(cert.issuedOn, lang)}`,
    cert.expiresOn && `${t('mkt.about.certExpires')} ${formatIsoDate(cert.expiresOn, lang)}`,
  ].filter(Boolean) as string[]
  const pdfTile = (
    <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'error.main', bgcolor: 'action.hover' }}>
      <Stack sx={{ alignItems: 'center', gap: 0.5 }}>
        <PictureAsPdfIcon sx={{ fontSize: 44 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('mkt.about.certPdf')}</Typography>
      </Stack>
    </Box>
  )

  return (
    <Paper
      elevation={0}
      component="a"
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`${t('mkt.about.certOpen')}: ${title}`}
      sx={{
        borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden', textDecoration: 'none', color: 'inherit',
        display: 'flex', flexDirection: 'column', transition: 'border-color .15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      {/* Portrait box: certificates are A4. `contain`, never `cover` — a
          document cropped at the edges looks like it is hiding something. */}
      <Box sx={{ aspectRatio: '3 / 4', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
        {cert.fileType === 'image' ? (
          <SmartImage
            src={href}
            alt={title}
            fallback={pdfTile}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          pdfTile
        )}
      </Box>
      <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, md: 15 }, lineHeight: 1.45 }}>{title}</Typography>
        {meta.map((line) => (
          <Typography key={line} variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{line}</Typography>
        ))}
        <Typography variant="caption" sx={{ mt: 'auto', pt: 0.75, color: 'primary.main', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {t('mkt.about.certOpen')} <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Typography>
      </Box>
    </Paper>
  )
}

/**
 * Work from every service line, side by side in one horizontal rail.
 *
 * A rail rather than a grid on purpose: the point here is breadth — that TDD
 * does houses AND contracting AND systems AND furniture — and a rail shows a
 * dozen jobs in the height of one row. Native scrolling does the work (so touch
 * and trackpad already behave); the arrows are just a mouse affordance.
 */
function WorkStrip() {
  const L = useLocalized()
  const { projects } = useCatalog()

  if (projects.length === 0) return null

  // The same card section as /home/:service, over every delivered project.
  const work: WorkCard[] = projects.map((p) => ({
    key: p.id,
    place: L(p.location),
    year: p.year,
    title: L(p.title),
    to: projectPath(p),
    images: projectImagePaths(p),
    category: p.category,
  }))

  return <PortfolioSection work={work} allWorkTo="/portfolio" />
}
