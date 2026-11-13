import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Alert from '@mui/material/Alert'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import LockIcon from '@mui/icons-material/Lock'
import { PLAN_TEMPLATES } from '../drawing/templates'
import type { HouseFinish } from '../drawing/houseStyle'
import type { DrawingState } from '../drawing/types'
import { PlanFileError, parsePlanFile, parsePlanJson, planFileToJson } from '../drawing/planFile'
import { IsoThumbnail } from './ItemPreview'
import { useAuth } from '../auth/AuthProvider'

interface GalleryPlan {
  key: string
  name: string
  /** i18n key for built-in templates; a literal name for custom files. */
  translate: boolean
  width?: number
  depth?: number
  /** Ground floor — what the card's thumbnail shows. */
  state: DrawingState
  /** Every storey. A built-in template is one. */
  floors?: DrawingState[]
  /** Built-in plans can also carry the finishes they are meant to wear. */
  finish?: HouseFinish
}

interface PlanGalleryProps {
  /** Every storey of the plan on screen, for the download. */
  currentFloors: DrawingState[]
  onLoadPlan: (floors: DrawingState | DrawingState[], finish?: HouseFinish) => void
}

/**
 * How much of the gallery is showing.
 *
 * It opens on ONE row, because the editor above it is the point of the page
 * and a wall of sample plans pushes the house off the screen. From there the
 * grab bar drags down to nothing or up to the full grid.
 */
type GalleryView = 'hidden' | 'row' | 'full'
const VIEW_ORDER: GalleryView[] = ['hidden', 'row', 'full']
const VIEW_KEY = 'cg:designer-gallery-view'
/** Pixels of drag that move it one step. */
const DRAG_STEP = 44

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function PlanCard({
  plan,
  label,
  onClick,
}: {
  plan: GalleryPlan
  label: string
  onClick: () => void
}) {
  return (
    <ButtonBase
      onClick={onClick}
      focusRipple
      sx={{
        flexShrink: 0,
        width: 148,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0.5,
        transition: 'border-color 120ms',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box
        sx={{
          height: 92,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1,
        }}
      >
        <IsoThumbnail state={plan.state} size={82} finish={plan.finish} />
      </Box>
      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {plan.width && plan.depth ? `${plan.width}×${plan.depth} m` : ' '}
      </Typography>
    </ButtonBase>
  )
}

export function PlanGallery({ currentFloors, onLoadPlan }: PlanGalleryProps) {
  const { t } = useTranslation()
  const { requireAuth } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [customPlans, setCustomPlans] = useState<GalleryPlan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setViewState] = useState<GalleryView>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY)
      if (saved === 'hidden' || saved === 'row' || saved === 'full') return saved
    } catch {
      /* blocked site data throws — fall through to the default */
    }
    return 'row'
  })

  const setView = (next: GalleryView) => {
    setViewState(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* the choice just will not survive a reload */
    }
  }

  // The gesture's own bookkeeping. Refs, not state: these are read inside
  // pointer handlers during the same gesture that writes them, and a state
  // update is not visible to the event that follows it (see MEMORY.md).
  const dragFrom = useRef<number | null>(null)
  const dragged = useRef(false)
  // The current step, readable mid-gesture for the same reason: two moves can
  // land before React re-renders, and both would otherwise read the old value.
  const viewRef = useRef(view)
  viewRef.current = view

  const step = (direction: 1 | -1) => {
    const at = VIEW_ORDER.indexOf(viewRef.current)
    const next = VIEW_ORDER[Math.min(VIEW_ORDER.length - 1, Math.max(0, at + direction))]
    if (next === viewRef.current) return
    viewRef.current = next
    setView(next)
  }

  const builtInPlans = useMemo<GalleryPlan[]>(
    () =>
      PLAN_TEMPLATES.map((template) => ({
        key: template.id,
        name: template.nameKey,
        translate: true,
        width: template.width,
        depth: template.depth,
        state: template.build(),
        finish: template.finish,
      })),
    [],
  )

  // Drop-in plans: whatever the team lists in public/plans/manifest.json.
  // Fetched at runtime so files can be added without a rebuild.
  useEffect(() => {
    let cancelled = false
    const base = import.meta.env.BASE_URL
    fetch(`${base}plans/manifest.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('no manifest'))))
      .then(async (files: unknown) => {
        if (!Array.isArray(files)) return
        const loaded = await Promise.all(
          files
            .filter((f): f is string => typeof f === 'string')
            .map(async (file) => {
              try {
                const res = await fetch(`${base}plans/${file}`)
                if (!res.ok) return null
                const plan = parsePlanFile(await res.json(), file.replace(/\.json$/i, ''))
                const gp: GalleryPlan = {
                  key: `custom:${file}`,
                  name: plan.name,
                  translate: false,
                  width: plan.width,
                  depth: plan.depth,
                  state: plan.state,
                  floors: plan.floors,
                }
                return gp
              } catch {
                return null
              }
            }),
        )
        if (!cancelled) setCustomPlans(loaded.filter((p): p is GalleryPlan => p !== null))
      })
      .catch(() => {
        /* no manifest / offline — the built-in plans still show. */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleUploadClick = () => requireAuth(() => fileInput.current?.click())

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    try {
      const plan = parsePlanJson(await file.text(), file.name.replace(/\.json$/i, ''))
      onLoadPlan(plan.floors)
      setError(null)
    } catch (err) {
      setError(err instanceof PlanFileError ? err.message : t('gallery.importError'))
    }
  }

  const handleDownload = () =>
    requireAuth(() => downloadJson('house-plan.json', planFileToJson(currentFloors, 'My plan')))

  return (
    <Paper
      elevation={0}
      square
      sx={{ borderTop: 1, borderColor: 'divider', px: 2, pb: 2, pt: 0.5, flexShrink: 0 }}
    >
      {/* Grab bar. Drag up for the full grid, down to tuck the samples away;
          a plain click is the same toggle for anyone who does not try to
          drag a thing that does not look draggable. */}
      <Box
        role="separator"
        aria-label={t('gallery.resize')}
        onPointerDown={(e) => {
          dragFrom.current = e.clientY
          dragged.current = false
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (dragFrom.current === null) return
          const dy = dragFrom.current - e.clientY // positive = dragged upward
          if (Math.abs(dy) < DRAG_STEP) return
          dragged.current = true
          step(dy > 0 ? 1 : -1)
          dragFrom.current = e.clientY // re-anchor, so a long drag keeps stepping
        }}
        onPointerUp={() => {
          dragFrom.current = null
        }}
        onClick={() => {
          if (dragged.current) return // that was a drag, it already acted
          step(view === 'hidden' ? 1 : -1)
        }}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 18,
          mb: 0.5,
          cursor: 'ns-resize',
          touchAction: 'none', // or the browser scrolls the page instead
          '&:hover > span': { bgcolor: 'primary.main' },
        }}
      >
        <Box
          component="span"
          sx={{ width: 44, height: 4, borderRadius: 2, bgcolor: 'divider', transition: 'background-color 120ms' }}
        />
      </Box>

      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t('gallery.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {view === 'hidden' ? t('gallery.hiddenHint') : t('gallery.hint')}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={handleUploadClick}>
            {t('gallery.upload')}
            <LockIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.6 }} />
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
            {t('gallery.download')}
            <LockIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.6 }} />
          </Button>
        </Stack>
      </Stack>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={handleFile}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {t('gallery.importError')}: {error}
        </Alert>
      )}

      {view !== 'hidden' && (
        <Box
          sx={
            view === 'full'
              ? {
                  // Every plan at once, wrapped — the cards keep their own
                  // width so a card is the same size in both views.
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  pb: 1,
                  pt: 0.5,
                  maxHeight: '48vh',
                  overflowY: 'auto',
                }
              : {
                  // One row that scrolls sideways, which is the default.
                  display: 'flex',
                  gap: 1.5,
                  overflowX: 'auto',
                  pb: 1,
                  pt: 0.5,
                  '::-webkit-scrollbar': { height: 8 },
                }
          }
        >
          {[...customPlans, ...builtInPlans].map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              label={plan.translate ? t(plan.name) : plan.name}
              onClick={() => onLoadPlan(plan.floors ?? plan.state, plan.finish)}
            />
          ))}
        </Box>
      )}
    </Paper>
  )
}
