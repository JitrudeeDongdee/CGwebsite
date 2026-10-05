import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { CatalogImage } from '../../catalog/CatalogImage'
import { joinMeta } from '../../catalog/meta'
import { Wrap, Eyebrow, type WorkCard } from './shared'

/** Portfolio shown eight at a time (4×2 on desktop), paged with centre controls. */
const PAGE = 8

export function PortfolioSection({ work, allWorkTo }: { work: WorkCard[]; allWorkTo: string }) {
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
        <Stack direction="row" sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Eyebrow>{t('mkt.home.workEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.workHeading')}</Typography>
          </Box>
          <Button component={RouterLink} to={allWorkTo} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ flexShrink: 0 }}>
            {t('mkt.home.workAll')}
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {visible.map((w) => (
            <Box
              key={w.key}
              {...(w.to ? { component: RouterLink, to: w.to } : {})}
              sx={{
                position: 'relative', aspectRatio: '4 / 3', borderRadius: 3, overflow: 'hidden',
                border: 1, borderColor: 'divider', bgcolor: 'primary.dark',
                display: 'block', textDecoration: 'none',
              }}
            >
              {/* Cover photo behind the caption; falls back to the category-coloured
                  panel (CatalogImage's own fallback) when a project has no image. */}
              {w.img && (
                <Box sx={{ position: 'absolute', inset: 0 }}>
                  <CatalogImage src={w.img} category={w.category} alt={w.title} height="100%" />
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                  background: 'linear-gradient(0deg, rgba(11,34,49,0.85), transparent 60%)',
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.85 }}>{joinMeta(w.place, w.year)}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{w.title}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Centre pagination — only when there is more than one page. */}
        {pages > 1 && (
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
