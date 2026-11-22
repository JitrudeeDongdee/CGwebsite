/**
 * What stands along an open edge — a balcony's railing, or the fence round
 * the plot.
 *
 * ONE vocabulary for both, deliberately. A balcony railing and a garden fence
 * are the same object at different heights in different places: posts, a top
 * rail and something filling the gap. Two enums and two renderers would have
 * drifted the first time one of them gained a style, and the owner asked for
 * the two together ("รั้ว ทั้งรั้วบ้านและระเบียง").
 *
 * Pure data, no three.js — this tier never imports it.
 */

export type RailStyle = 'bar' | 'slat' | 'glass' | 'wall' | 'none'

export interface RailStyleSpec {
  id: RailStyle
  labelKey: string
  /** Vertical bars at this spacing, in metres; 0 for none. */
  bars?: number
  /** Horizontal boards at this spacing; 0 for none. */
  slats?: number
  /** A sheet of glazing between the posts. */
  glazed?: boolean
  /** A solid wall up to the top rail, capped by it. */
  solid?: boolean
}

/**
 * The 100 mm bar spacing is not a style choice: it is roughly what a building
 * code asks for so a child cannot get through, and a balcony rail drawn with
 * fence-sized gaps reads as unsafe to anyone who knows.
 */
export const RAIL_STYLES: readonly RailStyleSpec[] = [
  { id: 'bar', labelKey: 'railing.bar', bars: 0.11 },
  { id: 'slat', labelKey: 'railing.slat', slats: 0.3 },
  { id: 'glass', labelKey: 'railing.glass', glazed: true },
  { id: 'wall', labelKey: 'railing.wall', solid: true },
  { id: 'none', labelKey: 'railing.none' },
]

export function railStyle(id: string | undefined, fallback: RailStyle = 'bar'): RailStyleSpec {
  return (
    RAIL_STYLES.find((one) => one.id === id) ??
    RAIL_STYLES.find((one) => one.id === fallback) ??
    RAIL_STYLES[0]
  )
}

/** A balcony rail is waist-high because that is what stops someone falling. */
export const BALCONY_RAIL_HEIGHT = 1.05

/** How much of the plot the fence closes. */
export type FenceSides = 'far' | 'three' | 'all'

export const FENCE_SIDE_OPTIONS: readonly { id: FenceSides; labelKey: string }[] = [
  // The default, and why: the camera starts off the +x/+z corner, so a fence
  // on every side puts slats across the elevation the customer came to see.
  { id: 'far', labelKey: 'fence.sidesFar' },
  { id: 'three', labelKey: 'fence.sidesThree' },
  { id: 'all', labelKey: 'fence.sidesAll' },
]

export const FENCE_HEIGHTS = { low: 1.1, medium: 1.6, high: 2 } as const
export type FenceHeight = keyof typeof FENCE_HEIGHTS
