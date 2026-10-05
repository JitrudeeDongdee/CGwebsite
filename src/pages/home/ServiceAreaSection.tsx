import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlaceIcon from '@mui/icons-material/PlaceOutlined'
import { Wrap } from './shared'
import { CONTACT_CHANNELS, contactValue } from '../../content/contact'

/**
 * Where the company actually works, in words.
 *
 * Not decoration: the site sold knock-down houses without the word
 * "เพชรบูรณ์" appearing in any page's body text, so it could not rank for the
 * searches people in the province actually type ("บ้านน็อคดาวน์ เพชรบูรณ์").
 * The districts are named individually because that is how local search works —
 * someone in หล่มสัก searches for หล่มสัก, not for the province.
 *
 * The address is read from `contact.json`, the one place it is edited, so this
 * block cannot drift from the footer and the contact page.
 */
export function ServiceAreaSection() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'th'
  const address = CONTACT_CHANNELS.find((c) => c.kind === 'address')

  return (
    <Box component="section" sx={{ py: { xs: 4.5, md: 8 }, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <Wrap>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', maxWidth: '52em' }}>
          <Box
            sx={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <PlaceIcon />
          </Box>
          <Box>
            <Typography variant="h2" sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 600 }}>
              {t('mkt.serviceArea.head')}
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.75 }}>
              {t('mkt.serviceArea.body')}
            </Typography>
            {address && (
              <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                {contactValue(address, lang)}
              </Typography>
            )}
          </Box>
        </Stack>
      </Wrap>
    </Box>
  )
}
