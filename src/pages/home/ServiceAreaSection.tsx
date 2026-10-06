import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { Wrap } from './shared'
import { CONTACT_CHANNELS, contactValue } from '../../content/contact'

/**
 * Where the company works — the map is the emphasis; the address and the
 * service-area description sit under it as small, muted text.
 *
 * The district paragraph is kept (small) on purpose: it is the only body text
 * naming "เพชรบูรณ์" and the individual districts, which is what the local-SEO
 * work in spec.md relies on. The address carries a copy button so a customer can
 * grab it for their own navigation.
 */

/** Company location — same pin as the JSON-LD `geo` in index.html (checked
 *  against Phetchabun's bounding box). */
const GEO = { lat: 16.345432, lng: 101.099445 }

/** Opens the Google Maps app on mobile / maps.google.com on desktop. */
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${GEO.lat},${GEO.lng}`

export function ServiceAreaSection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const address = CONTACT_CHANNELS.find((c) => c.kind === 'address')
  const addressText = address ? contactValue(address, lang) : ''
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (no permission / insecure context) — ignore.
    }
  }

  return (
    <Box component="section" sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      {/* Pinned map — the emphasis of the section. Full width, no frame, and
          non-interactive (pointer-events: none) so there are no controls to
          operate; the overlaid button is the way to open it for real. */}
      <Box sx={{ position: 'relative' }}>
        <Box
          component="iframe"
          title={t('mkt.serviceArea.head')}
          src={`https://maps.google.com/maps?q=${GEO.lat},${GEO.lng}&z=12&hl=${lang}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ display: 'block', width: '100%', height: { xs: 380, md: 520 }, border: 0, pointerEvents: 'none' }}
        />
        <Button
          component="a"
          href={MAP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          startIcon={<OpenInNewIcon />}
          sx={{ position: 'absolute', right: { xs: 12, md: 24 }, bottom: { xs: 12, md: 24 }, boxShadow: 3 }}
        >
          {t('mkt.serviceArea.openMap')}
        </Button>
      </Box>

      {/* Small print under the map: the address (with a copy button) and the
          service-area description that carries the local-SEO keywords. */}
      <Wrap sx={{ py: { xs: 2, md: 2.5 } }}>
        {addressText && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: 12, md: 13 } }}>
              {addressText}
            </Typography>
            <Tooltip title={copied ? t('mkt.serviceArea.copied') : t('mkt.serviceArea.copy')}>
              <IconButton size="small" onClick={copyAddress} aria-label={t('mkt.serviceArea.copy')}>
                {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        <Typography
          sx={{ mt: 0.75, color: 'text.secondary', opacity: 0.8, fontSize: { xs: 11, md: 12 }, lineHeight: 1.7, textAlign: 'center' }}
        >
          {t('mkt.serviceArea.body')}
        </Typography>
      </Wrap>
    </Box>
  )
}
