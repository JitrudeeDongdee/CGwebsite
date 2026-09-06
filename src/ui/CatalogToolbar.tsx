import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import type { ProductCategory } from '../catalog/types'

/**
 * Category toggles + a search box + the result count, shared by the products
 * and portfolio listings. State lives in the URL — see `useCatalogQuery`.
 */
export function CatalogToolbar({
  category,
  query,
  onCategory,
  onQuery,
  searchPlaceholder,
  resultCount,
}: {
  category: ProductCategory | 'all'
  query: string
  onCategory: (next: ProductCategory | 'all') => void
  onQuery: (next: string) => void
  searchPlaceholder: string
  resultCount: number
}) {
  const { t } = useTranslation()
  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mt: 3, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={category}
          onChange={(_, next: ProductCategory | 'all' | null) => next && onCategory(next)}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all">{t('mkt.catalog.all')}</ToggleButton>
          {PRODUCT_CATEGORIES.map((c) => (
            <ToggleButton key={c} value={c}>{t(CATEGORY_META[c].labelKey)}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          size="small"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={searchPlaceholder}
          sx={{ minWidth: { md: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label={t('mkt.catalog.clear')} onClick={() => onQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {t('mkt.catalog.resultCount', { count: resultCount })}
      </Typography>
    </>
  )
}
