import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ProductCategory } from '../../catalog/types'
import type { Service } from './ServicesSection'

/**
 * A floating category switcher pinned to the bottom of the home page. It follows
 * the common chrome pattern: hidden while reading (scrolling down) so the screen
 * stays wide, and it slides back up the moment the user scrolls up — i.e. when
 * they're looking for a way to jump to another service line. It also stays hidden
 * near the very top, where the full ServicesSection strip is already on screen.
 *
 * The scroll listener is attached in the capture phase on `document`, so it sees
 * the MarketingLayout's own scroll container (the window itself doesn't scroll
 * here) without this component needing a reference to it. Horizontal rails and
 * the hero carousel are ignored — only an element that actually scrolls
 * vertically a meaningful amount drives the bar.
 */
export function FloatingServiceBar({ services, cat }: { services: Service[]; cat: ProductCategory | null }) {
  const theme = useTheme()
  const [show, setShow] = useState(false)
  // Last vertical scroll position, kept in a ref so the listener never needs
  // re-binding (and so it reads synchronously, not through stale state).
  const lastTop = useRef(0)
  // How far the user has scrolled down *since the bar was last shown*. The bar
  // only hides once this passes a threshold, so a small nudge or scroll jitter
  // doesn't make it vanish the instant it appears.
  const downAccum = useRef(0)

  useEffect(() => {
    // Show the bar once the top strip has scrolled away; hide it near the top.
    const TOP_GUARD = 360
    // Deliberate downward distance needed before the bar hides again.
    const HIDE_AFTER = 90
    const onScroll = (e: Event) => {
      const el = e.target
      if (!(el instanceof HTMLElement)) return
      // Only the main vertical page scroller — skip horizontal rails/carousels.
      if (el.scrollHeight - el.clientHeight < 200) return
      const top = el.scrollTop
      const delta = top - lastTop.current
      lastTop.current = top

      if (top < TOP_GUARD) {
        // Near the top the full ServicesSection strip is already on screen.
        downAccum.current = 0
        setShow(false)
        return
      }
      if (delta < -2) {
        // Scrolling up — reveal it and reset the hide budget.
        downAccum.current = 0
        setShow(true)
      } else if (delta > 0) {
        // Scrolling down — only hide after a deliberate amount, not a nudge.
        downAccum.current += delta
        if (downAccum.current > HIDE_AFTER) setShow(false)
      }
    }
    document.addEventListener('scroll', onScroll, true)
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 1, md: 2 },
        pb: { xs: 1.5, md: 3 },
        // The wrapper never eats clicks; only the bar does.
        pointerEvents: 'none',
        transform: show ? 'translateY(0)' : 'translateY(170%)',
        transition: 'transform .28s ease',
      }}
    >
      <Paper
        elevation={6}
        sx={{
          pointerEvents: 'auto',
          display: 'flex',
          // Full-width bottom-nav on a phone (equal columns, room for labels);
          // a compact centred bar on desktop.
          width: { xs: '100%', md: 'auto' },
          justifyContent: 'space-around',
          gap: { xs: 0, md: 0.5 },
          p: { xs: 0.5, md: 0.75 },
          borderRadius: { xs: 4, md: 5 },
          border: 1,
          borderColor: 'divider',
        }}
      >
        {services.map((s) => {
          const active = s.cat === cat
          const activeBg = s.main ? 'secondary.main' : 'primary.main'
          const activeText = s.main ? 'secondary.main' : 'primary.main'
          return (
            <Box
              key={s.cat}
              component={RouterLink}
              to={`/home/${s.cat}`}
              aria-label={s.title}
              sx={{
                flex: { xs: 1, md: '0 0 auto' },
                minWidth: 0,
                width: { md: 76 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                px: 0.5,
                py: 0.75,
                borderRadius: 2,
                textDecoration: 'none',
                color: active ? activeText : 'text.secondary',
                transition: 'background-color .15s, color .15s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box
                sx={{
                  width: { xs: 34, md: 38 },
                  height: { xs: 34, md: 38 },
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: active ? activeBg : 'action.selected',
                  color: active ? '#fff' : 'text.secondary',
                  '& svg': { fontSize: { xs: 18, md: 20 } },
                }}
              >
                {s.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 10, md: 11 },
                  lineHeight: 1.15,
                  fontWeight: active ? 700 : 500,
                  textAlign: 'center',
                  width: '100%',
                  // Thai has no word spaces, so force a wrap and cap at two lines
                  // (a long name like "สินค้าอิเล็กทรอนิกส์" otherwise overflows a
                  // ~62px phone column).
                  overflowWrap: 'anywhere',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {s.title}
              </Typography>
            </Box>
          )
        })}
      </Paper>
    </Box>
  )
}
