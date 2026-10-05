import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { CatalogImage } from '../catalog/CatalogImage'
import type { ProductCategory } from '../catalog/types'

/**
 * A looping image carousel for a catalog slot — swipe on touch, arrows/dots on a
 * pointer, and auto-advance that pauses while the viewer is interacting. Each
 * slide is a `CatalogImage`, so missing photos fall back to the category panel
 * and paths resolve to Storage the same way as everywhere else.
 *
 * One image renders as a plain image (no dots, no auto-advance). It's meant to
 * sit inside a card that is itself a link, so the dots and arrows stop their
 * clicks from bubbling up into a navigation.
 */
export function ImageCarousel({
  images,
  category,
  alt,
  height,
  interval = 4000,
}: {
  images: string[]
  category: ProductCategory
  alt?: string
  height: number | string
  /** Auto-advance period in ms. */
  interval?: number
}) {
  const [index, setIndex] = useState(0)
  const paused = useRef(false)
  const touchX = useRef<number | null>(null)
  const n = images.length

  const go = (to: number) => setIndex(((to % n) + n) % n)

  useEffect(() => {
    if (n <= 1) return
    const id = setInterval(() => {
      if (!paused.current) setIndex((p) => (p + 1) % n)
    }, interval)
    return () => clearInterval(id)
  }, [n, interval])

  // Keep the index valid if the image list shrinks.
  useEffect(() => {
    if (index > n - 1) setIndex(0)
  }, [n, index])

  if (n <= 1) {
    return (
      <Box sx={{ height, borderRadius: 2, overflow: 'hidden' }}>
        <CatalogImage src={images[0]} category={category} alt={alt} height="100%" eager />
      </Box>
    )
  }

  // Stop a dot/arrow tap from triggering the surrounding card link.
  const stop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <Box
      sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden', '&:hover .carousel-arrow': { opacity: 1 } }}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; paused.current = true }}
      onTouchEnd={(e) => {
        const dx = (touchX.current ?? 0) - e.changedTouches[0].clientX
        if (Math.abs(dx) > 40) go(index + (dx > 0 ? 1 : -1))
        touchX.current = null
        paused.current = false
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', transition: 'transform .4s ease', transform: `translateX(-${index * 100}%)` }}>
        {images.map((src, i) => (
          <Box key={`${src}-${i}`} sx={{ flex: '0 0 100%', height: '100%' }}>
            <CatalogImage src={src} category={category} alt={alt} height="100%" eager={i === 0} />
          </Box>
        ))}
      </Box>

      <IconButton
        className="carousel-arrow"
        aria-label="previous"
        onClick={(e) => { stop(e); go(index - 1) }}
        size="small"
        sx={{
          position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)',
          bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', opacity: { xs: 0, md: 0 },
          transition: 'opacity .15s', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
        }}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <IconButton
        className="carousel-arrow"
        aria-label="next"
        onClick={(e) => { stop(e); go(index + 1) }}
        size="small"
        sx={{
          position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)',
          bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', opacity: { xs: 0, md: 0 },
          transition: 'opacity .15s', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
        }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>

      <Box sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.75 }}>
        {images.map((_, i) => (
          <Box
            key={i}
            role="button"
            aria-label={`image ${i + 1}`}
            onClick={(e) => { stop(e); go(i) }}
            sx={{
              width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
              bgcolor: i === index ? '#fff' : 'rgba(255,255,255,0.55)',
              boxShadow: '0 0 2px rgba(0,0,0,0.5)',
              transition: 'background-color .15s',
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
