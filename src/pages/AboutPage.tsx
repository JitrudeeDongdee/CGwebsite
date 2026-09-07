import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import VerifiedIcon from '@mui/icons-material/Verified'
import HandshakeIcon from '@mui/icons-material/Handshake'
import BoltIcon from '@mui/icons-material/Bolt'
import PersonIcon from '@mui/icons-material/Person'
import ConstructionIcon from '@mui/icons-material/Construction'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import IconButton from '@mui/material/IconButton'
import { SmartImage } from '../ui/SmartImage'
import { CatalogImage } from '../catalog/CatalogImage'
import { joinMeta } from '../catalog/meta'
import { useCatalog } from '../catalog/CatalogProvider'
import { useLocalized } from '../catalog/useLocalized'
import { projectImagePath, projectPath } from '../catalog/images'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function AboutPage() {
  const { t } = useTranslation()
  const values = [
    { icon: <VerifiedIcon />, title: t('mkt.about.val1'), desc: t('mkt.about.val1d') },
    { icon: <HandshakeIcon />, title: t('mkt.about.val2'), desc: t('mkt.about.val2d') },
    { icon: <BoltIcon />, title: t('mkt.about.val3'), desc: t('mkt.about.val3d') },
    { icon: <ConstructionIcon />, title: t('mkt.about.val4'), desc: t('mkt.about.val4d') },
  ]
  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Wrap sx={{ py: { xs: 6, md: 8 } }}>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.about.eyebrow')}
          </Typography>
          <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 30, md: 42 }, fontWeight: 600, maxWidth: '18em' }}>
            {t('mkt.about.title')}
          </Typography>
          <Typography sx={{ mt: 2.5, color: 'text.secondary', fontSize: 18, maxWidth: '46em' }}>
            {t('mkt.about.body')}
          </Typography>
        </Wrap>
      </Box>

      <Wrap sx={{ py: 8 }}>
        {/* Two per row on a phone: stacked, these four cards ran most of a
            screen on their own before the reader reached anything else. */}
        <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {values.map((v) => (
            <Paper key={v.title} elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 44 }, height: { xs: 36, sm: 44 },
                  borderRadius: 2, display: 'grid', placeItems: 'center', mb: { xs: 1, sm: 1.5 },
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                }}
              >
                {v.icon}
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 17 }, mb: 0.5 }}>{v.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{v.desc}</Typography>
            </Paper>
          ))}
        </Box>

        {/* CEO */}
        <Box
          sx={{
            mt: 7,
            display: 'grid',
            gap: { xs: 3, md: 5 },
            gridTemplateColumns: { xs: '1fr', sm: '380px 1fr' },
            // A full-width square portrait ate half the screen on a phone.
            justifyItems: { xs: 'center', sm: 'stretch' },
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: { xs: 260, sm: 'none' }, aspectRatio: '1 / 1', borderRadius: 4, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
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
          </Box>

          <Box>
            <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {t('mkt.about.ceoEyebrow')}
            </Typography>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 22, md: 28 }, fontWeight: 600 }}>
              {t('mkt.about.ceoName')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t('mkt.about.ceoTitle')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontStyle: 'italic', maxWidth: '32em', color: 'text.primary' }}>
              {t('mkt.about.ceoQuote')}
            </Typography>
          </Box>
        </Box>

        <WorkStrip />

        <Stack direction="row" spacing={1.5} sx={{ mt: 5, flexWrap: 'wrap', gap: 1.5 }}>
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
 * Work from every service line, side by side in one horizontal rail.
 *
 * A rail rather than a grid on purpose: the point here is breadth — that TDD
 * does houses AND contracting AND systems AND furniture — and a rail shows a
 * dozen jobs in the height of one row. Native scrolling does the work (so touch
 * and trackpad already behave); the arrows are just a mouse affordance.
 */
function WorkStrip() {
  const { t } = useTranslation()
  const L = useLocalized()
  const { projects } = useCatalog()
  const rail = useRef<HTMLDivElement | null>(null)

  if (projects.length === 0) return null

  const scroll = (direction: 1 | -1) => {
    const el = rail.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <Box component="section" sx={{ mt: 8 }}>
      <Stack direction="row" sx={{ mb: 3, alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ maxWidth: '42em' }}>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.about.workEyebrow')}
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
            {t('mkt.about.workHeading')}
          </Typography>
          <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.about.workSub')}</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <IconButton aria-label={t('mkt.about.scrollPrev')} onClick={() => scroll(-1)} sx={{ border: 1, borderColor: 'divider' }}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label={t('mkt.about.scrollNext')} onClick={() => scroll(1)} sx={{ border: 1, borderColor: 'divider' }}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        ref={rail}
        sx={{
          display: 'flex', gap: 2, overflowX: 'auto', scrollSnapType: 'x mandatory',
          // Room for the cards' shadow/edge, and a scrollbar that does not sit
          // on top of the cards on the platforms that always show one.
          pb: 1.5,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-thumb': { borderRadius: 4, bgcolor: 'divider' },
        }}
      >
        {projects.map((project) => (
          <Box
            key={project.id}
            component={RouterLink}
            to={projectPath(project)}
            sx={{
              flex: '0 0 auto', width: { xs: 260, md: 300 }, scrollSnapAlign: 'start',
              position: 'relative', aspectRatio: '4 / 3', borderRadius: 3, overflow: 'hidden',
              border: 1, borderColor: 'divider', bgcolor: 'primary.dark', textDecoration: 'none',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0 }}>
              <CatalogImage src={projectImagePath(project)} category={project.category} alt={L(project.title)} height="100%" />
            </Box>
            <Box
              sx={{
                position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                color: '#fff', background: 'linear-gradient(0deg, rgba(11,34,49,0.85), transparent 60%)',
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {joinMeta(L(project.location), project.year)}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{L(project.title)}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Button component={RouterLink} to="/portfolio" variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ mt: 2.5 }}>
        {t('mkt.about.workAll')}
      </Button>
    </Box>
  )
}
