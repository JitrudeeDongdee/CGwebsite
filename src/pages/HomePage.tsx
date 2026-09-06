import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import HomeIcon from '@mui/icons-material/Home'
import MemoryIcon from '@mui/icons-material/Memory'
import ChairIcon from '@mui/icons-material/Chair'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StarIcon from '@mui/icons-material/Star'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { IsoThumbnail } from '../ui/ItemPreview'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { heroProductFor, productsByCategory } from '../catalog/products'
import { PROJECTS } from '../catalog/projects'
import { CatalogImage } from '../catalog/CatalogImage'
import { useLocalized } from '../catalog/useLocalized'
import type { ProductCategory } from '../catalog/types'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  )
}

const FEATURED_IDS = ['two-bed-8x6', 'three-bed-9x6', 'studio-6x4']
/**
 * Hero height, shared by the company home and every service page so switching
 * services never makes the page jump. Taller on medium screens, where the copy
 * needs more lines to fit.
 */
const HERO_HEIGHT = { md: 700, lg: 600 }

/** Hero card media height — the same for the plan thumbnail and a product photo. */
const HERO_MEDIA_HEIGHT = 240

/**
 * Holds a block of the hero's variable-length copy at a fixed number of lines
 * per breakpoint (clamped, so longer copy can't push the hero taller). On
 * mobile the hero grows with its content as usual.
 */
const clamp = (lines: { md: number; lg: number }, lineHeight: number, fontSize: number) => {
  const box = (n: number) => `${(n * lineHeight * fontSize).toFixed(2)}px`
  return {
    lineHeight,
    display: { xs: 'block', md: '-webkit-box' },
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: { md: lines.md, lg: lines.lg },
    overflow: 'hidden',
    minHeight: { md: box(lines.md), lg: box(lines.lg) },
  }
}

const RATE = 18000

function isCategory(value: string | undefined): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory)
}

/**
 * The marketing home. `/home` is the company-wide version; `/home/:service`
 * (house / electronics / furniture / rental) renders the SAME layout — hero,
 * service cards, featured items, portfolio, stats, CTA — with that service's
 * content, so every service line gets its own home page.
 */
export function HomePage() {
  const { service } = useParams()
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const L = useLocalized()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'

  // `/home/<something unknown>` is not a service — fall back to the main home.
  if (service !== undefined && !isCategory(service)) return <Navigate to="/home" replace />

  const cat: ProductCategory | null = isCategory(service) ? service : null
  /** The house line keeps the designer as its call to action; the others lead to contact. */
  const isHouseish = cat === null || cat === 'house'
  const ctaTo = isHouseish ? '/design' : '/contact'
  /** "See all" targets: the catalog / portfolio filtered to this service. */
  const allProductsTo = cat ? `/products?category=${cat}` : '/products'
  const allWorkTo = cat ? `/portfolio?category=${cat}` : '/portfolio'

  // Each card links to that service's own home page (`/home/:service`).
  const services = [
    { cat: 'house' as const, icon: <HomeIcon />, title: t('mkt.home.svc1'), desc: t('mkt.home.svc1d'), main: true },
    { cat: 'electronics' as const, icon: <MemoryIcon />, title: t('mkt.home.svc2'), desc: t('mkt.home.svc2d') },
    { cat: 'furniture' as const, icon: <ChairIcon />, title: t('mkt.home.svc3'), desc: t('mkt.home.svc3d') },
    { cat: 'rental' as const, icon: <AgricultureIcon />, title: t('mkt.home.svc4'), desc: t('mkt.home.svc4d') },
  ]
  const activeService = cat ? services.find((s) => s.cat === cat)! : null

  const hero = activeService
    ? {
        eyebrow: t('mkt.service.eyebrow'),
        title: activeService.title,
        lead: t(`mkt.service.${cat}.lead`),
        ctaPrimary: isHouseish ? t('mkt.service.ctaDesign') : t('mkt.service.ctaContact'),
        trust: [1, 2, 3].map((n) => ({ head: t(`mkt.service.${cat}.h${n}`), sub: t(`mkt.service.${cat}.h${n}d`) })),
      }
    : {
        eyebrow: t('mkt.home.eyebrow'),
        title: t('mkt.home.title'),
        lead: t('mkt.home.lead'),
        ctaPrimary: t('mkt.home.ctaPrimary'),
        trust: [1, 2, 3].map((n) => ({ head: t(`mkt.home.trust${n}`), sub: t(`mkt.home.trust${n}sub`) })),
      }

  // Featured block: house plans for the home + house line, catalog products otherwise.
  const models = FEATURED_IDS.map((id) => PLAN_TEMPLATES.find((m) => m.id === id)).filter(
    (m): m is (typeof PLAN_TEMPLATES)[number] => Boolean(m),
  )
  const catProducts = cat ? productsByCategory(cat).slice(0, 3) : []
  // The hero card leads with the line's best seller. House models are drawn as an
  // isometric thumbnail of their plan; the other lines use their catalog photo.
  const heroProduct = heroProductFor(cat ?? 'house')
  const heroPlan = heroProduct ? PLAN_TEMPLATES.find((m) => m.id === heroProduct.slug) : undefined

  const defaultWork = [
    { key: 'w1', place: 'ชัยภูมิ', year: '2567', title: `${t('mkt.nav.models')} 2 ${t('rooms.bedroom')}`, to: null as string | null },
    { key: 'w2', place: 'ขอนแก่น', year: '2566', title: t('templates.oneBed'), to: null as string | null },
    { key: 'w3', place: 'อุดรธานี', year: '2566', title: t('templates.shop'), to: null as string | null },
  ]
  const work = cat
    ? PROJECTS.filter((p) => p.category === cat).map((p) => ({
        key: p.id,
        place: L(p.location),
        year: p.year,
        title: L(p.title),
        to: `/portfolio/${p.slug}` as string | null,
      }))
    : defaultWork

  const stats = [
    { n: '250+', l: t('mkt.home.stat1') },
    { n: '20+', l: t('mkt.home.stat2') },
    { n: '40+', l: t('mkt.home.stat3') },
    { n: '2', l: t('mkt.home.stat4') },
  ]

  const priceLabel = (from: number | null) =>
    from == null ? t('mkt.catalog.quote') : `${t('mkt.catalog.from')} ${formatCurrency(from, 'THB', locale)}`

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          backgroundImage: `linear-gradient(0deg, ${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {/* The hero keeps the same height on every service page (HERO_MIN_HEIGHT),
            so switching services doesn't make the page jump. */}
        <Wrap sx={{ py: { xs: 6, md: 9 }, display: 'flex', alignItems: 'center', height: HERO_HEIGHT }}>
          <Box sx={{ width: '100%', display: 'grid', gap: 5, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
            <Box>
              <Eyebrow>{hero.eyebrow}</Eyebrow>
              <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 32, md: 48 }, fontWeight: 600, letterSpacing: '-0.01em', ...clamp({ md: 3, lg: 2 }, 1.15, 48) }}>
                {hero.title}
              </Typography>
              <Typography sx={{ mt: 2.5, mb: 3.5, color: 'text.secondary', fontSize: 18, maxWidth: '34em', ...clamp({ md: 4, lg: 3 }, 1.5, 18) }}>
                {hero.lead}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={RouterLink} to={ctaTo} variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
                  {hero.ctaPrimary}
                </Button>
                <Button component={RouterLink} to={allProductsTo} variant="outlined" size="large">
                  {cat ? t('mkt.service.allProducts') : t('mkt.home.ctaSecondary')}
                </Button>
              </Stack>
              <Box sx={{ mt: 4, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
                {hero.trust.map((item) => (
                  <Box key={item.head}>
                    <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main', ...clamp({ md: 2, lg: 2 }, 1.3, 20) }}>{item.head}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={clamp({ md: 4, lg: 3 }, 1.4, 12)}>{item.sub}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {heroProduct && (
              <Paper
                component={RouterLink}
                to={`/products/${heroProduct.slug}`}
                elevation={0}
                sx={{
                  p: 2.5, border: 1, borderColor: 'divider', borderRadius: 3,
                  display: 'block', textDecoration: 'none', color: 'inherit',
                  transition: 'border-color .15s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  {heroProduct.bestSeller && (
                    <Chip
                      icon={<StarIcon />}
                      label={t('mkt.catalog.bestSeller')}
                      size="small"
                      color="secondary"
                    />
                  )}
                  <Chip label={t(CATEGORY_META[heroProduct.category].labelKey)} size="small" color="primary" variant="outlined" />
                </Stack>
                {heroPlan ? (
                  <Box sx={{ display: 'grid', placeItems: 'center', height: HERO_MEDIA_HEIGHT }}>
                    <IsoThumbnail state={heroPlan.build()} size={220} />
                  </Box>
                ) : (
                  <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <CatalogImage
                      src={`products/${heroProduct.slug}.jpg`}
                      category={heroProduct.category}
                      alt={L(heroProduct.name)}
                      height={HERO_MEDIA_HEIGHT}
                    />
                  </Box>
                )}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mr: 1 }}>{L(heroProduct.name)}</Typography>
                  <Typography sx={{ color: 'secondary.main', fontWeight: 700, whiteSpace: 'nowrap' }}>{priceLabel(heroProduct.priceFrom)}</Typography>
                </Stack>
              </Paper>
            )}
          </Box>
        </Wrap>
      </Box>

      {/* Services */}
      <Box id="services" component="section" sx={{ py: 8 }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: 4.5 }}>
            <Eyebrow>{t('mkt.home.svcEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.svcHeading')}</Typography>
            <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.svcSub')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {services.map((s) => {
              const active = s.cat === cat
              return (
                <Paper
                  key={s.title}
                  component={RouterLink}
                  to={`/home/${s.cat}`}
                  elevation={0}
                  sx={{
                    p: 2.5, borderRadius: 3,
                    // Only the service being viewed is outlined — the main line is
                    // marked by its badge, not by a permanent border.
                    border: active ? 2 : 1,
                    borderColor: active ? 'primary.main' : 'divider',
                    position: 'relative', height: '100%',
                    display: 'block', textDecoration: 'none', color: 'inherit',
                    transition: 'border-color .15s, transform .15s',
                    '&:hover': { borderColor: 'secondary.main', transform: 'translateY(-2px)' },
                  }}
                >
                  {s.main && (
                    <Chip label={t('mkt.home.svcMainBadge')} size="small" color="secondary" sx={{ position: 'absolute', top: 14, right: 14 }} />
                  )}
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', mb: 1.5,
                      bgcolor: s.main ? 'secondary.main' : 'primary.main',
                      color: s.main ? 'secondary.contrastText' : 'primary.contrastText',
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 17, mb: 0.5 }}>{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, alignItems: 'center', color: 'secondary.main' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('mkt.catalog.viewDetail')}</Typography>
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Stack>
                </Paper>
              )
            })}
          </Box>
        </Wrap>
      </Box>

      {/* Featured: house plans on the home + house line, catalog products on the others */}
      <Box id="models" component="section" sx={{ py: 8, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: 4.5 }}>
            <Eyebrow>{isHouseish ? t('mkt.home.modelsEyebrow') : t('mkt.service.eyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
              {isHouseish ? t('mkt.home.modelsHeading') : t('mkt.service.productsHead')}
            </Typography>
            {isHouseish && <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.modelsSub')}</Typography>}
          </Box>

          {isHouseish ? (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {models.map((m) => (
                <Paper key={m.id} elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                  <Box sx={{ display: 'grid', placeItems: 'center', py: 2.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                    <IsoThumbnail state={m.build()} size={120} />
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{t(m.nameKey)}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip size="small" variant="outlined" label={`${m.width}×${m.depth} ${t('summary.squareMeters')}`} />
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mt: 1.5 }}>
                      <Typography sx={{ color: 'secondary.main', fontWeight: 700 }}>
                        {formatCurrency(m.width * m.depth * RATE, 'THB', locale)}
                      </Typography>
                      <Button component={RouterLink} to="/design" size="small" endIcon={<ArrowForwardIcon />}>
                        {t('mkt.home.modelCustomize')}
                      </Button>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : catProducts.length === 0 ? (
            <Typography color="text.secondary">{t('mkt.service.productsEmpty')}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {catProducts.map((p) => (
                <Paper
                  key={p.id}
                  component={RouterLink}
                  to={`/products/${p.slug}`}
                  elevation={0}
                  sx={{
                    borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                    textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <CatalogImage src={`products/${p.slug}.jpg`} category={p.category} alt={L(p.name)} />
                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{L(p.name)}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>{L(p.shortDesc)}</Typography>
                    <Typography sx={{ mt: 1, color: 'secondary.main', fontWeight: 700 }}>{priceLabel(p.priceFrom)}</Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
          <Button
            component={RouterLink}
            to={allProductsTo}
            variant="outlined"
            sx={{ mt: 3 }}
            endIcon={<ArrowForwardIcon />}
          >
            {t('mkt.service.allProducts')}
          </Button>
        </Wrap>
      </Box>

      {/* Portfolio */}
      {work.length > 0 && (
        <Box id="work" component="section" sx={{ py: 8 }}>
          <Wrap>
            <Box sx={{ mb: 4.5 }}>
              <Eyebrow>{t('mkt.home.workEyebrow')}</Eyebrow>
              <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.workHeading')}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {work.map((w) => (
                <Box
                  key={w.key}
                  {...(w.to ? { component: RouterLink, to: w.to } : {})}
                  sx={{
                    position: 'relative', aspectRatio: '4 / 3', borderRadius: 3, overflow: 'hidden',
                    border: 1, borderColor: 'divider', bgcolor: 'primary.dark',
                    display: 'block', textDecoration: 'none',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute', inset: 0, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: '#fff',
                      background: 'linear-gradient(0deg, rgba(11,34,49,0.85), transparent 60%)',
                    }}
                  >
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>{w.place} · {w.year}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{w.title}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Button variant="outlined" sx={{ mt: 3 }} component={RouterLink} to={allWorkTo} endIcon={<ArrowForwardIcon />}>
              {t('mkt.home.workAll')}
            </Button>
          </Wrap>
        </Box>
      )}

      {/* Stats band */}
      <Wrap>
        <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 4, p: { xs: 4, md: 5.5 } }}>
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, textAlign: 'center' }}>
            {stats.map((s) => (
              <Box key={s.l}>
                <Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.n}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>{s.l}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Wrap>

      {/* Final CTA */}
      <Box component="section" sx={{ py: 8, textAlign: 'center' }}>
        <Wrap>
          <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 34 }, fontWeight: 600 }}>
            {cat ? t('mkt.service.finalHeading') : t('mkt.home.finalHeading')}
          </Typography>
          <Typography sx={{ color: 'text.secondary', maxWidth: '32em', mx: 'auto', mt: 1.5, mb: 3 }}>
            {cat ? t('mkt.service.finalSub') : t('mkt.home.finalSub')}
          </Typography>
          <Button component={RouterLink} to={ctaTo} variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
            {cat ? hero.ctaPrimary : t('mkt.home.finalCta')}
          </Button>
        </Wrap>
      </Box>
    </Box>
  )
}
