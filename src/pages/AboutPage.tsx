import type { ReactNode } from 'react'
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
import { SmartImage } from '../ui/SmartImage'
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
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {values.map((v) => (
            <Paper key={v.title} elevation={0} sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', mb: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                {v.icon}
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: 17, mb: 0.5 }}>{v.title}</Typography>
              <Typography variant="body2" color="text.secondary">{v.desc}</Typography>
            </Paper>
          ))}
        </Box>

        {/* CEO */}
        <Box
          sx={{
            mt: 7,
            display: 'grid',
            gap: { xs: 3, md: 5 },
            gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' },
            alignItems: 'center',
          }}
        >
          <Box sx={{ aspectRatio: '1 / 1', borderRadius: 4, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
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
