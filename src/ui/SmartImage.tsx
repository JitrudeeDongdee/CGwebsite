import { useCallback, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

/**
 * Renders an <img> at `src`, falling back to `fallback` if the file is missing
 * (404 / load error) or no src is given. Real photos are dropped into `public/`
 * under a fixed naming convention (team/ceo.jpg, products/<slug>.jpg,
 * portfolio/<slug>.jpg) and appear automatically — no code change needed.
 *
 * While the bytes are in flight a shimmer skeleton fills the slot and the photo
 * fades in once it decodes, so a slow image reads as "loading" rather than an
 * empty hole. A cached image skips straight to shown (the ref check below).
 */
export function SmartImage({
  src,
  alt = '',
  fallback,
  sx,
  eager = false,
  intrinsicWidth,
  intrinsicHeight,
}: {
  src?: string
  alt?: string
  fallback: ReactNode
  sx?: object
  /** Load immediately instead of lazily — for above-the-fold slots (the hero),
   *  and so a 404 fires its error promptly to trigger a fallback chain. */
  eager?: boolean
  /** Intrinsic size, written to the `width`/`height` ATTRIBUTES (not CSS) so the
   *  browser reserves the right box before the file arrives. CSS still drives
   *  the rendered size — these only give the aspect ratio. */
  intrinsicWidth?: number
  intrinsicHeight?: number
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // An absolute URL (Supabase Storage) is used as-is; a bare path is relative
  // to the deployed base, the way files in public/ have always been.
  const base = import.meta.env.BASE_URL
  const full = src ? (/^https?:\/\//i.test(src) ? src : `${base}${src.replace(/^\//, '')}`) : undefined

  // A cached image is already `complete` before React can attach `onLoad`, so
  // mark it loaded on mount — otherwise it would stay faded out forever.
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true)
  }, [])

  if (!full || failed) return <>{fallback}</>

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {!loaded && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
      <Box
        component="img"
        ref={imgRef}
        src={full}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        // Attributes, not CSS: with both present the browser computes the aspect
        // ratio and reserves the space before the bytes arrive, so the text below
        // does not jump when the photo lands. `width:100%` in sx still decides how
        // big it actually renders.
        width={intrinsicWidth}
        height={intrinsicHeight}
        // The hero image is what a visitor waits for; everything else can queue.
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        sx={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          // Fade in over the shimmer once decoded.
          opacity: loaded ? 1 : 0, transition: 'opacity .3s ease',
          ...sx,
        }}
      />
    </Box>
  )
}
