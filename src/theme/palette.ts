/**
 * Brand palette for a house-design / construction company.
 *
 * Primary is a deep "blueprint" blue (architectural drafting heritage,
 * reads as trustworthy/technical); secondary is a terracotta clay tone
 * (brick, construction materials, warmth of a home). Light-mode surfaces
 * are a warm off-white rather than pure white, echoing drafting paper and
 * staying comfortable for long editing sessions.
 */

export const brand = {
  blueprint: {
    50: '#EAF1F6',
    100: '#C7DAE8',
    300: '#6E9CBB',
    500: '#1B4965',
    700: '#123449',
    900: '#0B2231',
  },
  terracotta: {
    100: '#F4DACD',
    300: '#DFA083',
    500: '#C1663F',
    700: '#964A2B',
  },
  /** Warm neutrals — slightly yellow-shifted so surfaces feel like paper, not screen-grey. */
  neutral: {
    0: '#FFFFFF',
    50: '#FAF9F6',
    100: '#F2F0EB',
    200: '#E3E0D9',
    400: '#A8A49B',
    600: '#6B6862',
    800: '#2A2B31',
    900: '#1F2028',
    950: '#16171D',
  },
} as const

/**
 * Colors for the three.js scene. These can't come from CSS — three.js
 * materials need real color values — so both modes are declared here and
 * selected alongside the MUI palette.
 */
export interface SceneColors {
  background: string
  gridMajor: string
  gridMinor: string
  wall: string
  node: string
  draft: string
  snap: string
  /** Dimension text — slightly lighter than walls, as on a real drawing. */
  dimension: string
}

export const sceneColors: Record<'light' | 'dark', SceneColors> = {
  light: {
    background: brand.neutral[50],
    gridMajor: '#C9C5BC',
    gridMinor: '#E3E0D9',
    wall: brand.blueprint[700],
    node: brand.terracotta[500],
    draft: brand.blueprint[300],
    snap: '#2E9E6B',
    dimension: brand.neutral[600],
  },
  dark: {
    background: brand.neutral[950],
    gridMajor: '#3A3F4A',
    gridMinor: '#262A33',
    wall: '#8892A0',
    node: '#E07A3F',
    draft: '#5FA8D3',
    snap: '#3FE08E',
    dimension: '#9CA3AF',
  },
}
