/**
 * The "location · year · area" line under a project card.
 *
 * Joining with a literal `·` leaves a stray separator whenever a field is
 * missing — community items carry no province and two imported jobs have no
 * year, so cards were rendering "· 2569" and "เพชรบูรณ์ ·". Dropping the empty
 * parts first is the only way that line can never look broken.
 */
export function joinMeta(...parts: (string | null | undefined)[]): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(' · ')
}
