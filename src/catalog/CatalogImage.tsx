import Box from '@mui/material/Box'
import { SmartImage } from '../ui/SmartImage'
import { CATEGORY_META } from './categories'
import type { ProductCategory } from './types'

/** A catalog image slot: shows the real photo at `src` once it exists, else a
 *  flat category-coloured panel with the category icon. */
export function CatalogImage({
  src,
  category,
  alt,
  ratio = '4 / 3',
}: {
  src?: string
  category: ProductCategory
  alt?: string
  ratio?: string
}) {
  const meta = CATEGORY_META[category]
  return (
    <Box sx={{ aspectRatio: ratio, overflow: 'hidden' }}>
      <SmartImage
        src={src}
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
