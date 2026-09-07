import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { ensureMarketingI18n } from '../marketing/i18n'
import { useCommunity } from '../catalog/CatalogProvider'
import { CatalogImage } from '../catalog/CatalogImage'
import { projectImagePath } from '../catalog/images'
import { useLocalized } from '../catalog/useLocalized'

ensureMarketingI18n()

function Wrap({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, ...sx }}>{children}</Box>
}

/**
 * Public-benefit works & donations (ผลงานสาธารณประโยชน์และการบริจาค).
 *
 * These are `kind = 'community'` rows in the same projects table as the
 * portfolio, kept out of the product/portfolio listings and shown only here and
 * in a section on /home/house. Each card leads with the activity's cover photo.
 */
export function CommunityPage() {
  const { t } = useTranslation()
  const L = useLocalized()
  const items = useCommunity()

  return (
    <Box>
      <Box
        sx={{
          backgroundImage: (theme) =>
            `linear-gradient(0deg, ${theme.palette.divider} 1px, transparent 1px), linear-gradient(90deg, ${theme.palette.divider} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Wrap sx={{ py: { xs: 5, md: 7 } }}>
          <Typography sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t('mkt.community.eyebrow')}
          </Typography>
          <Typography variant="h1" sx={{ mt: 1.5, fontSize: { xs: 30, md: 42 }, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {t('mkt.community.title')}
          </Typography>
          <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 18, maxWidth: '40em' }}>
            {t('mkt.community.sub')}
          </Typography>
        </Wrap>
      </Box>

      <Wrap sx={{ py: { xs: 5, md: 7 } }}>
        {items.length === 0 ? (
          <Typography color="text.secondary">{t('mkt.community.empty')}</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 2.5 }, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
            {items.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <CatalogImage src={projectImagePath(item)} category={item.category} alt={L(item.title)} />
                <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    {item.year && (
                      <Chip size="small" variant="outlined" label={item.year} sx={{ height: { xs: 22, sm: 24 }, fontSize: { xs: 11, sm: 13 } }} />
                    )}
                    {L(item.location) && (
                      <Typography variant="caption" color="text.secondary">{L(item.location)}</Typography>
                    )}
                  </Stack>
                  <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 18 } }}>{L(item.title)}</Typography>
                  {L(item.description) && (
                    // Facebook captions run long; clamped so one card can't be
                    // three times the height of the one beside it.
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1, lineHeight: 1.6,
                        display: '-webkit-box', WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: { xs: 3, sm: 5 }, overflow: 'hidden',
                        // Short of the line boundary — Thai tone marks from the
                        // clipped line otherwise peek over the cut.
                        maxHeight: { xs: '4.5em', sm: '7.7em' },
                      }}
                    >
                      {L(item.description)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Wrap>
    </Box>
  )
}
