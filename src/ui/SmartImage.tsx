import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'

/**
 * Renders an <img> at `src`, falling back to `fallback` if the file is missing
 * (404 / load error) or no src is given. Real photos are dropped into `public/`
 * under a fixed naming convention (team/ceo.jpg, products/<slug>.jpg,
 * portfolio/<slug>.jpg) and appear automatically — no code change needed.
 */
export function SmartImage({
  src,
  alt = '',
  fallback,
  sx,
  eager = false,
}: {
  src?: string
  alt?: string
  fallback: ReactNode
  sx?: object
  /** Load immediately instead of lazily — for above-the-fold slots (the hero),
   *  and so a 404 fires its error promptly to trigger a fallback chain. */
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  // An absolute URL (Supabase Storage) is used as-is; a bare path is relative
  // to the deployed base, the way files in public/ have always been.
  const base = import.meta.env.BASE_URL
  const full = src ? (/^https?:\/\//i.test(src) ? src : `${base}${src.replace(/^\//, '')}`) : undefined

  if (!full || failed) return <>{fallback}</>

  return (
    <Box
      component="img"
      src={full}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...sx }}
    />
  )
}
