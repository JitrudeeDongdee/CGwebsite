import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import StraightenIcon from '@mui/icons-material/Straighten'
import SensorDoorIcon from '@mui/icons-material/SensorDoor'
import ChairIcon from '@mui/icons-material/Chair'
import VillaIcon from '@mui/icons-material/Villa'
import RoofingIcon from '@mui/icons-material/Roofing'
import FormatPaintIcon from '@mui/icons-material/FormatPaint'
import CalculateIcon from '@mui/icons-material/Calculate'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'

import { WALL_TYPES } from '../drawing/wallTypes'
import { OPENING_PRESETS } from '../drawing/openings'
import { FIXTURE_CATALOG, FIXTURE_GROUPS } from '../drawing/fixtures'
import { HOUSE_STYLES } from '../drawing/houseStyle'
import {
  EAVES_DEPTHS,
  ROOF_PITCHES,
  ROOF_SHAPES,
  type EavesDepth,
  type RoofPitch,
} from '../drawing/roof'
import {
  FRAME_MATERIALS,
  FRAME_SURFACE,
  ROOF_COLORS,
  ROOF_FINISH,
  ROOF_MATERIALS,
  WALL_COLORS,
  WALL_FINISH,
  WALL_MATERIALS,
  type ColorOption,
} from '../drawing/materials'
import type { FixtureKind, OpeningKind } from '../drawing/types'
import type { ToolMode } from '../drawing/tools'
import type { Building3DOptions } from '../scene3d/Scene3D'
import type { MaterialGrade, PriceEstimate } from '../pricing/types'
import { FixturePreview, OpeningPreview, WallTypePreview } from './ItemPreview'
import { MaterialPreview } from './MaterialPreview'
import { RoofShapePreview } from './RoofPreview'
import { DockSection, Swatch, SwatchGrid, SWATCH_SMALL } from './Swatch'
import { AreaSummary } from './AreaSummary'
import { EstimatePanel } from './EstimatePanel'

/**
 * The catalogue dock.
 *
 * Everything you can pick now lives in ONE panel pinned to the bottom-right
 * corner, the way a build-mode catalogue does (the owner named The Sims 4).
 * What it replaces: a 232px tool sidebar on the left and a 288px info column
 * on the right, which between them took 520px off a fixed-height layout and
 * squeezed the house — the thing the customer came to look at — into whatever
 * was left. Now the drawing runs the full width and the catalogue sits over
 * one corner of it, so nothing of the plan is permanently hidden.
 *
 * A rail of category icons, then that category's tiles. Pressing the open
 * category collapses the dock back to the rail, so the house can always be
 * cleared in one click without losing the way back.
 */

type TabId = 'walls' | 'openings' | 'furniture' | 'style' | 'roof' | 'surfaces' | 'summary'

interface Tab {
  id: TabId
  labelKey: string
  Icon: typeof StraightenIcon
}

const PLAN_TABS: Tab[] = [
  { id: 'walls', labelKey: 'dock.walls', Icon: StraightenIcon },
  { id: 'openings', labelKey: 'dock.openings', Icon: SensorDoorIcon },
  { id: 'furniture', labelKey: 'dock.furniture', Icon: ChairIcon },
  { id: 'summary', labelKey: 'dock.summary', Icon: CalculateIcon },
]

const THREE_TABS: Tab[] = [
  { id: 'style', labelKey: 'dock.style', Icon: VillaIcon },
  { id: 'roof', labelKey: 'dock.roof', Icon: RoofingIcon },
  { id: 'surfaces', labelKey: 'dock.surfaces', Icon: FormatPaintIcon },
  { id: 'summary', labelKey: 'dock.summary', Icon: CalculateIcon },
]

const OPEN_KEY = 'cg:designer-dock-open'
const BIG_KEY = 'cg:designer-dock-big'

/** Reads a remembered choice; blocked site data throws, so every read is wrapped. */
function remembered(key: string, fallback: boolean) {
  try {
    const saved = localStorage.getItem(key)
    if (saved === 'yes') return true
    if (saved === 'no') return false
  } catch {
    /* fall through to the default */
  }
  return fallback
}

function remember(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? 'yes' : 'no')
  } catch {
    /* the choice just will not survive a reload */
  }
}

export interface OpeningTool {
  kind: OpeningKind
  width: number
}

interface CatalogDockProps {
  view: 'plan' | 'three'
  /** 2D: what is armed right now. */
  tool: ToolMode
  onSelectWallType: (id: string) => void
  onSelectOpening: (tool: OpeningTool | null) => void
  onSelectFixture: (kind: FixtureKind | null) => void
  /** 3D: the house's finishes. */
  options: Building3DOptions
  onOptionsChange: (options: Building3DOptions) => void
  /** Summary tab. */
  area: number | null
  floorAreas: (number | null)[]
  activeFloor: number
  roomCount: number
  wallCount: number
  grade: MaterialGrade
  onGradeChange: (grade: MaterialGrade) => void
  estimate: PriceEstimate | null
  onSubmitLead: () => void
  usingPlaceholderRates: boolean
}

/** The colour variants of whatever material is selected above them. */
function ColorRow({
  label,
  value,
  colors,
  onChange,
}: {
  label: string
  value: string
  colors: readonly ColorOption[]
  onChange: (hex: string) => void
}) {
  const { t } = useTranslation()

  return (
    <DockSection label={label}>
      <SwatchGrid>
        {colors.map((option) => (
          <Swatch
            key={option.id}
            size={SWATCH_SMALL}
            label={t(`building3d.color.${option.id}`)}
            color={option.hex}
            selected={value.toLowerCase() === option.hex.toLowerCase()}
            onClick={() => onChange(option.hex)}
          />
        ))}
      </SwatchGrid>
    </DockSection>
  )
}

/** A row of word-only choices (pitch, eaves, storeys) kept visually quiet. */
function PillRow<T extends string | number>({
  label,
  value,
  values,
  render,
  onChange,
}: {
  label: string
  value: T
  values: readonly T[]
  render: (item: T) => string
  onChange: (next: T) => void
}) {
  return (
    <DockSection label={label}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {values.map((item) => {
          const selected = item === value
          return (
            <ButtonBase
              key={String(item)}
              onClick={() => onChange(item)}
              aria-pressed={selected}
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 1.5,
                fontSize: 12,
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'action.selected' : 'transparent',
                color: selected ? 'primary.main' : 'text.primary',
                fontWeight: selected ? 600 : 400,
              }}
            >
              {render(item)}
            </ButtonBase>
          )
        })}
      </Box>
    </DockSection>
  )
}

export function CatalogDock({
  view,
  tool,
  onSelectWallType,
  onSelectOpening,
  onSelectFixture,
  options,
  onOptionsChange,
  area,
  floorAreas,
  activeFloor,
  roomCount,
  wallCount,
  grade,
  onGradeChange,
  estimate,
  onSubmitLead,
  usingPlaceholderRates,
}: CatalogDockProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('walls')
  const [open, setOpenState] = useState<boolean>(() => remembered(OPEN_KEY, true))
  /** Expanded: a full-height column down the side instead of a corner box. */
  const [big, setBigState] = useState<boolean>(() => remembered(BIG_KEY, false))

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    remember(OPEN_KEY, next)
  }, [])

  const setBig = useCallback((next: boolean) => {
    setBigState(next)
    remember(BIG_KEY, next)
  }, [])

  const tabs = view === 'three' ? THREE_TABS : PLAN_TABS
  // The tab sets differ by view, so the remembered tab may not exist in the
  // one now on screen — fall back rather than render an empty panel.
  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0].id

  const set = (patch: Partial<Building3DOptions>) => onOptionsChange({ ...options, ...patch })

  const activeOpening = tool.type === 'opening' ? { kind: tool.kind, width: tool.width } : null
  const activeFixture = tool.type === 'fixture' ? tool.kind : null
  const activeWallTypeId = tool.type === 'draw' ? tool.wallTypeId : null

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        zIndex: 3,
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        overflow: 'hidden',
        // Expanded, it stops being a box over the corner and becomes a column
        // down the right-hand side, a third of the width — the customer asked
        // for a bigger catalogue "ข้างๆ", beside the house rather than on it.
        ...(open && big
          ? {
              top: 0,
              bottom: 0,
              right: 0,
              left: { xs: 0, sm: 'auto' },
              width: { xs: 'auto', sm: '33.333%' },
              minWidth: { sm: 360 },
              borderRadius: 0,
              borderLeft: { sm: 1 },
              borderColor: 'divider',
            }
          : {
              right: { xs: 8, sm: 12 },
              left: { xs: 8, sm: 'auto' },
              // Clear of the centred BottomToolbar on a phone, where the dock
              // is full width and would otherwise sit on top of it.
              bottom: { xs: 68, sm: 12 },
              borderRadius: 2,
            }),
      }}
    >
      {/* The category rail: a column beside the panel on a desktop, a bar
          under it on a phone, where a vertical rail would eat the width. */}
      <Stack
        direction={{ xs: 'row', sm: 'column' }}
        sx={{
          flexShrink: 0,
          bgcolor: 'action.hover',
          borderRight: { sm: 1 },
          borderTop: { xs: 1, sm: 0 },
          borderColor: { xs: 'divider', sm: 'divider' },
          p: 0.5,
          gap: 0.25,
        }}
      >
        {tabs.map(({ id, labelKey, Icon }) => {
          const selected = open && id === active
          return (
            <Tooltip key={id} title={t(labelKey)} placement="left">
              <ButtonBase
                onClick={() => {
                  // Pressing the open category puts the house back in full
                  // view; pressing any other one switches to it.
                  if (open && id === active) setOpen(false)
                  else {
                    setTab(id)
                    setOpen(true)
                  }
                }}
                aria-label={t(labelKey)}
                aria-pressed={selected}
                sx={{
                  flexDirection: 'column',
                  gap: 0.125,
                  flex: { xs: 1, sm: '0 0 auto' },
                  width: { xs: 'auto', sm: 58 },
                  // Thai labels wrap to two lines where English does not, so
                  // the buttons are a fixed height rather than a ragged rail.
                  minHeight: 50,
                  py: 0.75,
                  borderRadius: 1.5,
                  color: selected ? 'primary.main' : 'text.secondary',
                  bgcolor: selected ? 'background.paper' : 'transparent',
                }}
              >
                <Icon fontSize="small" />
                <Typography
                  sx={{
                    fontSize: 9.5,
                    lineHeight: 1.15,
                    fontWeight: selected ? 600 : 400,
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    // Short of the line boundary: a Thai tone mark on the
                    // second line otherwise pokes through the cut (MEMORY.md).
                    maxHeight: '2.15em',
                  }}
                >
                  {t(labelKey)}
                </Typography>
              </ButtonBase>
            </Tooltip>
          )
        })}
      </Stack>

      {open && (
        <Box
          sx={{
            width: big ? 'auto' : { xs: 'auto', sm: 312 },
            flexGrow: big ? 1 : 0,
            maxHeight: big ? 'none' : { xs: '40vh', sm: 'min(56vh, 430px)' },
            overflowY: 'auto',
            p: 1.5,
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              {t(tabs.find((item) => item.id === active)!.labelKey)}
            </Typography>
            <Tooltip title={t(big ? 'dock.shrink' : 'dock.expand')}>
              <ButtonBase
                onClick={() => setBig(!big)}
                aria-label={t(big ? 'dock.shrink' : 'dock.expand')}
                sx={{
                  borderRadius: '50%',
                  p: 0.5,
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              >
                {big ? (
                  <CloseFullscreenIcon sx={{ fontSize: 16 }} />
                ) : (
                  <OpenInFullIcon sx={{ fontSize: 16 }} />
                )}
              </ButtonBase>
            </Tooltip>
            <Tooltip title={t('dock.collapse')}>
              <ButtonBase
                onClick={() => setOpen(false)}
                aria-label={t('dock.collapse')}
                sx={{ borderRadius: '50%', p: 0.5, color: 'text.secondary' }}
              >
                <KeyboardArrowDownIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>
          </Stack>

          <Stack spacing={2}>
            {active === 'walls' && (
              <DockSection label={t('wallTypes.title')} hint={t('wallTypes.hint')}>
                <SwatchGrid>
                  {WALL_TYPES.map((wallType) => (
                    <Swatch
                      key={wallType.id}
                      label={t(wallType.labelKey)}
                      caption={t(wallType.labelKey)}
                      hint={
                        wallType.thickness
                          ? `${(wallType.thickness * 100).toFixed(0)} cm`
                          : t('wallTypes.autoHint')
                      }
                      selected={activeWallTypeId === wallType.id}
                      onClick={() => onSelectWallType(wallType.id)}
                    >
                      <Box sx={{ transform: 'scale(1.4)' }}>
                        <WallTypePreview thickness={wallType.thickness} />
                      </Box>
                    </Swatch>
                  ))}
                </SwatchGrid>
              </DockSection>
            )}

            {active === 'openings' && (
              <DockSection
                label={t('openings.title')}
                hint={activeOpening ? t('openings.placeHint') : t('openings.hint')}
              >
                <SwatchGrid>
                  {OPENING_PRESETS.map((preset) => {
                    const selected =
                      activeOpening?.kind === preset.kind && activeOpening.width === preset.width
                    return (
                      <Swatch
                        key={`${preset.kind}-${preset.width}`}
                        label={t(preset.labelKey)}
                        caption={t(preset.labelKey)}
                        selected={selected}
                        onClick={() =>
                          onSelectOpening(
                            selected ? null : { kind: preset.kind, width: preset.width },
                          )
                        }
                      >
                        <Box sx={{ transform: 'scale(1.4)' }}>
                          <OpeningPreview kind={preset.kind} width={preset.width} />
                        </Box>
                      </Swatch>
                    )
                  })}
                </SwatchGrid>
              </DockSection>
            )}

            {active === 'furniture' && (
              <>
                <Typography variant="caption" color="text.secondary">
                  {t('fixtures.hint')}
                </Typography>
                {/* One drawer per group, in catalogue order. Sixteen pieces in
                    a single undivided grid meant hunting for the fridge among
                    the beds; the split is the one the shop already uses. */}
                {FIXTURE_GROUPS.map((group) => {
                  const items = FIXTURE_CATALOG.filter((spec) => spec.group === group.id)
                  if (items.length === 0) return null
                  return (
                    <DockSection key={group.id} label={t(group.labelKey)}>
                      <SwatchGrid>
                        {items.map((spec) => (
                          <Swatch
                            key={spec.kind}
                            label={t(spec.labelKey)}
                            caption={t(spec.labelKey)}
                            hint={`${spec.width}×${spec.depth} m`}
                            selected={activeFixture === spec.kind}
                            onClick={() =>
                              onSelectFixture(activeFixture === spec.kind ? null : spec.kind)
                            }
                          >
                            <Box sx={{ transform: 'scale(1.4)' }}>
                              {/* Follows the view, so the palette never shows
                                  flat plan symbols beside a 3D house. */}
                              <FixturePreview
                                kind={spec.kind}
                                view={view === 'three' ? '3d' : '2d'}
                              />
                            </Box>
                          </Swatch>
                        ))}
                      </SwatchGrid>
                    </DockSection>
                  )
                })}
              </>
            )}

            {active === 'style' && (
              <>
                <DockSection label={t('building3d.style')}>
                  <SwatchGrid>
                    {HOUSE_STYLES.map((style) => (
                      <Swatch
                        key={style.id}
                        label={t(style.labelKey)}
                        caption={t(style.labelKey)}
                        // A style is a jump, not a toggle: every control below
                        // stays live afterwards, so none of them is "the"
                        // current style and nothing here reads as selected.
                        selected={false}
                        onClick={() => set(style.finish)}
                        color={style.finish.wallColor}
                      >
                        <MaterialPreview
                          pattern={WALL_FINISH[style.finish.wall ?? options.wall].pattern}
                          color={style.finish.wallColor ?? options.wallColor}
                        />
                      </Swatch>
                    ))}
                  </SwatchGrid>
                </DockSection>

                <PillRow
                  label={t('building3d.view')}
                  value={options.showRoof ? 'whole' : 'cutaway'}
                  values={['whole', 'cutaway'] as const}
                  render={(item) => t(`building3d.${item}`)}
                  onChange={(next) => set({ showRoof: next === 'whole' })}
                />

                <Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={options.furniture}
                        onChange={(event) => set({ furniture: event.target.checked })}
                      />
                    }
                    label={<Typography variant="body2">{t('building3d.furniture')}</Typography>}
                    sx={{ mr: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={options.scenery}
                        onChange={(event) => set({ scenery: event.target.checked })}
                      />
                    }
                    label={<Typography variant="body2">{t('building3d.scenery')}</Typography>}
                    sx={{ mr: 0 }}
                  />
                </Stack>
              </>
            )}

            {active === 'roof' && (
              <>
                <DockSection label={t('building3d.roofShape')}>
                  <SwatchGrid>
                    {ROOF_SHAPES.map((shape) => (
                      <Swatch
                        key={shape}
                        label={t(`building3d.roof.${shape}`)}
                        caption={t(`building3d.roof.${shape}`)}
                        selected={options.roof === shape}
                        onClick={() => set({ roof: shape })}
                      >
                        <RoofShapePreview shape={shape} />
                      </Swatch>
                    ))}
                  </SwatchGrid>
                </DockSection>

                {options.roof !== 'flat' && (
                  <PillRow<RoofPitch>
                    label={t('building3d.pitch')}
                    value={options.pitch}
                    values={ROOF_PITCHES}
                    render={(item) => t(`building3d.pitches.${item}`)}
                    onChange={(pitch) => set({ pitch })}
                  />
                )}

                <PillRow<EavesDepth>
                  label={t('building3d.eaves')}
                  value={options.eaves}
                  values={EAVES_DEPTHS}
                  render={(item) => t(`building3d.eavesOpt.${item}`)}
                  onChange={(eaves) => set({ eaves })}
                />

                <DockSection label={t('building3d.roofMaterial')}>
                  <SwatchGrid>
                    {ROOF_MATERIALS.map((material) => (
                      <Swatch
                        key={material}
                        label={t(`building3d.roofMat.${material}`)}
                        caption={t(`building3d.roofMat.${material}`)}
                        selected={options.roofMaterial === material}
                        onClick={() =>
                          set({
                            roofMaterial: material,
                            // The colour this finish usually comes in; the row
                            // below can still override it.
                            roofColor: ROOF_FINISH[material].defaultColor,
                          })
                        }
                      >
                        <MaterialPreview
                          pattern={ROOF_FINISH[material].pattern}
                          color={
                            options.roofMaterial === material
                              ? options.roofColor
                              : ROOF_FINISH[material].defaultColor
                          }
                        />
                      </Swatch>
                    ))}
                  </SwatchGrid>
                </DockSection>

                <ColorRow
                  label={t('building3d.roofColor')}
                  value={options.roofColor}
                  colors={ROOF_COLORS}
                  onChange={(roofColor) => set({ roofColor })}
                />
              </>
            )}

            {active === 'surfaces' && (
              <>
                <DockSection label={t('building3d.wallMaterial')}>
                  <SwatchGrid>
                    {WALL_MATERIALS.map((material) => (
                      <Swatch
                        key={material}
                        label={t(`building3d.wallMat.${material}`)}
                        caption={t(`building3d.wallMat.${material}`)}
                        selected={options.wall === material}
                        onClick={() =>
                          set({ wall: material, wallColor: WALL_FINISH[material].defaultColor })
                        }
                      >
                        <MaterialPreview
                          pattern={WALL_FINISH[material].pattern}
                          color={
                            options.wall === material
                              ? options.wallColor
                              : WALL_FINISH[material].defaultColor
                          }
                        />
                      </Swatch>
                    ))}
                  </SwatchGrid>
                </DockSection>

                <ColorRow
                  label={t('building3d.wallColor')}
                  value={options.wallColor}
                  colors={WALL_COLORS}
                  onChange={(wallColor) => set({ wallColor })}
                />

                <DockSection label={t('building3d.frameMaterial')}>
                  <SwatchGrid>
                    {FRAME_MATERIALS.map((material) => (
                      <Swatch
                        key={material}
                        label={t(`building3d.frameMat.${material}`)}
                        caption={t(`building3d.frameMat.${material}`)}
                        selected={options.frame === material}
                        onClick={() => set({ frame: material })}
                        // A frame finish is a colour, so the tile is that
                        // colour — no pattern to draw.
                        color={FRAME_SURFACE[material].color}
                      />
                    ))}
                  </SwatchGrid>
                </DockSection>

                <Typography variant="caption" color="text.secondary">
                  {t('building3d.note')}
                </Typography>
              </>
            )}

            {active === 'summary' && (
              <>
                <AreaSummary
                  bare
                  area={area}
                  floorAreas={floorAreas}
                  activeFloor={activeFloor}
                  roomCount={roomCount}
                  wallCount={wallCount}
                />
                <EstimatePanel
                  bare
                  grade={grade}
                  onGradeChange={onGradeChange}
                  estimate={estimate}
                  onSubmit={onSubmitLead}
                  usingPlaceholderRates={usingPlaceholderRates}
                />
              </>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}
