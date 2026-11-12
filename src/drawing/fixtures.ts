import type { DrawFixture, FixtureKind, Point } from './types'

export interface FixtureSpec {
  kind: FixtureKind
  labelKey: string
  /** Metres, at zero rotation: width runs along x, depth along y. */
  width: number
  depth: number
  /** Columns are structural and draw solid; furniture draws as an outline. */
  solid: boolean
}

/** Real-world sizes so the plan stays to scale. */
export const FIXTURE_CATALOG: FixtureSpec[] = [
  { kind: 'column', labelKey: 'fixtures.column', width: 0.2, depth: 0.2, solid: true },
  { kind: 'bedDouble', labelKey: 'fixtures.bedDouble', width: 1.6, depth: 2.0, solid: false },
  { kind: 'bedSingle', labelKey: 'fixtures.bedSingle', width: 1.0, depth: 2.0, solid: false },
  { kind: 'sofa', labelKey: 'fixtures.sofa', width: 2.0, depth: 0.85, solid: false },
  { kind: 'table', labelKey: 'fixtures.table', width: 1.4, depth: 0.8, solid: false },
  { kind: 'kitchen', labelKey: 'fixtures.kitchen', width: 2.4, depth: 0.6, solid: false },
  { kind: 'toilet', labelKey: 'fixtures.toilet', width: 0.4, depth: 0.7, solid: false },
  { kind: 'sink', labelKey: 'fixtures.sink', width: 0.5, depth: 0.45, solid: false },
  // Added 2026-11-12 for the 12 m cabin sample, which needed every one of
  // these. Sizes are the real article, as above.
  { kind: 'sofaL', labelKey: 'fixtures.sofaL', width: 2.6, depth: 1.7, solid: false },
  { kind: 'coffeeTable', labelKey: 'fixtures.coffeeTable', width: 1, depth: 0.6, solid: false },
  { kind: 'diningRound', labelKey: 'fixtures.diningRound', width: 1.4, depth: 1.4, solid: false },
  { kind: 'chair', labelKey: 'fixtures.chair', width: 0.5, depth: 0.5, solid: false },
  { kind: 'fridge', labelKey: 'fixtures.fridge', width: 0.6, depth: 0.65, solid: false },
  { kind: 'wardrobe', labelKey: 'fixtures.wardrobe', width: 1, depth: 0.6, solid: false },
  { kind: 'nightstand', labelKey: 'fixtures.nightstand', width: 0.45, depth: 0.4, solid: false },
  { kind: 'shower', labelKey: 'fixtures.shower', width: 0.9, depth: 0.9, solid: false },
]

export function fixtureSpec(kind: FixtureKind): FixtureSpec {
  return FIXTURE_CATALOG.find((item) => item.kind === kind) ?? FIXTURE_CATALOG[0]
}

/**
 * Nearest fixture whose footprint contains the point, for click targeting.
 * Tested in the fixture's own rotated frame so a turned sofa still hits.
 */
export function findFixtureAt(fixtures: DrawFixture[], point: Point): DrawFixture | null {
  // Later fixtures draw on top, so hit-test them first.
  for (let i = fixtures.length - 1; i >= 0; i--) {
    const fixture = fixtures[i]
    const dx = point.x - fixture.x
    const dy = point.y - fixture.y
    const cos = Math.cos(-fixture.rotation)
    const sin = Math.sin(-fixture.rotation)
    const localX = dx * cos - dy * sin
    const localY = dx * sin + dy * cos

    if (
      Math.abs(localX) <= fixture.width / 2 &&
      Math.abs(localY) <= fixture.depth / 2
    ) {
      return fixture
    }
  }
  return null
}
