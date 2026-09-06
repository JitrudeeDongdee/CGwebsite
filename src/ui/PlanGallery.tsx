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
  state: DrawingState
}

interface PlanGalleryProps {
  currentState: DrawingState
  onLoadPlan: (state: DrawingState) => void
}

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
        <IsoThumbnail state={plan.state} size={82} />
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

export function PlanGallery({ currentState, onLoadPlan }: PlanGalleryProps) {
  const { t } = useTranslation()
  const { requireAuth } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [customPlans, setCustomPlans] = useState<GalleryPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  const builtInPlans = useMemo<GalleryPlan[]>(
    () =>
      PLAN_TEMPLATES.map((template) => ({
        key: template.id,
        name: template.nameKey,
        translate: true,
        width: template.width,
        depth: template.depth,
        state: template.build(),
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
      onLoadPlan(plan.state)
      setError(null)
    } catch (err) {
      setError(err instanceof PlanFileError ? err.message : t('gallery.importError'))
    }
  }

  const handleDownload = () =>
    requireAuth(() => downloadJson('house-plan.json', planFileToJson(currentState, 'My plan')))

  return (
    <Paper
      elevation={0}
      square
      sx={{ borderTop: 1, borderColor: 'divider', p: 2, flexShrink: 0 }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5, gap: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t('gallery.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('gallery.hint')}
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

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ overflowX: 'auto', pb: 1, pt: 0.5, '::-webkit-scrollbar': { height: 8 } }}
      >
        {[...customPlans, ...builtInPlans].map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            label={plan.translate ? t(plan.name) : plan.name}
            onClick={() => onLoadPlan(plan.state)}
          />
        ))}
      </Stack>
    </Paper>
  )
}
