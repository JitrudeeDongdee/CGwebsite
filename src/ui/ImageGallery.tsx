import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { imageUrl } from '../supabase/storage'

/**
 * A project's photos: one large cover, the rest as a thumbnail strip, and a
 * lightbox for looking properly.
 *
 * A single photo renders as just the cover — no thumbnails, no counter — so a
 * project with one image looks the way it always did.
 */
export function ImageGallery({ paths, alt }: { paths: string[]; alt: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const count = paths.length

  const show = useCallback(
    (next: number) => setOpen(((next % count) + count) % count),
    [count],
  )

  // Arrow keys and Escape are what people reach for in a lightbox.
  useEffect(() => {
    if (open === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') show(open + 1)
      if (event.key === 'ArrowLeft') show(open - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, show])

  if (count === 0) return null

  return (
    <>
      <Box
        onClick={() => setOpen(0)}
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          cursor: 'zoom-in',
          aspectRatio: '16 / 9',
        }}
      >
        <Box
          component="img"
          src={imageUrl(paths[0])}
          alt={alt}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {count > 1 && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute', right: 12, bottom: 12, px: 1.2, py: 0.4, borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
            }}
          >
            1 / {count}
          </Typography>
        )}
      </Box>

      {count > 1 && (
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', mt: 1.5 }}>
          {paths.slice(1).map((path, index) => (
            <Box
              key={path}
              component="img"
              src={imageUrl(path)}
              alt=""
              loading="lazy"
              onClick={() => setOpen(index + 1)}
              sx={{
                width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block',
                borderRadius: 2, border: 1, borderColor: 'divider', cursor: 'zoom-in',
                transition: 'border-color .15s', '&:hover': { borderColor: 'primary.main' },
              }}
            />
          ))}
        </Box>
      )}

      <Dialog open={open !== null} onClose={() => setOpen(null)} maxWidth="lg" fullWidth>
        {open !== null && (
          <Box sx={{ position: 'relative', bgcolor: '#000' }}>
            <Box
              component="img"
              src={imageUrl(paths[open])}
              alt={alt}
              sx={{ width: '100%', maxHeight: '82vh', objectFit: 'contain', display: 'block' }}
            />
            <IconButton
              onClick={() => setOpen(null)}
              aria-label="ปิด"
              sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}
            >
              <CloseIcon />
            </IconButton>
            {count > 1 && (
              <>
                <IconButton
                  onClick={() => show(open - 1)}
                  aria-label="รูปก่อนหน้า"
                  sx={{ position: 'absolute', top: '50%', left: 8, mt: '-20px', color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  onClick={() => show(open + 1)}
                  aria-label="รูปถัดไป"
                  sx={{ position: 'absolute', top: '50%', right: 8, mt: '-20px', color: '#fff', bgcolor: 'rgba(0,0,0,0.4)' }}
                >
                  <ChevronRightIcon />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                    px: 1.2, py: 0.4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff',
                  }}
                >
                  {open + 1} / {count}
                </Typography>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </>
  )
}
