import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Avatar from '@mui/material/Avatar'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import GoogleIcon from '@mui/icons-material/Google'
import FacebookIcon from '@mui/icons-material/Facebook'
import ChatIcon from '@mui/icons-material/Chat'
import { useAuth } from '../auth/AuthProvider'
import { loadProfile, saveProfile, type LocalProfile } from '../account/profileStore'
import { ensureMarketingI18n } from '../marketing/i18n'

ensureMarketingI18n()

function Wrap({ children }: { children: ReactNode }) {
  return <Box sx={{ maxWidth: 560, mx: 'auto', px: 3, py: { xs: 4, md: 6 } }}>{children}</Box>
}

/** Read an image file and return a square, downscaled JPEG data-URL (so a phone
 *  photo doesn't blow past localStorage limits). Downscale only. */
async function toAvatarDataUrl(file: File, size = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('image load failed'))
    el.src = dataUrl
  })
  const side = Math.min(img.width, img.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  // Center-crop to a square, then draw at the target size.
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * The signed-in user's profile settings — its own page, not a dialog.
 *
 * Display name, photo and address are editable and persisted locally (see
 * `profileStore` — no backend column for them yet). Email is read-only (it comes
 * from the auth account), and phone / linked social accounts stay disabled until
 * they're wired to a backend. Signed-out visitors are sent to the customer
 * sign-in, keeping where they were headed.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [address, setAddress] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saved, setSaved] = useState(false)

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const p = loadProfile(userId)
    setDisplayName(p.displayName)
    setAddress(p.address)
    setAvatar(p.avatar)
  }, [userId])

  // Wait for the first session lookup, or a reload bounces a signed-in user out.
  if (loading) return null
  if (!user) return <Navigate to="/login?next=/account" replace />

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      setAvatar(await toAvatarDataUrl(file))
      setSaved(false)
    } catch {
      // Ignore an unreadable image; the current avatar stays.
    }
  }

  const save = () => {
    const next: LocalProfile = { displayName: displayName.trim(), address: address.trim(), avatar }
    saveProfile(user.id, next)
    setSaved(true)
  }

  const initial = (displayName || user.name).trim().charAt(0).toUpperCase() || '?'

  return (
    <Wrap>
      <Typography variant="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, mb: 0.5 }}>
        {t('account.settings')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('account.profileSubtitle')}
      </Typography>

      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
        <Stack spacing={2.5}>
          {/* Avatar + change photo */}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar src={avatar || undefined} sx={{ width: 72, height: 72, fontSize: 28, bgcolor: 'primary.main' }}>
              {avatar ? null : initial}
            </Avatar>
            <Button variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => fileRef.current?.click()}>
              {t('account.changePhoto')}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e)} />
          </Stack>

          <TextField
            label={t('account.displayName')}
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
            fullWidth
            size="small"
          />
          <TextField label={t('auth.email')} value={user.name} fullWidth size="small" disabled />
          <TextField
            label={t('account.address')}
            value={address}
            onChange={(e) => { setAddress(e.target.value); setSaved(false) }}
            fullWidth
            size="small"
            multiline
            minRows={2}
          />
          <TextField
            label={t('account.phone')}
            placeholder={t('account.phonePlaceholder')}
            fullWidth
            size="small"
            disabled
          />

          <Box>
            <Typography variant="caption" color="text.secondary">{t('account.social')}</Typography>
            <Stack spacing={1} sx={{ mt: 0.5 }}>
              <Button variant="outlined" color="inherit" disabled fullWidth startIcon={<GoogleIcon />}>
                {t('account.connect')} Google
              </Button>
              <Button variant="outlined" color="inherit" disabled fullWidth startIcon={<FacebookIcon />}>
                {t('account.connect')} Facebook
              </Button>
              <Button variant="outlined" color="inherit" disabled fullWidth startIcon={<ChatIcon />}>
                {t('account.connect')} LINE
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Button variant="contained" onClick={save}>{t('account.save')}</Button>
            {saved && <Typography variant="body2" color="success.main">{t('account.saved')}</Typography>}
          </Stack>

          <Alert severity="info" variant="outlined">{t('account.localNote')}</Alert>
        </Stack>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
        <Link component={RouterLink} to="/home/house" color="inherit">
          ← {t('auth.backToApp')}
        </Link>
      </Typography>
    </Wrap>
  )
}
