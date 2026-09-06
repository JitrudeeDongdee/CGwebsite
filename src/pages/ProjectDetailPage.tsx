import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import { useProject } from '../catalog/CatalogProvider'
import { CATEGORY_META } from '../catalog/categories'
import { CatalogImage } from '../catalog/CatalogImage'
import { useLocalized } from '../catalog/useLocalized'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const L = useLocalized()
  const { slug } = useParams()
  const project = useProject(slug)

  if (!project) {
    return (
      <Wrap sx={{ py: 8 }}>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>{t('mkt.catalog.notFound')}</Typography>
        <Link component={RouterLink} to="/portfolio" sx={{ mt: 2, display: 'inline-block' }}>{t('mkt.catalog.backToPortfolio')}</Link>
      </Wrap>
    )
  }

  return (
    <Wrap sx={{ py: { xs: 4, md: 6 } }}>
      <Link component={RouterLink} to="/portfolio" color="text.secondary" sx={{ fontSize: 14 }}>
        {t('mkt.catalog.backToPortfolio')}
      </Link>

      <Paper elevation={0} sx={{ mt: 2, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <CatalogImage src={`portfolio/${project.slug}.jpg`} category={project.category} alt={L(project.title)} ratio="16 / 9" />
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip size="small" variant="outlined" label={t(CATEGORY_META[project.category].labelKey)} />
        <Typography variant="body2" color="text.secondary">
          {L(project.location)} · {project.year}{project.area ? ` · ${project.area}` : ''}
        </Typography>
      </Stack>

      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 26, md: 34 }, fontWeight: 600 }}>{L(project.title)}</Typography>
      <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: '46em', fontSize: 18 }}>{L(project.description)}</Typography>

      <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Button component={RouterLink} to="/design" variant="contained" color="secondary" size="large">{t('mkt.nav.designCta')}</Button>
        <Button component={RouterLink} to="/products" variant="outlined" size="large">{t('mkt.nav.products')}</Button>
      </Stack>
    </Wrap>
  )
}
