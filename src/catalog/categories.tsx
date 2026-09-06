import type { ReactNode } from 'react'
import HomeIcon from '@mui/icons-material/Home'
import MemoryIcon from '@mui/icons-material/Memory'
import ChairIcon from '@mui/icons-material/Chair'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import type { ProductCategory } from './types'

/** Per-category display meta: i18n label key (reuses the Home service labels),
 *  an accent colour for the placeholder image panel, and an icon. */
export const CATEGORY_META: Record<
  ProductCategory,
  { labelKey: string; color: string; icon: ReactNode }
> = {
  house: { labelKey: 'mkt.home.svc1', color: '#1B4965', icon: <HomeIcon /> },
  electronics: { labelKey: 'mkt.home.svc2', color: '#3B6D11', icon: <MemoryIcon /> },
  furniture: { labelKey: 'mkt.home.svc3', color: '#C1663F', icon: <ChairIcon /> },
  rental: { labelKey: 'mkt.home.svc4', color: '#854F0B', icon: <AgricultureIcon /> },
}

export const PRODUCT_CATEGORIES: ProductCategory[] = ['house', 'electronics', 'furniture', 'rental']
