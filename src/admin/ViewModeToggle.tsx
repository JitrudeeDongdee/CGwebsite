import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import ViewListIcon from '@mui/icons-material/ViewList'
import GridViewIcon from '@mui/icons-material/GridView'
import type { ViewMode } from './useViewMode'

/**
 * List / grid switch for the admin listing screens.
 *
 * `exclusive` plus the null guard matters: MUI fires `onChange` with `null`
 * when the active button is clicked again, and passing that straight through
 * would leave the screen with no view at all.
 */
export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (next: ViewMode) => void
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, next: ViewMode | null) => next && onChange(next)}
      aria-label="รูปแบบการแสดงผล"
    >
      <Tooltip title="แสดงเป็นตาราง">
        <ToggleButton value="list" aria-label="ตาราง">
          <ViewListIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="แสดงเป็นการ์ด">
        <ToggleButton value="grid" aria-label="การ์ด">
          <GridViewIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  )
}
