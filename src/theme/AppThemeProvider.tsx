import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { buildTheme, type ThemeMode } from './theme'

/**
 * The site opens in light mode for everyone (`DEFAULT_PREFERENCE`), regardless of
 * the OS setting — the brand is a light, drafting-paper look. 'system' is still
 * offered in the settings menu for anyone who wants to follow their OS; picking
 * it is stored like any other explicit choice.
 */
const DEFAULT_PREFERENCE: ThemePreference = 'light'

/** 'system' follows the browser/OS; the other two are explicit user overrides. */
export type ThemePreference = ThemeMode | 'system'

interface ThemeModeContextValue {
  preference: ThemePreference
  resolvedMode: ThemeMode
  setPreference: (preference: ThemePreference) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

const STORAGE_KEY = 'cg:theme-preference'

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : DEFAULT_PREFERENCE
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  // Every choice is stored now, 'system' included — with a light default, an
  // empty key has to mean "hasn't chosen", not "follow the OS".
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  const resolvedMode: ThemeMode =
    preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode])

  const value = useMemo(
    () => ({ preference, resolvedMode, setPreference }),
    [preference, resolvedMode],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Room labels render as DOM inside the canvas, so their colours
            have to reach CSS rather than the three.js material path. */}
        <GlobalStyles
          styles={{
            ':root': {
              '--room-label-name': theme.scene.wall,
              '--room-label-area': theme.scene.dimension,
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used inside AppThemeProvider')
  }
  return context
}
