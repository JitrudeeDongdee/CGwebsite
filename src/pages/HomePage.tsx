import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import HomeIcon from '@mui/icons-material/Home'
import MemoryIcon from '@mui/icons-material/Memory'
import ChairIcon from '@mui/icons-material/Chair'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import EngineeringIcon from '@mui/icons-material/Engineering'
import { PLAN_TEMPLATES } from '../drawing/templates'
import { formatCurrency } from '../pricing/estimate'
import { ensureMarketingI18n } from '../marketing/i18n'
import { PRODUCT_CATEGORIES } from '../catalog/categories'
import { useCatalog, useCommunity, useHeroProduct, useProductsByCategory } from '../catalog/CatalogProvider'
import { productImagePath, projectImagePath, projectPath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'
import type { ProductCategory } from '../catalog/types'
import { useSeo } from '../seo/useSeo'
import type { PriceLabel, WorkCard } from './home/shared'
import { HeroSection, type Hero } from './home/HeroSection'
import { ServicesSection, type Service } from './home/ServicesSection'
import { FeaturedSection } from './home/FeaturedSection'
import { PortfolioSection } from './home/PortfolioSection'
import { FloatingServiceBar } from './home/FloatingServiceBar'
import { CommunitySection } from './home/CommunitySection'
import { ServiceAreaSection } from './home/ServiceAreaSection'
import { StatsSection } from './home/StatsSection'
// import { FinalCtaSection } from './home/FinalCtaSection' // disabled with its render below

ensureMarketingI18n()

/** House plans featured on the home + house line. */
const FEATURED_IDS = ['two-bed-8x6', 'three-bed-9x6', 'studio-6x4', 'one-bed-6x6']

function isCategory(value: string | undefined): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory)
}

/**
 * The marketing home. `/home` is the company-wide version; `/home/:service`
 * (house / electronics / furniture / rental / contracting) renders the SAME
 * layout — hero, service cards, featured items, portfolio, stats, CTA — with
 * that service's content, so every service line gets its own home page.
 *
 * All the data lives here (the hooks must run in a stable order); each section
 * below is a presentational component in `./home/` that just takes props.
 */
/** Fixes which `svcSeoN` key belongs to which category — the numbering comes
 *  from the i18n keys, so it must not be re-derived anywhere else. */
const SERVICE_ORDER: ProductCategory[] = ['house', 'electronics', 'furniture', 'rental', 'contracting']

export function HomePage() {
  const { service } = useParams()
  const { t, i18n } = useTranslation()
  const L = useLocalized()
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'

  const cat: ProductCategory | null = isCategory(service) ? service : null

  // Catalog hooks must run before the early return below — a hook that is
  // skipped on some renders breaks the hook order for the whole component.
  const { projects: allProjects } = useCatalog()
  const communityItems = useCommunity()
  const catProducts = useProductsByCategory(cat ?? 'all').slice(0, 4)
  // The hero card leads with the line's best seller.
  const heroProduct = useHeroProduct(cat ?? 'house')

  // Per-page SEO: each service line gets its own title + lead (called before the
  // early return so the hook order stays stable).
  useSeo(
    cat
      ? { title: t(`mkt.home.svcSeo${SERVICE_ORDER.indexOf(cat) + 1}`), description: t(`mkt.service.${cat}.lead`) }
      : { title: t('mkt.home.title'), description: t('mkt.home.lead') },
  )

  // `/home/<something unknown>` is not a service — fall back to the main home.
  if (service !== undefined && !isCategory(service)) return <Navigate to="/home" replace />
  /** The house line keeps the designer as its call to action; the others lead to contact. */
  const isHouseish = cat === null || cat === 'house'
  const ctaTo = isHouseish ? '/design' : '/contact'
  /** "See all" targets: the catalog / portfolio filtered to this service. */
  const allProductsTo = cat ? `/products?category=${cat}` : '/products'
  const allWorkTo = cat ? `/portfolio?category=${cat}` : '/portfolio'

  // Each card links to that service's own home page (`/home/:service`).
  const services: Service[] = [
    { cat: 'house', icon: <HomeIcon />, title: t('mkt.home.svc1'), desc: t('mkt.home.svc1d'), main: true },
    { cat: 'electronics', icon: <MemoryIcon />, title: t('mkt.home.svc2'), desc: t('mkt.home.svc2d') },
    { cat: 'furniture', icon: <ChairIcon />, title: t('mkt.home.svc3'), desc: t('mkt.home.svc3d') },
    { cat: 'rental', icon: <AgricultureIcon />, title: t('mkt.home.svc4'), desc: t('mkt.home.svc4d') },
    { cat: 'contracting', icon: <EngineeringIcon />, title: t('mkt.home.svc5'), desc: t('mkt.home.svc5d') },
  ]
  const activeService = cat ? services.find((s) => s.cat === cat)! : null
  /** The service page's headline. Deliberately NOT `svcN`: that label is also a
   *  filter chip and a card title, where a search phrase would not fit. */
  const seoHeadline = cat ? t(`mkt.home.svcSeo${SERVICE_ORDER.indexOf(cat) + 1}`) : t('mkt.home.title')

  const hero: Hero = activeService
    ? {
        eyebrow: t('mkt.service.eyebrow'),
        title: seoHeadline,
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

  // Hero carousel: the product's own photo first, then the cover of each real job
  // in the same service line — so the best seller reads as a product AND as work
  // we've delivered. De-duped, capped so the strip stays short.
  const heroImages = heroProduct
    ? [
        productImagePath(heroProduct),
        ...allProjects.filter((p) => p.category === heroProduct.category).map(projectImagePath),
      ].filter((src, i, all) => all.indexOf(src) === i).slice(0, 8)
    : []

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

  const priceLabel: PriceLabel = (from) =>
    from == null ? t('mkt.catalog.quote') : `${t('mkt.catalog.from')} ${formatCurrency(from, 'THB', locale)}`

  return (
    <Box>
      {/* Compact category strip first, then the hero. */}
      <ServicesSection services={services} cat={cat} />
      <HeroSection
        hero={hero}
        heroProduct={heroProduct}
        heroPlan={heroPlan}
        heroImages={heroImages}
        cat={cat}
        ctaTo={ctaTo}
        allProductsTo={allProductsTo}
        priceLabel={priceLabel}
      />
      <FeaturedSection
        isHouseish={isHouseish}
        models={models}
        catProducts={catProducts}
        allProductsTo={allProductsTo}
        priceLabel={priceLabel}
        locale={locale}
      />
      {work.length > 0 && <PortfolioSection work={work} allWorkTo={allWorkTo} />}
      {isHouseish && communityItems.length > 0 && <CommunitySection items={communityItems} />}
      {/* Names the province and its districts in body text — the site had none. */}
      <ServiceAreaSection />
      <StatsSection stats={stats} />
      {/* <FinalCtaSection cat={cat} ctaTo={ctaTo} ctaPrimary={hero.ctaPrimary} /> */}
      {/* Floating quick-switch: hides on scroll-down, reappears on scroll-up. */}
      <FloatingServiceBar services={services} cat={cat} />
    </Box>
  )
}
