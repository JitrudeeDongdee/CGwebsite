import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import HomeIcon from '@mui/icons-material/Home'
import MemoryIcon from '@mui/icons-material/Memory'
import ChairIcon from '@mui/icons-material/Chair'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { IsoThumbnail } from '../ui/ItemPreview'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  )
}

const FEATURED_IDS = ['two-bed-8x6', 'three-bed-9x6', 'studio-6x4']
const RATE = 18000

export function HomePage() {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'

  const services = [
    { icon: <HomeIcon />, title: t('mkt.home.svc1'), desc: t('mkt.home.svc1d'), main: true },
    { icon: <MemoryIcon />, title: t('mkt.home.svc2'), desc: t('mkt.home.svc2d') },
    { icon: <ChairIcon />, title: t('mkt.home.svc3'), desc: t('mkt.home.svc3d') },
    { icon: <AgricultureIcon />, title: t('mkt.home.svc4'), desc: t('mkt.home.svc4d') },
  ]

  const models = FEATURED_IDS.map((id) => PLAN_TEMPLATES.find((m) => m.id === id)).filter(
    (m): m is (typeof PLAN_TEMPLATES)[number] => Boolean(m),
  )

  const work = [
    { place: 'ชัยภูมิ', year: '2567', title: t('mkt.nav.models') + ' 2 ' + t('rooms.bedroom') },
    { place: 'ขอนแก่น', year: '2566', title: t('templates.oneBed') },
    { place: 'อุดรธานี', year: '2566', title: t('templates.shop') },
  ]

  const stats = [
    { n: '250+', l: t('mkt.home.stat1') },
    { n: '12', l: t('mkt.home.stat2') },
    { n: '40+', l: t('mkt.home.stat3') },
    { n: '2', l: t('mkt.home.stat4') },
  ]

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          backgroundImage: `linear-gradient(0deg, ${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Wrap sx={{ py: { xs: 6, md: 9 } }}>
          <Box sx={{ display: 'grid', gap: 5, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
            <Box>
              <Eyebrow>{t('mkt.home.eyebrow')}</Eyebrow>
              <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 32, md: 48 }, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {t('mkt.home.title')}
              </Typography>
              <Typography sx={{ mt: 2.5, mb: 3.5, color: 'text.secondary', fontSize: 18, maxWidth: '34em' }}>
                {t('mkt.home.lead')}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={RouterLink} to="/" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
                  {t('mkt.home.ctaPrimary')}
                </Button>
                <Button component={RouterLink} to="/products" variant="outlined" size="large">
                  {t('mkt.home.ctaSecondary')}
                </Button>
              </Stack>
              <Stack direction="row" spacing={4} sx={{ mt: 4, flexWrap: 'wrap', gap: 2 }}>
                {[['trust1', 'trust1sub'], ['trust2', 'trust2sub'], ['trust3', 'trust3sub']].map(([a, b]) => (
                  <Box key={a}>
                    <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main' }}>{t(`mkt.home.${a}`)}</Typography>
                    <Typography variant="caption" color="text.secondary">{t(`mkt.home.${b}`)}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <Chip label={`${t('templates.twoBed')} · 8×6 ${t('summary.squareMeters')}`} size="small" color="primary" variant="outlined" sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'grid', placeItems: 'center', py: 1 }}>
                <IsoThumbnail state={PLAN_TEMPLATES.find((m) => m.id === 'two-bed-8x6')!.build()} size={220} />
              </Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">48 {t('summary.squareMeters')}</Typography>
                <Typography sx={{ color: 'secondary.main', fontWeight: 700 }}>{formatCurrency(864000, 'THB', locale)}</Typography>
              </Stack>
            </Paper>
          </Box>
        </Wrap>
      </Box>

      {/* Services */}
      <Box id="services" component="section" sx={{ py: 8 }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: 4.5 }}>
            <Eyebrow>{t('mkt.home.svcEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.svcHeading')}</Typography>
            <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.svcSub')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {services.map((s) => (
              <Paper
                key={s.title}
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: s.main ? 2 : 1, borderColor: s.main ? 'secondary.main' : 'divider', position: 'relative', height: '100%' }}
              >
                {s.main && (
                  <Chip label={t('mkt.home.svcMainBadge')} size="small" color="secondary" sx={{ position: 'absolute', top: 14, right: 14 }} />
                )}
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', mb: 1.5,
                    bgcolor: s.main ? 'secondary.main' : 'primary.main',
                    color: s.main ? 'secondary.contrastText' : 'primary.contrastText',
                  }}
                >
                  {s.icon}
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: 17, mb: 0.5 }}>{s.title}</Typography>
                <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
              </Paper>
            ))}
          </Box>
        </Wrap>
      </Box>

      {/* Featured models */}
      <Box id="models" component="section" sx={{ py: 8, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: 4.5 }}>
            <Eyebrow>{t('mkt.home.modelsEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.modelsHeading')}</Typography>
            <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.modelsSub')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {models.map((m) => (
              <Paper key={m.id} elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', py: 2.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                  <IsoThumbnail state={m.build()} size={120} />
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{t(m.nameKey)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" variant="outlined" label={`${m.width}×${m.depth} ${t('summary.squareMeters')}`} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 1.5 }}>
                    <Typography sx={{ color: 'secondary.main', fontWeight: 700 }}>
                      {formatCurrency(m.width * m.depth * RATE, 'THB', locale)}
                    </Typography>
                    <Button component={RouterLink} to="/" size="small" endIcon={<ArrowForwardIcon />}>
                      {t('mkt.home.modelCustomize')}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            ))}
          </Box>
        </Wrap>
      </Box>

      {/* Portfolio */}
      <Box id="work" component="section" sx={{ py: 8 }}>
        <Wrap>
          <Box sx={{ mb: 4.5 }}>
            <Eyebrow>{t('mkt.home.workEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.workHeading')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {work.map((w) => (
              <Box key={w.place} sx={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'primary.dark' }}>
                <Box
                  sx={{
                    position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                    background: 'linear-gradient(0deg, rgba(11,34,49,0.85), transparent 60%)',
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>{w.place} · {w.year}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{w.title}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Button variant="outlined" sx={{ mt: 3 }} component={RouterLink} to="/portfolio">{t('mkt.home.workAll')}</Button>
        </Wrap>
      </Box>

      {/* Stats band */}
      <Wrap>
        <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 4, p: { xs: 4, md: 5.5 } }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, textAlign: 'center' }}>
            {stats.map((s) => (
              <Box key={s.l}>
                <Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.n}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>{s.l}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Wrap>

      {/* Final CTA */}
      <Box component="section" sx={{ py: 8, textAlign: 'center' }}>
        <Wrap>
          <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 34 }, fontWeight: 600 }}>{t('mkt.home.finalHeading')}</Typography>
          <Typography sx={{ color: 'text.secondary', maxWidth: '32em', mx: 'auto', mt: 1.5, mb: 3 }}>{t('mkt.home.finalSub')}</Typography>
          <Button component={RouterLink} to="/" variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
            {t('mkt.home.finalCta')}
          </Button>
        </Wrap>
      </Box>
    </Box>
  )
}
