import type { DrawFixture, FixtureKind, Point } from './types'

/**
 * Which drawer of the catalogue a piece lives in.
 *
 * `furniture` and `electronics` are deliberately the SAME split the shop uses
 * on the rest of the site (`ProductCategory`), so a customer meets one idea of
 * what a sofa is and what a fridge is wherever they are. The other two have no
 * counterpart in the shop — nobody buys a structural column or a WC off the
 * products page — so they are the designer's own.
 */
export type FixtureGroup = 'furniture' | 'electronics' | 'sanitary' | 'structure' | 'outdoor'

/** Drawer order in the palette, and the heading each one carries. */
export const FIXTURE_GROUPS: { id: FixtureGroup; labelKey: string }[] = [
  { id: 'furniture', labelKey: 'fixtures.groupFurniture' },
  { id: 'electronics', labelKey: 'fixtures.groupElectronics' },
  { id: 'sanitary', labelKey: 'fixtures.groupSanitary' },
  { id: 'outdoor', labelKey: 'fixtures.groupOutdoor' },
  { id: 'structure', labelKey: 'fixtures.groupStructure' },
]

export interface FixtureSpec {
  kind: FixtureKind
  labelKey: string
  /** Metres, at zero rotation: width runs along x, depth along y. */
  width: number
  depth: number
  /** Columns are structural and draw solid; furniture draws as an outline. */
  solid: boolean
  group: FixtureGroup
}

/** Real-world sizes so the plan stays to scale. */
export const FIXTURE_CATALOG: FixtureSpec[] = [
  { kind: 'column', labelKey: 'fixtures.column', width: 0.2, depth: 0.2, solid: true, group: 'structure' },
  { kind: 'bedDouble', labelKey: 'fixtures.bedDouble', width: 1.6, depth: 2.0, solid: false, group: 'furniture' },
  { kind: 'bedSingle', labelKey: 'fixtures.bedSingle', width: 1.0, depth: 2.0, solid: false, group: 'furniture' },
  { kind: 'sofa', labelKey: 'fixtures.sofa', width: 2.0, depth: 0.85, solid: false, group: 'furniture' },
  { kind: 'table', labelKey: 'fixtures.table', width: 1.4, depth: 0.8, solid: false, group: 'furniture' },
  // A built-in kitchen run is sold as furniture on the products page, so it
  // is filed as furniture here too rather than invented into its own group.
  { kind: 'kitchen', labelKey: 'fixtures.kitchen', width: 2.4, depth: 0.6, solid: false, group: 'furniture' },
  { kind: 'toilet', labelKey: 'fixtures.toilet', width: 0.4, depth: 0.7, solid: false, group: 'sanitary' },
  { kind: 'sink', labelKey: 'fixtures.sink', width: 0.5, depth: 0.45, solid: false, group: 'sanitary' },
  // Added 2026-11-12 for the 12 m cabin sample, which needed every one of
  // these. Sizes are the real article, as above.
  { kind: 'sofaL', labelKey: 'fixtures.sofaL', width: 2.6, depth: 1.7, solid: false, group: 'furniture' },
  { kind: 'coffeeTable', labelKey: 'fixtures.coffeeTable', width: 1, depth: 0.6, solid: false, group: 'furniture' },
  { kind: 'diningRound', labelKey: 'fixtures.diningRound', width: 1.4, depth: 1.4, solid: false, group: 'furniture' },
  { kind: 'chair', labelKey: 'fixtures.chair', width: 0.5, depth: 0.5, solid: false, group: 'furniture' },
  { kind: 'fridge', labelKey: 'fixtures.fridge', width: 0.6, depth: 0.65, solid: false, group: 'electronics' },
  { kind: 'wardrobe', labelKey: 'fixtures.wardrobe', width: 1, depth: 0.6, solid: false, group: 'furniture' },
  { kind: 'nightstand', labelKey: 'fixtures.nightstand', width: 0.45, depth: 0.4, solid: false, group: 'furniture' },
  { kind: 'shower', labelKey: 'fixtures.shower', width: 0.9, depth: 0.9, solid: false, group: 'sanitary' },
  { kind: 'tv', labelKey: 'fixtures.tv', width: 1.4, depth: 0.4, solid: false, group: 'electronics' },
  // The terrace in the reference render: folding chairs round a fire pit.
  { kind: 'campChair', labelKey: 'fixtures.campChair', width: 0.7, depth: 0.7, solid: false, group: 'outdoor' },
  { kind: 'firePit', labelKey: 'fixtures.firePit', width: 0.9, depth: 0.9, solid: false, group: 'outdoor' },
  // Not furniture: an area with no floor, cut out of the room it sits in.
  { kind: 'floorVoid', labelKey: 'fixtures.floorVoid', width: 2, depth: 2, solid: false, group: 'structure' },
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
