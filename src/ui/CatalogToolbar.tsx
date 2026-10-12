import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import TuneIcon from '@mui/icons-material/Tune'
import CheckIcon from '@mui/icons-material/Check'
import { CATEGORY_META, PRODUCT_CATEGORIES } from '../catalog/categories'
import type { ProductCategory } from '../catalog/types'

type Cat = ProductCategory | 'all'

/** Show at most a handful of suggestions, matched case-insensitively. */
const filterSuggestions = createFilterOptions<string>({ limit: 8, trim: true })

/**
 * A full-width search box + a filter the category picker lives behind: on
 * desktop the filter icon opens a dropdown menu, on a phone it opens a panel
 * that slides in from the right. The chosen category shows as a removable chip
 * so it stays visible once the menu/drawer is closed. State lives in the URL —
 * see `useCatalogQuery`.
 */
export function CatalogToolbar({
  category,
  query,
  onCategory,
  onQuery,
  searchPlaceholder,
  resultCount,
  suggestions = [],
}: {
  category: Cat
  query: string
  onCategory: (next: Cat) => void
  onQuery: (next: string) => void
  searchPlaceholder: string
  resultCount: number
  /** Words offered as you type in the search box (e.g. product/project names). */
  suggestions?: string[]
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const cats: Cat[] = ['all', ...PRODUCT_CATEGORIES]
  const labelFor = (c: Cat) => (c === 'all' ? t('mkt.catalog.all') : t(CATEGORY_META[c].labelKey))
  const filtered = category !== 'all'
  const options = Array.from(new Set(suggestions.filter(Boolean)))

  const openFilter = (e: React.MouseEvent<HTMLElement>) => {
    if (isMobile) setDrawerOpen(true)
    else setAnchorEl(e.currentTarget)
  }
  const closeFilter = () => {
    setAnchorEl(null)
    setDrawerOpen(false)
  }
  const pick = (c: Cat) => {
    onCategory(c)
    closeFilter()
  }

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mt: 3, alignItems: 'center' }}>
        <Autocomplete
          freeSolo
          fullWidth
          options={options}
          filterOptions={filterSuggestions}
          inputValue={query}
          onInputChange={(_, value) => onQuery(value)}
          autoHighlight
          sx={{ flex: 1 }}
          slotProps={{ paper: { sx: { borderRadius: 2 } } }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={searchPlaceholder}
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps.input,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />
        <Tooltip title={t('mkt.catalog.filter')}>
          <IconButton
            aria-label={t('mkt.catalog.filter')}
            onClick={openFilter}
            sx={{
              flexShrink: 0, width: 48, height: 48, borderRadius: 2, border: 1,
              borderColor: filtered ? 'primary.main' : 'divider',
              color: filtered ? 'primary.main' : 'text.secondary',
            }}
          >
            <Badge color="secondary" variant="dot" invisible={!filtered}>
              <TuneIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Desktop: dropdown anchored to the filter button. */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeFilter} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        {cats.map((c) => (
          <MenuItem key={c} selected={category === c} onClick={() => pick(c)} sx={{ minWidth: 200 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>{category === c ? <CheckIcon fontSize="small" color="primary" /> : null}</ListItemIcon>
            <ListItemText>{labelFor(c)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Mobile: a panel that slides in from the right. */}
      <Drawer anchor="right" open={drawerOpen} onClose={closeFilter}>
        <Box sx={{ width: 280, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>{t('mkt.catalog.filter')}</Typography>
            <IconButton onClick={closeFilter} aria-label={t('mkt.catalog.clear')}>
              <ClearIcon />
            </IconButton>
          </Stack>
          <Divider />
          <List sx={{ py: 0 }}>
            {cats.map((c) => (
              <ListItemButton key={c} selected={category === c} onClick={() => pick(c)}>
                <ListItemText slotProps={{ primary: { sx: { fontWeight: category === c ? 600 : 400 } } }}>{labelFor(c)}</ListItemText>
                {category === c && <CheckIcon fontSize="small" color="primary" />}
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {filtered && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={labelFor(category)}
            onDelete={() => onCategory('all')}
          />
        )}
        <Typography variant="body2" color="text.secondary">
          {t('mkt.catalog.resultCount', { count: resultCount })}
        </Typography>
      </Stack>
    </>
  )
}
