import { createTheme, type Theme } from '@mui/material/styles'
import { brand, sceneColors, type SceneColors } from './palette'

declare module '@mui/material/styles' {
  interface Theme {
    scene: SceneColors
  }
  interface ThemeOptions {
    scene?: SceneColors
  }
}

export type ThemeMode = 'light' | 'dark'

/**
 * Thai text needs a font stack that actually covers Thai glyphs — the
 * default MUI Roboto stack falls back inconsistently across browsers and
 * makes Thai render at a visibly different weight/size than Latin.
 */
const fontFamily = [
  '"IBM Plex Sans Thai Looped"',
  '"Noto Sans Thai"',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(',')

export function buildTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark'

  return createTheme({
    scene: sceneColors[mode],
    palette: {
      mode,
      primary: {
        main: isDark ? brand.blueprint[300] : brand.blueprint[500],
        dark: brand.blueprint[700],
        light: brand.blueprint[100],
        contrastText: isDark ? brand.neutral[950] : brand.neutral[0],
      },
      secondary: {
        main: isDark ? brand.terracotta[300] : brand.terracotta[500],
        dark: brand.terracotta[700],
        light: brand.terracotta[100],
        contrastText: isDark ? brand.neutral[950] : brand.neutral[0],
      },
      background: {
        default: isDark ? brand.neutral[950] : brand.neutral[50],
        paper: isDark ? brand.neutral[900] : brand.neutral[0],
      },
      text: {
        primary: isDark ? brand.neutral[100] : brand.neutral[900],
        secondary: isDark ? brand.neutral[400] : brand.neutral[600],
      },
      divider: isDark ? 'rgba(255,255,255,0.12)' : brand.neutral[200],
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily,
      h1: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.01em' },
      h2: { fontSize: '1.5rem', fontWeight: 600 },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
    },
  })
}
