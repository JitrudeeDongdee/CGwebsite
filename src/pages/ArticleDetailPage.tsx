import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { ensureMarketingI18n } from '../marketing/i18n'
import { CATEGORY_META } from '../catalog/categories'
import { useLocalized } from '../catalog/useLocalized'
import { getArticle, useArticleDate } from '../content/articles'
import { CONTACT_CHANNELS, contactHref, contactValue } from '../content/contact'
import { useSeo } from '../seo/useSeo'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 760, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/**
 * `/articles/:slug` — one knowledge article: headings, paragraphs, bullet
 * lists, the real jobs/products that back it up, and a call to action.
 *
 * Carries `BlogPosting` JSON-LD so search engines read it as an article with an
 * author and date rather than as another service page.
 */
export function ArticleDetailPage() {
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const fmt = useArticleDate()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const article = getArticle(useParams().slug)

  useSeo({
    title: article ? L(article.title) : undefined,
    description: article ? L(article.description) : undefined,
  })

  if (!article) {
    return (
      <Wrap sx={{ py: 8 }}>
        <Typography variant="h2" sx={{ fontWeight: 600 }}>{t('mkt.articles.notFound')}</Typography>
        <Link component={RouterLink} to="/articles" sx={{ mt: 2, display: 'inline-block' }}>{t('mkt.articles.back')}</Link>
      </Wrap>
    )
  }

  const meta = CATEGORY_META[article.category]
  const phone = CONTACT_CHANNELS.find((c) => c.kind === 'phone')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: L(article.title),
    description: L(article.description),
    datePublished: article.published,
    inLanguage: lang === 'th' ? 'th-TH' : 'en',
    author: { '@type': 'Organization', name: 'ไทย ดวงดี เอ็นจิเนียริ่ง', url: 'https://thaidongdee.com' },
    publisher: { '@type': 'Organization', name: 'ไทย ดวงดี เอ็นจิเนียริ่ง', logo: { '@type': 'ImageObject', url: 'https://thaidongdee.com/brand/favicon-256.png' } },
    mainEntityOfPage: `https://thaidongdee.com/articles/${article.slug}`,
  }

  return (
    <Box component="article">
      <Wrap sx={{ pt: { xs: 3, md: 5 }, pb: { xs: 5, md: 8 } }}>
        <Link component={RouterLink} to="/articles" color="text.secondary" sx={{ fontSize: 14 }}>
          {t('mkt.articles.back')}
        </Link>
        <Chip size="small" label={t(meta.labelKey)}
          sx={{ display: 'flex', width: 'fit-content', mt: 2.5, bgcolor: `${meta.color}14`, color: meta.color }} />
        <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 26, md: 36 }, fontWeight: 700, lineHeight: 1.35 }}>
          {L(article.title)}
        </Typography>
        <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
          {t('mkt.articles.by')} · {fmt(article.published)}
        </Typography>
        <Typography sx={{ mt: 3, fontSize: { xs: 17, md: 18 }, lineHeight: 1.8, color: 'text.secondary' }}>
          {L(article.description)}
        </Typography>

        {article.sections.map((s) => (
          <Box key={s.heading.th} component="section" sx={{ mt: { xs: 4, md: 5 } }}>
            <Typography variant="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 600, lineHeight: 1.45 }}>{L(s.heading)}</Typography>
            {s.body?.[lang].map((p) => (
              <Typography key={p} sx={{ mt: 1.5, fontSize: 16.5, lineHeight: 1.85 }}>{p}</Typography>
            ))}
            {s.bullets && (
              <Box component="ul" sx={{ mt: 1.5, mb: 0, pl: 3, '& li': { fontSize: 16.5, lineHeight: 1.8, mb: 0.75 } }}>
                {s.bullets[lang].map((b) => <li key={b}>{b}</li>)}
              </Box>
            )}
          </Box>
        ))}

        <Paper elevation={0} sx={{ mt: { xs: 5, md: 6 }, p: { xs: 2.5, md: 3 }, borderRadius: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="h2" sx={{ fontSize: 18, fontWeight: 600 }}>{t('mkt.articles.related')}</Typography>
          <Box component="ul" sx={{ m: 0, mt: 1.5, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
            {article.related.map((r) => (
              <li key={r.to}>
                <Link component={RouterLink} to={r.to} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 500 }}>
                  <ArrowForwardIcon sx={{ fontSize: 16 }} /> {L(r.label)}
                </Link>
              </li>
            ))}
          </Box>
        </Paper>

        <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button component={RouterLink} to="/contact" variant="contained" size="large">{t('mkt.articles.ctaQuote')}</Button>
          {phone && contactHref(phone) && (
            <Button href={contactHref(phone)} variant="outlined" size="large">
              {t('mkt.articles.ctaCall')} {contactValue(phone, lang)}
            </Button>
          )}
        </Box>
      </Wrap>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </Box>
  )
}
