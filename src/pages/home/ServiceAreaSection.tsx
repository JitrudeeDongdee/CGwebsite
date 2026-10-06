import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import PlaceIcon from '@mui/icons-material/Place'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { Wrap } from './shared'
import { CONTACT_CHANNELS, contactValue } from '../../content/contact'

/**
 * Where the company works — the map is the emphasis, with the address shown as
 * a small card over it near the pin (a copy button sits inline at the end of the
 * address so a customer can grab it for their own navigation).
 *
 * The district paragraph stays as real body text UNDER the map (small, muted):
 * it is the only text naming "เพชรบูรณ์" and the individual districts, which is
 * what the local-SEO work in spec.md relies on. An overlay card is fine for SEO
 * — crawlers read real text wherever it is positioned — but a small pin card
 * can't hold the full district list, so that paragraph is kept below.
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
      {/* Pinned map — the emphasis of the section. Non-interactive so there are
          no controls to fiddle with; the overlaid button opens it for real. */}
      <Box sx={{ position: 'relative' }}>
        <Box
          component="iframe"
          title={t('mkt.serviceArea.head')}
          src={`https://maps.google.com/maps?q=${GEO.lat},${GEO.lng}&z=12&hl=${lang}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ display: 'block', width: '100%', height: { xs: 380, md: 520 }, border: 0, pointerEvents: 'none' }}
        />

        {/* Address card over the map, near the pin. Real text, so SEO is fine. */}
        {addressText && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: { xs: 12, md: 16 },
              left: { xs: 12, md: 16 },
              right: { xs: 12, md: 'auto' },
              maxWidth: { md: 340 },
              p: { xs: 1, md: 1.25 },
              borderRadius: 2,
              display: 'flex',
              gap: 0.75,
              alignItems: 'flex-start',
            }}
          >
            <PlaceIcon sx={{ fontSize: 18, color: 'primary.main', mt: '2px', flexShrink: 0 }} />
            {/* Copy icon rendered INSIDE the text so it flows as the last "word" —
                it stays attached to the end of the address when the line wraps. */}
            <Typography variant="body2" sx={{ fontSize: { xs: 12, md: 13 }, lineHeight: 1.6, color: 'text.primary' }}>
              {addressText}
              <Tooltip title={copied ? t('mkt.serviceArea.copied') : t('mkt.serviceArea.copy')}>
                <IconButton
                  size="small"
                  onClick={copyAddress}
                  aria-label={t('mkt.serviceArea.copy')}
                  sx={{ ml: 0.25, p: 0.25, color: 'inherit', verticalAlign: 'text-bottom' }}
                >
                  {copied ? <CheckIcon sx={{ fontSize: 16 }} color="success" /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Typography>
          </Paper>
        )}

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

      {/* Service-area description, kept as real body text for local SEO. */}
      <Wrap sx={{ py: { xs: 2, md: 2.5 } }}>
        <Typography
          sx={{ color: 'text.secondary', opacity: 0.8, fontSize: { xs: 11, md: 12 }, lineHeight: 1.7, textAlign: 'center' }}
        >
          {t('mkt.serviceArea.body')}
        </Typography>
      </Wrap>
    </Box>
  )
}
