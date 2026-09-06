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
}: {
  src?: string
  alt?: string
  fallback: ReactNode
  sx?: object
}) {
  const [failed, setFailed] = useState(false)
  const base = import.meta.env.BASE_URL
  const full = src ? `${base}${src.replace(/^\//, '')}` : undefined

  if (!full || failed) return <>{fallback}</>

  return (
    <Box
      component="img"
      src={full}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...sx }}
    />
  )
}
