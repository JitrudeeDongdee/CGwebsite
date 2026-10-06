import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

/**
 * Where the company works — shown as a map, and only a map (the heading and the
 * district paragraph were dropped at the owner's request to emphasise it).
 *
 * ⚠️ That paragraph was the only body text naming "เพชรบูรณ์" and its districts,
 * which is what the local-SEO work in spec.md relied on. With it gone the page
 * no longer carries those keywords; the map's `title` is the only text left for
 * a crawler here. If local ranking matters, bring the district list back (even
 * visually hidden).
 *
 * The map is non-interactive (`pointer-events: none`) so there are no controls
 * to fiddle with; the overlaid button opens the real Google Maps app instead.
 */

/** Company location — same pin as the JSON-LD `geo` in index.html (checked
 *  against Phetchabun's bounding box). */
const GEO = { lat: 16.345432, lng: 101.099445 }

/** Opens the Google Maps app on mobile / maps.google.com on desktop. */
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${GEO.lat},${GEO.lng}`

export function ServiceAreaSection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'

  return (
    <Box component="section" sx={{ position: 'relative', bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Box
        component="iframe"
        title={t('mkt.serviceArea.head')}
        src={`https://maps.google.com/maps?q=${GEO.lat},${GEO.lng}&z=12&hl=${lang}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sx={{
          display: 'block',
          width: '100%',
          height: { xs: 380, md: 520 },
          border: 0,
          pointerEvents: 'none',
        }}
      />
      <Button
        component="a"
        href={MAP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        startIcon={<OpenInNewIcon />}
        sx={{
          position: 'absolute',
          right: { xs: 12, md: 24 },
          bottom: { xs: 12, md: 24 },
          boxShadow: 3,
        }}
      >
        {t('mkt.serviceArea.openMap')}
      </Button>
    </Box>
  )
}
