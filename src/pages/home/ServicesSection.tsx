import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import type { ProductCategory } from '../../catalog/types'
import { Wrap, Eyebrow } from './shared'

/** One of the service-line cards; `main` marks the core (knock-down house) line. */
export interface Service {
  cat: ProductCategory
  icon: ReactNode
  title: string
  desc: string
  main?: boolean
}

/**
 * A compact strip of the service lines at the very top of the page — all five in
 * a single row (icon + name only, no descriptions), acting as a category picker
 * above the hero.
 */
export function ServicesSection({ services, cat }: { services: Service[]; cat: ProductCategory | null }) {
  const { t } = useTranslation()

  return (
    <Box id="services" component="section" sx={{ py: { xs: 2.5, md: 3.5 }, borderBottom: 1, borderColor: 'divider' }}>
      <Wrap>
        {/* The eyebrow label is desktop-only; the service names show on every width. */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Eyebrow>{t('mkt.home.svcEyebrow')}</Eyebrow>
        </Box>
        {/* minmax(0,1fr) lets columns shrink below their content width, so all five
            stay on one row even on a phone (a bare 1fr keeps min-content and a long
            Thai name would overflow the row). */}
        <Box sx={{ mt: { xs: 0, md: 1.5 }, display: 'grid', gap: { xs: 1, md: 1.5 }, gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {services.map((s) => {
            const active = s.cat === cat
            return (
              <Paper
                key={s.title}
                component={RouterLink}
                to={`/home/${s.cat}`}
                elevation={0}
                sx={{
                  p: { xs: 1, md: 1.5 }, borderRadius: 2,
                  border: active ? 2 : 1,
                  borderColor: active ? 'primary.main' : 'divider',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 0.5, md: 1 },
                  textAlign: 'center', textDecoration: 'none', color: 'inherit', height: '100%', minWidth: 0,
                  transition: 'border-color .15s, transform .15s',
                  '&:hover': { borderColor: 'secondary.main', transform: 'translateY(-2px)' },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 },
                    borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0,
                    bgcolor: s.main ? 'secondary.main' : 'primary.main',
                    color: s.main ? 'secondary.contrastText' : 'primary.contrastText',
                    '& svg': { fontSize: { xs: 18, md: 22 } },
                  }}
                >
                  {s.icon}
                </Box>
                {/* Small label under the icon on every width — matches the FloatingServiceBar;
                    Thai has no word spaces so force a wrap and cap at two lines. */}
                <Typography
                  sx={{
                    fontWeight: 600, fontSize: { xs: 10, md: 14 }, lineHeight: 1.2,
                    textAlign: 'center', width: '100%', overflowWrap: 'anywhere',
                    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
                  }}
                >
                  {s.title}
                </Typography>
              </Paper>
            )
          })}
        </Box>
      </Wrap>
    </Box>
  )
}
