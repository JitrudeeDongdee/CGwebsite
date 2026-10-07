import { useCallback, useState } from 'react'

export type ViewMode = 'list' | 'grid'

/**
 * Whether a listing screen shows a table or a card grid.
 *
 * Stored per screen (`cg:admin-view:products`, `…:portfolio`, `…:community`)
 * rather than once for the whole back office: the right answer differs by
 * content. Photo-heavy portfolio work is easier to recognise as cards, while
 * products are usually scanned by name and price, which a table does better.
 *
 * `list` is the default because it is what these screens have always been —
 * a stored preference only ever has to explain a change the user made.
 *
 * Reads and writes are wrapped in try/catch: a browser with site data blocked
 * throws on access rather than returning null, and a crashing preference would
 * take the whole screen down with it.
 */
export function useViewMode(key: string, fallback: ViewMode = 'list') {
  const storageKey = `cg:admin-view:${key}`

  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved === 'grid' || saved === 'list' ? saved : fallback
    } catch {
      return fallback
    }
  })

  const choose = useCallback(
    (next: ViewMode) => {
      setMode(next)
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        /* preference is a convenience; losing it must not break the page */
      }
    },
    [storageKey],
  )

  return [mode, choose] as const
}
