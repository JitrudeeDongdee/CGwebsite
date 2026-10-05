import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Wrap } from './shared'

/** The stats band — figures resolved by HomePage (`{ n, l }`). */
export function StatsSection({ stats }: { stats: { n: string; l: string }[] }) {
  return (
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
  )
}
