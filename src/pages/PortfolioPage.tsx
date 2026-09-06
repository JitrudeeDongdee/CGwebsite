import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { PROJECTS } from '../catalog/projects'
import { CatalogImage } from '../catalog/CatalogImage'
import { useLocalized } from '../catalog/useLocalized'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function PortfolioPage() {
  const { t } = useTranslation()
  const L = useLocalized()

  return (
    <Wrap sx={{ py: { xs: 5, md: 7 } }}>
      <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {t('mkt.portfolio.eyebrow')}
      </Typography>
      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 28, md: 38 }, fontWeight: 600 }}>
        {t('mkt.portfolio.title')}
      </Typography>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', maxWidth: '44em' }}>{t('mkt.portfolio.sub')}</Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 3 }}>
        {PROJECTS.map((p) => (
          <Box
            key={p.id}
            component={RouterLink}
            to={`/portfolio/${p.slug}`}
            sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', textDecoration: 'none', display: 'block', transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CatalogImage src={`portfolio/${p.slug}.jpg`} category={p.category} alt={L(p.title)} />
            <Box
              sx={{
                position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                background: 'linear-gradient(0deg, rgba(11,34,49,0.88), transparent 55%)',
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.85 }}>{L(p.location)} · {p.year}</Typography>
              <Typography sx={{ fontWeight: 600 }}>{L(p.title)}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Wrap>
  )
}
