import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { ensureMarketingI18n } from '../marketing/i18n'
import { CATEGORY_META } from '../catalog/categories'
import { useLocalized } from '../catalog/useLocalized'
import { ARTICLES, useArticleDate } from '../content/articles'
import { useSeo } from '../seo/useSeo'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/**
 * `/articles` — knowledge articles that answer what people search before they
 * hire a contractor. Content lives in `src/content/articles.json`.
 */
export function ArticlesPage() {
  const { t } = useTranslation()
  const L = useLocalized()
  const fmt = useArticleDate()
  useSeo({ title: t('mkt.articles.title'), description: t('mkt.articles.sub') })

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Wrap sx={{ py: { xs: 4, md: 7 } }}>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.articles.eyebrow')}
          </Typography>
          <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 28, md: 42 }, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {t('mkt.articles.title')}
          </Typography>
          <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: { xs: 16, md: 18 }, maxWidth: '40em' }}>
            {t('mkt.articles.sub')}
          </Typography>
        </Wrap>
      </Box>

      <Wrap sx={{ py: { xs: 4, md: 7 } }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          {ARTICLES.map((a) => {
            const meta = CATEGORY_META[a.category]
            return (
              <Paper
                key={a.slug}
                component={RouterLink}
                to={`/articles/${a.slug}`}
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3 }, borderRadius: 3, border: 1, borderColor: 'divider', textDecoration: 'none', color: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 1.5, transition: 'border-color .15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Chip size="small" icon={<Box component="span" sx={{ display: 'flex', '& svg': { fontSize: 16 } }}>{meta.icon}</Box>} label={t(meta.labelKey)}
                  sx={{ alignSelf: 'flex-start', bgcolor: `${meta.color}14`, color: meta.color, '& .MuiChip-icon': { color: meta.color } }} />
                <Typography variant="h2" sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 600, lineHeight: 1.4 }}>{L(a.title)}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 15, lineHeight: 1.7 }}>{L(a.description)}</Typography>
                <Typography sx={{ mt: 'auto', color: 'text.secondary', fontSize: 13 }}>{fmt(a.published)}</Typography>
              </Paper>
            )
          })}
        </Box>
      </Wrap>
    </Box>
  )
}
