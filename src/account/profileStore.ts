/**
 * The signed-in user's own editable profile (display name, avatar, address).
 *
 * There is no backend column for these yet, so — following the same swappable
 * pattern as leads / price-config — they live in `localStorage`, keyed per user,
 * until a `profiles` migration + storage bucket land. Everything is wrapped in
 * try/catch because storage can throw (private mode, blocked site data) and the
 * page must still render.
 */
export interface LocalProfile {
  displayName: string
  address: string
  /** A small data-URL (resized on upload); empty string = no custom photo. */
  avatar: string
}

const EMPTY: LocalProfile = { displayName: '', address: '', avatar: '' }

const keyFor = (userId: string) => `cg:profile:${userId}`

/** Broadcast so other mounted components (e.g. the header avatar) can refresh. */
export const PROFILE_EVENT = 'cg:profile-updated'

export function loadProfile(userId: string): LocalProfile {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<LocalProfile>
    return {
      displayName: parsed.displayName ?? '',
      address: parsed.address ?? '',
      avatar: parsed.avatar ?? '',
    }
  } catch {
    return EMPTY
  }
}

export function saveProfile(userId: string, profile: LocalProfile): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(profile))
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: { userId } }))
  } catch {
    // Storage unavailable — the in-memory form state still reflects the edit.
  }
}
