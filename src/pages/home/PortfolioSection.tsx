import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { ImageCarousel } from '../../ui/ImageCarousel'
import { joinMeta } from '../../catalog/meta'
import { Wrap, Eyebrow, CardSkeletonGrid, type WorkCard } from './shared'

/** Portfolio shown eight at a time (4×2 on desktop), paged with centre controls. */
const PAGE = 8

export function PortfolioSection({
  work,
  allWorkTo,
  loading = false,
  heading,
}: {
  work: WorkCard[]
  allWorkTo: string
  /** Catalogue still loading — show skeleton cards until the projects arrive. */
  loading?: boolean
  /** Section h2 — a service line can say what it is instead of the generic label. */
  heading?: string
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  // Back to the first page whenever the service (and so the work set) changes.
  useEffect(() => setPage(0), [allWorkTo])

  const pages = Math.ceil(work.length / PAGE)
  const safe = Math.min(page, Math.max(0, pages - 1))
  const visible = work.slice(safe * PAGE, safe * PAGE + PAGE)

  return (
    <Box id="work" component="section" sx={{ py: { xs: 4.5, md: 8 } }}>
      <Wrap>
        {/* Heading and the "see all" link share one row. */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Eyebrow>{t('mkt.home.workEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{heading ?? t('mkt.home.workHeading')}</Typography>
          </Box>
          <Button component={RouterLink} to={allWorkTo} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ flexShrink: 0 }}>
            {t('mkt.home.workAll')}
          </Button>
        </Stack>

        {loading ? (
          <CardSkeletonGrid count={PAGE} ratio="1 / 1" />
        ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {visible.map((w) => (
            // Image on top (a swipeable carousel of the job's photos, like the
            // hero), text in a white box below. The carousel falls back to the
            // category-coloured panel when a project has no photo.
            <Paper
              key={w.key}
              {...(w.to ? { component: RouterLink, to: w.to } : {})}
              elevation={0}
              sx={{
                borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                display: 'block', textDecoration: 'none', color: 'inherit',
                transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' },
              }}
            >
              {/* Square image slot (1:1) on every width. */}
              <Box sx={{ aspectRatio: '1 / 1' }}>
                <ImageCarousel images={w.images ?? []} category={w.category} alt={w.title} height="100%" rounded={false} thumb />
              </Box>
              <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography variant="caption" color="text.secondary">{joinMeta(w.place, w.year)}</Typography>
                <Typography
                  sx={{
                    fontWeight: 600, fontSize: { xs: 13, sm: 16 }, lineHeight: 1.4, mt: 0.25,
                    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
                    // Short of the 2-line boundary so Thai tone marks don't peek over the cut.
                    maxHeight: '2.85em',
                  }}
                >
                  {w.title}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
        )}

        {/* Centre pagination — only when there is more than one page (and not while the skeleton shows). */}
        {!loading && pages > 1 && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 3, alignItems: 'center', justifyContent: 'center' }}>
            <IconButton
              aria-label="previous page"
              onClick={() => setPage(Math.max(0, safe - 1))}
              disabled={safe === 0}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 48, textAlign: 'center' }}>
              {safe + 1} / {pages}
            </Typography>
            <IconButton
              aria-label="next page"
              onClick={() => setPage(Math.min(pages - 1, safe + 1))}
              disabled={safe >= pages - 1}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        )}
      </Wrap>
    </Box>
  )
}
