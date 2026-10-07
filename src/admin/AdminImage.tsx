import { useState } from 'react'
import Box from '@mui/material/Box'
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported'
import { imageUrl, thumbUrl } from '../supabase/storage'

/**
 * A catalog image in an admin listing: the small copy, with the original as the
 * fallback.
 *
 * Storage has no "serve the next best thing" behaviour — a missing thumbnail is
 * a plain 404 and a broken image. Anything uploaded before thumbnails existed is
 * exactly that case until `pnpm run images:thumbs` has run, and a photo someone
 * uploaded while the thumbnail step failed would be too, so the fallback is
 * permanent rather than a migration aid.
 *
 * The box owns the size and the image fills it, so every picture in a grid is
 * identical whatever the photo's own proportions are (see MEMORY.md — a sized
 * `<img>` contributes its intrinsic height and makes rows ragged).
 */
export function AdminImage({
  path,
  ratio = '4 / 3',
  width,
  radius = 0,
}: {
  path?: string
  ratio?: string
  /** Fixed width for a table cell; omitted, it fills its container. */
  width?: number
  radius?: number
}) {
  const [failed, setFailed] = useState(false)
  const src = failed ? imageUrl(path) : thumbUrl(path)

  return (
    <Box
      sx={{
        width: width ?? '100%',
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        display: 'grid',
        placeItems: 'center',
        color: 'text.disabled',
        flexShrink: 0,
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <ImageNotSupportedIcon fontSize="small" />
      )}
    </Box>
  )
}
