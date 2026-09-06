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
}: {
  src?: string
  category: ProductCategory
  alt?: string
  ratio?: string
  /** Fixed height instead of a ratio — for slots that must line up with other content. */
  height?: number | string
}) {
  const meta = CATEGORY_META[category]
  return (
    <Box sx={{ ...(height === undefined ? { aspectRatio: ratio } : { height }), overflow: 'hidden' }}>
      <SmartImage
        src={imageUrl(src)}
        alt={alt}
        fallback={
          <Box
            sx={{
              width: '100%', height: '100%', bgcolor: meta.color, color: '#fff',
              display: 'grid', placeItems: 'center', '& svg': { fontSize: 48, opacity: 0.9 },
            }}
          >
            {meta.icon}
          </Box>
        }
      />
    </Box>
  )
}
