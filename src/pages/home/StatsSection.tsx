import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Wrap } from './shared'

/** The stats band — figures resolved by HomePage (`{ n, l }`). */
export function StatsSection({ stats }: { stats: { n: string; l: string }[] }) {
  return (
    <Wrap sx={{ mt: { xs: 4, md: 6 } }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 4, p: { xs: 4, md: 5.5 } }}>
        <Box sx={{ display: 'grid', gap: { xs: 1.5, sm: 3 }, gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center' }}>
          {stats.map((s) => (
            <Box key={s.l}>
              <Typography sx={{ fontSize: { xs: 22, sm: 34 }, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.n}</Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: 11, sm: 14 }, opacity: 0.85 }}>{s.l}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Wrap>
  )
}
