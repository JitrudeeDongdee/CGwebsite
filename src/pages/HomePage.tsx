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
import EngineeringIcon from '@mui/icons-material/Engineering'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StarIcon from '@mui/icons-material/Star'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { IsoThumbnail } from '../ui/ItemPreview'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import { joinMeta } from '../catalog/meta'
import { useCatalog, useCommunity, useHeroProduct, useProductsByCategory } from '../catalog/CatalogProvider'
import { CatalogImage } from '../catalog/CatalogImage'
import { productImagePath, projectImagePath, projectPath } from '../catalog/images'
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

/**
 * A row of cards that is a grid on a desktop and a swipeable rail on a phone.
 *
 * Stacking cards one per row cost whole screens of scrolling; a two-column grid
 * fixed that but left an odd card alone on the last row, which reads as broken
 * rather than as "that's all of them". A rail keeps them in one line whatever
 * the count, and bleeds to the screen edge so the next card peeks instead of
 * looking cut off.
 */
const RAIL_SX = {
  display: { xs: 'flex', md: 'grid' },
  gap: 2,
  overflowX: { xs: 'auto', md: 'visible' },
  scrollSnapType: { xs: 'x mandatory', md: 'none' },
  mx: { xs: -3, md: 0 },
  px: { xs: 3, md: 0 },
  pb: { xs: 1, md: 0 },
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const

/** Each card in a rail: a fixed slice of the phone screen, its own snap point. */
const RAIL_CARD_SX = { flex: { xs: '0 0 78%', md: '1 1 auto' }, scrollSnapAlign: 'start' } as const

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

  const cat: ProductCategory | null = isCategory(service) ? service : null

  // Catalog hooks must run before the early return below — a hook that is
  // skipped on some renders breaks the hook order for the whole component.
  const { projects: allProjects } = useCatalog()
  const communityItems = useCommunity()
  const catProducts = useProductsByCategory(cat ?? 'all').slice(0, 3)
  // The hero card leads with the line's best seller.
  const heroProduct = useHeroProduct(cat ?? 'house')

  // `/home/<something unknown>` is not a service — fall back to the main home.
  if (service !== undefined && !isCategory(service)) return <Navigate to="/home" replace />
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
    { cat: 'contracting' as const, icon: <EngineeringIcon />, title: t('mkt.home.svc5'), desc: t('mkt.home.svc5d') },
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
  // House models are drawn as an isometric thumbnail of their plan; the other
  // lines use their catalog photo.
  const heroPlan = heroProduct ? PLAN_TEMPLATES.find((m) => m.id === heroProduct.slug) : undefined

  type WorkCard = {
    key: string
    place: string
    year: string
    title: string
    to: string | null
    /** Cover-image path (resolved by CatalogImage); undefined for the seed house samples. */
    img?: string
    category: ProductCategory
  }
  const defaultWork: WorkCard[] = [
    { key: 'w1', place: 'ชัยภูมิ', year: '2567', title: `${t('mkt.nav.models')} 2 ${t('rooms.bedroom')}`, to: null, category: 'house' },
    { key: 'w2', place: 'ขอนแก่น', year: '2566', title: t('templates.oneBed'), to: null, category: 'house' },
    { key: 'w3', place: 'อุดรธานี', year: '2566', title: t('templates.shop'), to: null, category: 'house' },
  ]
  const work: WorkCard[] = cat
    ? allProjects.filter((p) => p.category === cat).map((p) => ({
        key: p.id,
        place: L(p.location),
        year: p.year,
        title: L(p.title),
        to: projectPath(p),
        img: projectImagePath(p),
        category: p.category,
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
        <Wrap sx={{ py: { xs: 4, md: 9 }, display: 'flex', alignItems: 'center', height: HERO_HEIGHT }}>
          <Box sx={{ width: '100%', display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, alignItems: 'center' }}>
            <Box>
              <Eyebrow>{hero.eyebrow}</Eyebrow>
              <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 32, md: 48 }, fontWeight: 600, letterSpacing: '-0.01em', ...clamp({ md: 3, lg: 2 }, 1.15, 48) }}>
                {hero.title}
              </Typography>
              <Typography sx={{ mt: { xs: 1.5, md: 2.5 }, mb: { xs: 2.5, md: 3.5 }, color: 'text.secondary', fontSize: { xs: 16, md: 18 }, maxWidth: '34em', ...clamp({ md: 4, lg: 3 }, 1.5, 18) }}>
                {hero.lead}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={RouterLink} to={ctaTo} variant="contained" color="secondary" size="large" endIcon={<ArrowForwardIcon />}>
                  {hero.ctaPrimary}
                </Button>
                <Button component={RouterLink} to={allProductsTo} variant="outlined" size="large" sx={{ flexShrink: 0 }}>
                  {cat ? t('mkt.service.allProducts') : t('mkt.home.ctaSecondary')}
                </Button>
              </Stack>
              <Box sx={{ mt: { xs: 2.5, md: 4 }, display: 'grid', gap: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
                {hero.trust.map((item, i) => (
                  <Box key={item.head} sx={{ gridColumn: { xs: i === 2 ? '1 / -1' : 'auto', sm: 'auto' } }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: 17, md: 20 }, color: 'primary.main', ...clamp({ md: 2, lg: 2 }, 1.3, 20) }}>{item.head}</Typography>
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
                      src={productImagePath(heroProduct)}
                      // The hero card is the line's BEST-SELLING PRODUCT, so it shows
                      // that product's own photo — borrowing a portfolio photo here
                      // made the card look like a past job instead of something to
                      // buy. With no product photo yet it falls back to the flat
                      // category panel, which is at least honest about it.
                      eager
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
      <Box id="services" component="section" sx={{ py: { xs: 4.5, md: 8 } }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: { xs: 2.5, md: 4.5 } }}>
            <Eyebrow>{t('mkt.home.svcEyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.svcHeading')}</Typography>
            <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.svcSub')}</Typography>
          </Box>
          <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2 }, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {services.map((s) => {
              const active = s.cat === cat
              return (
                <Paper
                  key={s.title}
                  component={RouterLink}
                  to={`/home/${s.cat}`}
                  elevation={0}
                  sx={{
                    p: { xs: 1.75, md: 2.5 }, borderRadius: 3,
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
                    <Chip
                      label={t('mkt.home.svcMainBadge')}
                      size="small"
                      color="secondary"
                      sx={{ position: 'absolute', top: { xs: 8, md: 14 }, right: { xs: 8, md: 14 }, height: { xs: 20, md: 24 }, fontSize: { xs: 11, md: 13 } }}
                    />
                  )}
                  <Box
                    sx={{
                      width: { xs: 36, md: 44 }, height: { xs: 36, md: 44 },
                      borderRadius: 2, display: 'grid', placeItems: 'center', mb: { xs: 1, md: 1.5 },
                      bgcolor: s.main ? 'secondary.main' : 'primary.main',
                      color: s.main ? 'secondary.contrastText' : 'primary.contrastText',
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, md: 17 }, mb: 0.5 }}>{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
                  {/* The whole card is a link; on a phone this row is only height. */}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ mt: 1.5, alignItems: 'center', color: 'secondary.main', display: { xs: 'none', md: 'flex' } }}
                  >
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
      <Box id="models" component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Wrap>
          <Box sx={{ maxWidth: '42em', mb: { xs: 2.5, md: 4.5 } }}>
            <Eyebrow>{isHouseish ? t('mkt.home.modelsEyebrow') : t('mkt.service.eyebrow')}</Eyebrow>
            <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
              {isHouseish ? t('mkt.home.modelsHeading') : t('mkt.service.productsHead')}
            </Typography>
            {isHouseish && <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.modelsSub')}</Typography>}
          </Box>

          {isHouseish ? (
            <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(3, 1fr)' } }}>
              {models.map((m) => (
                <Paper key={m.id} elevation={0} sx={{ ...RAIL_CARD_SX, borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
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
                      <Button
                        component={RouterLink}
                        to="/design"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
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
            <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(3, 1fr)' } }}>
              {catProducts.map((p) => (
                <Paper
                  key={p.id}
                  component={RouterLink}
                  to={`/products/${p.slug}`}
                  elevation={0}
                  sx={{
                    ...RAIL_CARD_SX,
                    borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                    textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <CatalogImage src={productImagePath(p)} category={p.category} alt={L(p.name)} />
                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{L(p.name)}</Typography>
                    {/* Clamped rather than free-flowing: in two columns a long
                        description made one card twice the height of its neighbour. */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5, minHeight: { md: 40 },
                        display: '-webkit-box', WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: { xs: 2, md: 'none' }, overflow: 'hidden',
                        // Clipped just short of two lines: see ProductsPage — Thai
                        // tone marks otherwise peek over the cut.
                        lineHeight: 1.6, maxHeight: { xs: '2.85em', md: 'none' },
                      }}
                    >
                      {L(p.shortDesc)}
                    </Typography>
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
        <Box id="work" component="section" sx={{ py: { xs: 4.5, md: 8 } }}>
          <Wrap>
            <Box sx={{ mb: { xs: 2.5, md: 4.5 } }}>
              <Eyebrow>{t('mkt.home.workEyebrow')}</Eyebrow>
              <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>{t('mkt.home.workHeading')}</Typography>
            </Box>
            <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(3, 1fr)' } }}>
              {work.map((w) => (
                <Box
                  key={w.key}
                  {...(w.to ? { component: RouterLink, to: w.to } : {})}
                  sx={{
                    ...RAIL_CARD_SX,
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
            <Button variant="outlined" sx={{ mt: 3 }} component={RouterLink} to={allWorkTo} endIcon={<ArrowForwardIcon />}>
              {t('mkt.home.workAll')}
            </Button>
          </Wrap>
        </Box>
      )}

      {/* Public-benefit works & donations — shown on the house line (and /home). */}
      {isHouseish && communityItems.length > 0 && (
        <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Wrap>
            <Stack direction="row" sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ maxWidth: '42em' }}>
                <Eyebrow>{t('mkt.home.communityEyebrow')}</Eyebrow>
                <Typography variant="h2" sx={{ mt: 1, fontSize: { xs: 24, md: 32 }, fontWeight: 600 }}>
                  {t('mkt.home.communityHeading')}
                </Typography>
                <Typography sx={{ mt: 1.5, color: 'text.secondary' }}>{t('mkt.home.communitySub')}</Typography>
              </Box>
              <Button component={RouterLink} to="/community" variant="outlined" endIcon={<ArrowForwardIcon />}>
                {t('mkt.home.communityAll')}
              </Button>
            </Stack>
            <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(3, 1fr)' } }}>
              {communityItems.slice(0, 3).map((item) => (
                <Paper
                  key={item.id}
                  component={RouterLink}
                  to="/community"
                  elevation={0}
                  sx={{
                    ...RAIL_CARD_SX,
                    borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden',
                    display: 'block', textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <CatalogImage src={projectImagePath(item)} category={item.category} alt={L(item.title)} />
                  <Box sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">{joinMeta(L(item.location), item.year)}</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: 17, mt: 0.25 }}>{L(item.title)}</Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
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
      <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, textAlign: 'center' }}>
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
