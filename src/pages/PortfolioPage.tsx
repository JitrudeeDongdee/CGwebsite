import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Pagination from '@mui/material/Pagination'
import { useCatalog } from '../catalog/CatalogProvider'
import { joinMeta } from '../catalog/meta'
import { CatalogImage } from '../catalog/CatalogImage'
import { projectImagePath, projectPath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'
import { matchesQuery, paginate, useCatalogQuery } from '../catalog/useCatalogQuery'
import { CatalogToolbar } from '../ui/CatalogToolbar'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

/** Projects per page in the portfolio grid. */
const PAGE_SIZE = 6

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

export function PortfolioPage() {
  const { t } = useTranslation()
  const L = useLocalized()

  const { cat, query, requestedPage, update } = useCatalogQuery()

  const { projects: allProjects } = useCatalog()
  const matches = (cat === 'all' ? allProjects : allProjects.filter((p) => p.category === cat)).filter((p) =>
    matchesQuery(
      [p.title.th, p.title.en, p.location.th, p.location.en, p.description.th, p.description.en, p.year, p.slug],
      query,
    ),
  )
  // Starred work leads the list — that is what the star is for, and on a page
  // that paginates at six, an unsorted featured item can land on page 3.
  // `sort` on the array `filter` just produced, so the catalog order is intact.
  const ordered = matches.sort((a, b) => Number(b.featured) - Number(a.featured))
  const { page, pageCount, items: projects } = paginate(ordered, requestedPage, PAGE_SIZE)

  return (
    <Wrap sx={{ py: { xs: 5, md: 7 } }}>
      <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {t('mkt.portfolio.eyebrow')}
      </Typography>
      <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 28, md: 38 }, fontWeight: 600 }}>
        {t('mkt.portfolio.title')}
      </Typography>
      <Typography sx={{ mt: 1.5, color: 'text.secondary', maxWidth: '44em' }}>{t('mkt.portfolio.sub')}</Typography>

      <CatalogToolbar
        category={cat}
        query={query}
        onCategory={(next) => update({ category: next })}
        onQuery={(next) => update({ q: next })}
        searchPlaceholder={t('mkt.catalog.searchWork')}
        resultCount={matches.length}
      />

      {matches.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 4 }}>{t('mkt.catalog.noResultsWork')}</Typography>
      )}

      <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 2 }, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, mt: 2 }}>
        {projects.map((p) => (
          <Box
            key={p.id}
            component={RouterLink}
            to={projectPath(p)}
            sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: 1, borderColor: 'divider', textDecoration: 'none', display: 'block', transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CatalogImage src={projectImagePath(p)} category={p.category} alt={L(p.title)} />
            <Box
              sx={{
                position: 'absolute', inset: 0, p: { xs: 1.25, sm: 2 }, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                background: { xs: 'linear-gradient(0deg, rgba(11,34,49,0.92), transparent 70%)', sm: 'linear-gradient(0deg, rgba(11,34,49,0.88), transparent 55%)' },
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: { xs: 11, sm: 12 } }}>
                {joinMeta(L(p.location), p.year)}
              </Typography>
              {/* Two columns are ~157px wide: a long Thai title would fill the
                  whole card, so it is capped at three lines over the photo. */}
              <Typography
                sx={{
                  fontWeight: 600, fontSize: { xs: 13, sm: 16 }, lineHeight: 1.4,
                  display: '-webkit-box', WebkitBoxOrient: 'vertical',
                  // A two-column card is only ~118px tall: at three lines the
                  // caption covered the photo it is captioning.
                  WebkitLineClamp: { xs: 2, sm: 3 }, overflow: 'hidden',
                  // Short of the line boundary, so Thai tone marks from the
                  // clipped line do not peek over the cut.
                  maxHeight: { xs: '2.5em', sm: '3.9em' },
                }}
              >
                {L(p.title)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {pageCount > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'center', mt: 4 }}>
          <Pagination page={page} count={pageCount} color="primary" shape="rounded" onChange={(_, next) => update({ page: next })} />
        </Stack>
      )}
    </Wrap>
  )
}
