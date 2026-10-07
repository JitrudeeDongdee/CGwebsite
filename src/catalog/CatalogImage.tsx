import Box from '@mui/material/Box'
import { SmartImage } from '../ui/SmartImage'
import { imageUrl, thumbUrl } from '../supabase/storage'
import { CATEGORY_META } from './categories'
import type { ProductCategory } from './types'

/** A catalog image slot: shows the real photo once it exists, else a flat
 *  category-coloured panel with the category icon. `src` is a catalog image
 *  PATH (`portfolio/<slug>.jpg`), resolved by `imageUrl` to Supabase Storage or
 *  to `public/` — never a URL built by the caller. Sized by `ratio` by default,
 *  or by a fixed `height` when the slot has to line up with a neighbour. */
export function CatalogImage({
  src,
  category,
  alt,
  ratio = '4 / 3',
  height,
  fallbackSrc,
  eager = false,
  thumb = false,
}: {
  src?: string
  category: ProductCategory
  alt?: string
  /** Aspect ratio of the slot; may be responsive (e.g. a flatter image on a phone). */
  ratio?: string | Record<string, string>
  /** Fixed height instead of a ratio — for slots that must line up with other content. */
  height?: number | string
  /** A second image path tried when `src` is missing (404), before the coloured
   *  placeholder — e.g. a service line whose product has no photo falls back to
   *  one of its project photos. */
  fallbackSrc?: string
  /** Load immediately (above-the-fold slots like the hero). Also makes a 404 fire
   *  promptly so `fallbackSrc` swaps in without waiting to scroll into view. */
  eager?: boolean
  /**
   * Use the 400px copy instead of the full image.
   *
   * For card-sized slots only — a listing of 20 covers is ~8.7 MB of originals
   * against ~1.3 MB of thumbnails, measured. Detail pages, heroes and the
   * lightbox keep the full file, where 400px would visibly soften.
   *
   * A row whose thumbnail is missing falls back to its original through the
   * chain below, so this is safe on content that predates thumbnails.
   */
  thumb?: boolean
}) {
  const meta = CATEGORY_META[category]
  // Catalog photos are uploaded downscaled to a 1600px long edge, so a 4:3 slot
  // is 1600×1200. The wrapper's `aspectRatio` already reserves the box, but the
  // <img> inside it has no intrinsic size until the file loads — in a browser
  // that has not applied the CSS yet (and for a crawler reading the HTML) these
  // attributes are what stop the row from jumping.
  const [boxW, boxH] = height === undefined ? [1600, 1200] : [1600, 1600]
  const placeholder = (
    <Box
      sx={{
        width: '100%', height: '100%', bgcolor: meta.color, color: '#fff',
        display: 'grid', placeItems: 'center', '& svg': { fontSize: 48, opacity: 0.9 },
      }}
    >
      {meta.icon}
    </Box>
  )
  return (
    <Box sx={{ ...(height === undefined ? { aspectRatio: ratio } : { height }), overflow: 'hidden' }}>
      <SmartImage
        src={thumb ? thumbUrl(src) : imageUrl(src)}
        alt={alt}
        eager={eager}
        intrinsicWidth={boxW}
        intrinsicHeight={boxH}
        fallback={
          // Storage 404s a missing thumbnail rather than serving the original,
          // so the full image is the first fallback before `fallbackSrc` and
          // the coloured panel. Nesting reuses SmartImage's own error handling
          // instead of adding a second one.
          thumb ? (
            <SmartImage
              src={imageUrl(src)}
              alt={alt}
              eager={eager}
              intrinsicWidth={boxW}
              intrinsicHeight={boxH}
              fallback={
                fallbackSrc ? (
                  <SmartImage src={imageUrl(fallbackSrc)} alt={alt} eager={eager} fallback={placeholder} />
                ) : (
                  placeholder
                )
              }
            />
          ) : fallbackSrc ? (
            <SmartImage src={imageUrl(fallbackSrc)} alt={alt} eager={eager} fallback={placeholder} />
          ) : (
            placeholder
          )
        }
      />
    </Box>
  )
}
