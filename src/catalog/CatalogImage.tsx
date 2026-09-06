import Box from '@mui/material/Box'
import { SmartImage } from '../ui/SmartImage'
import { imageUrl } from '../supabase/storage'
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
}: {
  src?: string
  category: ProductCategory
  alt?: string
  ratio?: string
  /** Fixed height instead of a ratio — for slots that must line up with other content. */
  height?: number | string
  /** A second image path tried when `src` is missing (404), before the coloured
   *  placeholder — e.g. a service line whose product has no photo falls back to
   *  one of its project photos. */
  fallbackSrc?: string
  /** Load immediately (above-the-fold slots like the hero). Also makes a 404 fire
   *  promptly so `fallbackSrc` swaps in without waiting to scroll into view. */
  eager?: boolean
}) {
  const meta = CATEGORY_META[category]
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
        src={imageUrl(src)}
        alt={alt}
        eager={eager}
        fallback={
          fallbackSrc ? (
            <SmartImage src={imageUrl(fallbackSrc)} alt={alt} eager={eager} fallback={placeholder} />
          ) : (
            placeholder
          )
        }
      />
    </Box>
  )
}
