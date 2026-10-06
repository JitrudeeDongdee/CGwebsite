import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { CatalogImage } from '../../catalog/CatalogImage'
import { joinMeta } from '../../catalog/meta'
import { projectImagePath } from '../../catalog/images'
import { useLocalized } from '../../catalog/useLocalized'
import type { Project } from '../../catalog/types'
import { Wrap, Eyebrow, RAIL_SX, RAIL_CARD_SX, CardSkeletonGrid } from './shared'

/** Public-benefit works & donations — shown on the house line (and /home). */
export function CommunitySection({ items, loading = false }: { items: Project[]; loading?: boolean }) {
  const { t } = useTranslation()
  const L = useLocalized()

  return (
    <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Wrap>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ mb: { xs: 2.5, md: 4.5 }, alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}>
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
        {loading ? (
          <CardSkeletonGrid count={3} columns={{ xs: '1fr 1fr', md: 'repeat(3, 1fr)' }} />
        ) : (
        <Box sx={{ ...RAIL_SX, gridTemplateColumns: { md: 'repeat(3, 1fr)' } }}>
          {items.slice(0, 3).map((item) => (
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
        )}
      </Wrap>
    </Box>
  )
}
