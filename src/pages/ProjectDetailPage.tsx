import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useProject } from '../catalog/CatalogProvider'
import { CATEGORY_META } from '../catalog/categories'
import { CatalogImage } from '../catalog/CatalogImage'
import { projectImagePath, projectPath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const L = useLocalized()
  const { service, slug } = useParams()
  const project = useProject(slug)

  if (!project) {
    return (
      <Wrap sx={{ py: 8 }}>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>{t('mkt.catalog.notFound')}</Typography>
        <Link component={RouterLink} to="/portfolio" sx={{ mt: 2, display: 'inline-block' }}>{t('mkt.catalog.backToPortfolio')}</Link>
      </Wrap>
    )
  }

  // `/portfolio/<slug>` (and a wrong category in the path) redirects to the
  // canonical `/portfolio/<category>/<slug>` rather than rendering a duplicate.
  const canonical = projectPath(project)
  if (service !== project.category) return <Navigate to={canonical} replace />

  // House work sends people to the designer; every other line to a conversation.
  const isHouse = project.category === 'house'

  return (
    <Wrap sx={{ py: { xs: 4, md: 6 } }}>
      <Link component={RouterLink} to="/portfolio" color="text.secondary" sx={{ fontSize: 14 }}>
        {t('mkt.catalog.backToPortfolio')}
      </Link>

      <Paper elevation={0} sx={{ mt: 2, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <CatalogImage src={projectImagePath(project)} category={project.category} alt={L(project.title)} ratio="16 / 9" />
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
        <Button
          component={RouterLink}
          to={isHouse ? '/design' : '/contact'}
          variant="contained"
          color="secondary"
          size="large"
        >
          {isHouse ? t('mkt.nav.designCta') : t('mkt.service.ctaContact')}
        </Button>
        <Button component={RouterLink} to={`/home/${project.category}`} variant="outlined" size="large">
          {t(CATEGORY_META[project.category].labelKey)}
        </Button>
        <Button component={RouterLink} to={`/products?category=${project.category}`} size="large">
          {t('mkt.service.allProducts')}
        </Button>
        {/* The write-up and images above are ours; this just points at where the
            job was first posted. Only rendered when a project actually has one. */}
        {project.sourceUrl && (
          <Button
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="text"
            size="large"
            endIcon={<OpenInNewIcon />}
          >
            {t('mkt.catalog.viewSource')}
          </Button>
        )}
      </Stack>
    </Wrap>
  )
}
