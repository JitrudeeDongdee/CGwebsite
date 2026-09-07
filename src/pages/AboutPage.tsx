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
