import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { CatalogImage } from '../catalog/CatalogImage'
import type { ProductCategory } from '../catalog/types'

/**
 * A looping image carousel for a catalog slot. The track is a real horizontal
 * scroll-snap container, so it moves by any means the browser already knows —
 * trackpad / wheel, touch drag, and a dragged scrollbar — on top of the arrows,
 * dots and auto-advance. The active dot and the auto-advance both read the live
 * scroll position, so manual scrolling and the timer never fight over an index.
 *
 * Each slide is a `CatalogImage`, so missing photos fall back to the category
 * panel and paths resolve to Storage the same way as everywhere else.
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
  rounded = true,
  thumb = false,
}: {
  images: string[]
  category: ProductCategory
  alt?: string
  height: number | string
  /** Auto-advance period in ms. */
  interval?: number
  /** Round the carousel's own corners. Off when it sits flush at the top of a
   *  card that already clips its corners. */
  rounded?: boolean
  /** Card-sized slot: use the 400px copies. Off for the hero, which is large. */
  thumb?: boolean
}) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const paused = useRef(false)
  const n = images.length

  // A clone of the first image is appended so the auto-advance can always move
  // FORWARD (rightward): reaching the clone looks like the first image, and we
  // then jump the scroll position back to the real first slide with no
  // animation, so the loop never scrolls backwards across the whole strip.
  const slides = n > 1 ? [...images, images[0]] : images

  // The slide the track is currently resting on, from its scroll position.
  const currentSlide = () => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return 0
    return Math.round(el.scrollLeft / el.clientWidth)
  }

  const jump = (to: number, smooth = true) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: to * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Once the scroll settles on the clone, snap instantly back to the real first
  // slide (invisible — same image) so the next forward step continues the loop.
  const resetIfOnClone = () => {
    if (currentSlide() >= n) jump(0, false)
  }

  useEffect(() => {
    if (n <= 1) return
    const id = setInterval(() => {
      if (paused.current) return
      // Always forward; the clone absorbs the last→first wrap.
      jump(currentSlide() + 1)
      // Fallback for browsers without 'scrollend' — snap back once the smooth
      // scroll has had time to land on the clone.
      window.setTimeout(resetIfOnClone, 700)
    }, interval)
    return () => clearInterval(id)
    // jump/currentSlide read refs only; re-bind just when the set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, interval])

  // Reset after a manual drag/scroll that lands on the clone, too.
  useEffect(() => {
    const el = trackRef.current
    if (!el || n <= 1) return
    const onScrollEnd = () => resetIfOnClone()
    el.addEventListener('scrollend', onScrollEnd)
    return () => el.removeEventListener('scrollend', onScrollEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  if (n <= 1) {
    return (
      <Box sx={{ height, borderRadius: rounded ? 2 : 0, overflow: 'hidden' }}>
        <CatalogImage src={images[0]} category={category} alt={alt} height="100%" eager thumb={thumb} />
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
      sx={{ position: 'relative', height, borderRadius: rounded ? 2 : 0, overflow: 'hidden', '&:hover .carousel-arrow': { opacity: 1 } }}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onTouchStart={() => { paused.current = true }}
      onTouchEnd={() => { paused.current = false }}
    >
      <Box
        ref={trackRef}
        onScroll={() => setIndex(currentSlide())}
        sx={{
          display: 'flex', height: '100%', width: '100%',
          overflowX: 'auto', overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          // A dragged slide shouldn't also fire the card link.
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {slides.map((src, i) => (
          <Box key={`${src}-${i}`} sx={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'start' }}>
            <CatalogImage src={src} category={category} alt={alt} height="100%" eager={i === 0} thumb={thumb} />
          </Box>
        ))}
      </Box>

      <IconButton
        className="carousel-arrow"
        aria-label="previous"
        onClick={(e) => { stop(e); jump(Math.max(0, currentSlide() - 1)) }}
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
        onClick={(e) => { stop(e); jump(currentSlide() + 1) }}
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
            onClick={(e) => { stop(e); jump(i) }}
            sx={{
              width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
              bgcolor: i === index % n ? '#fff' : 'rgba(255,255,255,0.55)',
              boxShadow: '0 0 2px rgba(0,0,0,0.5)',
              transition: 'background-color .15s',
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
