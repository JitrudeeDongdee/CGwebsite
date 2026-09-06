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
import { useProductById, useProject } from '../catalog/CatalogProvider'
import { CATEGORY_META } from '../catalog/categories'
import type { ProjectSource } from '../catalog/types'
import { CatalogImage } from '../catalog/CatalogImage'
import { productImagePath, projectImagePath, projectImagePaths, projectPath } from '../catalog/images'
import { formatCurrency } from '../pricing/estimate'
import { ImageGallery } from '../ui/ImageGallery'
import { useLocalized } from '../catalog/useLocalized'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function ProjectDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'
  const L = useLocalized()
  const { service, slug } = useParams()
  const project = useProject(slug)
  // Every hook runs before the early returns below — a hook after them would be
  // skipped on the "not found" render and break the hook order.
  const relatedProduct = useProductById(project?.productId)

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
  // A job is often posted about more than once — start, progress, handover.
  // Several posts become a timeline below the text; a single one is not a
  // timeline, so it collapses to one "ดูโพสต์ต้นฉบับ" button.
  const sources = project.sources ?? []
  const timeline: ProjectSource[] = sources.length > 1 ? sources : []
  const lone = sources.length === 1 ? sources[0] : undefined
  const sourceUrl = sources[0]?.url ?? project.sourceUrl

  // The page always opens with the cover — hiding it because it also belongs to a
  // timeline update left the page starting with a wall of text. After it come the
  // photos that belong to no *rendered* update; each update shows its own further
  // down. A lone update has no timeline to show its photos in, so they stay loose
  // — filtering on `sources` instead of `timeline` here dropped them from the page
  // entirely (a one-post job showed its cover and nothing else).
  const timelinePhotos = new Set(timeline.flatMap((source) => source.images ?? []))
  const cover = projectImagePath(project)
  const photos = [cover, ...projectImagePaths(project).filter((path) => path !== cover && !timelinePhotos.has(path))]

  return (
    <Wrap sx={{ py: { xs: 4, md: 6 } }}>
      <Link component={RouterLink} to="/portfolio" color="text.secondary" sx={{ fontSize: 14 }}>
        {t('mkt.catalog.backToPortfolio')}
      </Link>

      {/* Loose photos lead the page. When every photo belongs to an update the
          timeline carries them instead, and only a project with no photos at all
          falls back to the category placeholder. */}
      {photos.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <ImageGallery paths={photos} alt={L(project.title)} />
        </Box>
      ) : (
        timelinePhotos.size === 0 && (
          <Paper elevation={0} sx={{ mt: 2, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
            <CatalogImage src={projectImagePath(project)} category={project.category} alt={L(project.title)} ratio="16 / 9" />
          </Paper>
        )
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip size="small" variant="outlined" label={t(CATEGORY_META[project.category].labelKey)} />
        <Typography variant="body2" color="text.secondary">
          {L(project.location)} · {project.year}{project.area ? ` · ${project.area}` : ''}
        </Typography>
      </Stack>

      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 26, md: 34 }, fontWeight: 600 }}>{L(project.title)}</Typography>
      <Typography sx={{ mt: 2, color: 'text.secondary', maxWidth: '46em', fontSize: 18 }}>{L(project.description)}</Typography>
      {/* A lone update renders no timeline entry, so its own words would vanish
          with it. Shown only when they add something the description does not. */}
      {lone?.caption && L(lone.caption).trim() && L(lone.caption).trim() !== L(project.description).trim() && (
        <Typography sx={{ mt: 1.5, color: 'text.secondary', maxWidth: '46em', whiteSpace: 'pre-line' }}>
          {L(lone.caption)}
        </Typography>
      )}

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
        {/* The write-up and images above are ours; this just points at where the
            job was posted. With several posts the timeline below replaces it. */}
        {timeline.length === 0 && sourceUrl && (
          <Button
            href={sourceUrl}
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

      {relatedProduct && (
        <Paper
          component={RouterLink}
          to={`/products/${relatedProduct.slug || relatedProduct.id}`}
          elevation={0}
          sx={{
            mt: 4, p: 2, borderRadius: 3, border: 1, borderColor: 'divider', display: 'flex', gap: 2,
            alignItems: 'center', textDecoration: 'none', color: 'inherit', maxWidth: 520,
            transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 96, flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>
            <CatalogImage src={productImagePath(relatedProduct)} category={relatedProduct.category} alt={L(relatedProduct.name)} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">{t('mkt.catalog.relatedProduct')}</Typography>
            <Typography sx={{ fontWeight: 600 }} noWrap>{L(relatedProduct.name)}</Typography>
            <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>
              {relatedProduct.priceFrom == null
                ? t('mkt.catalog.quote')
                : `${t('mkt.catalog.from')} ${formatCurrency(relatedProduct.priceFrom, 'THB', locale)}`}
            </Typography>
          </Box>
        </Paper>
      )}

      {timeline.length > 1 && (
        <Box sx={{ mt: 5 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 600, mb: 2 }}>
            {t('mkt.catalog.updatesHead')}
          </Typography>
          <Stack sx={{ pl: 1 }}>
            {timeline.map((source, index) => (
              <Stack key={source.url ?? index} direction="row" spacing={2}>
                {/* Dot + connecting line: the line stops after the last entry. */}
                <Stack sx={{ alignItems: 'center', flexShrink: 0 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'secondary.main', mt: 0.6 }} />
                  {index < timeline.length - 1 && <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 0.5 }} />}
                </Stack>
                <Box sx={{ pb: index < timeline.length - 1 ? 3.5 : 0, minWidth: 0, flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {source.label || t('mkt.catalog.updateStep', { n: index + 1 })}
                  </Typography>
                  {source.caption && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '46em', whiteSpace: 'pre-line' }}>
                      {L(source.caption)}
                    </Typography>
                  )}
                  {source.images && source.images.length > 0 && (
                    <Box sx={{ mt: 1, maxWidth: 560 }}>
                      <ImageGallery paths={source.images} alt={source.label ?? L(project.title)} />
                    </Box>
                  )}
                  {source.url && (
                    <Link
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      variant="body2"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1 }}
                    >
                      {t('mkt.catalog.viewSource')}
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </Link>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Wrap>
  )
}
