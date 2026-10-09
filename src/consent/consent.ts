/**
 * Cookie consent, as PDPA requires it.
 *
 * Thailand's PDPA treats analytics cookies as personal data processing that
 * needs consent BEFORE it happens — so this is opt-in, not opt-out: GA is not
 * loaded at all until someone accepts. "Unknown" is therefore a real third
 * state, not a synonym for "yes".
 *
 * Three rules shape the API below, and each is a legal requirement rather than
 * a preference:
 *  - refusing must be as easy as accepting (see the banner's two equal buttons);
 *  - consent must be withdrawable at any time (`openCookieSettings`, linked from
 *    the footer);
 *  - the record must say WHEN it was given, so it can be shown on request.
 */

export type ConsentChoice = 'granted' | 'denied'

export interface ConsentRecord {
  choice: ConsentChoice
  /** ISO timestamp — PDPA expects you to be able to show when consent was given. */
  at: string
}

const STORAGE_KEY = 'cg:cookie-consent'

/** Fired on the window when the choice changes, so listeners update without a reload. */
export const CONSENT_EVENT = 'cg:consent-change'

/**
 * The stored decision, or null when nobody has chosen yet.
 *
 * Every access is wrapped: a browser with site data blocked THROWS on
 * localStorage rather than returning null, and a consent banner that crashes the
 * page would be worse than one that asks twice.
 */
export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'choice' in parsed &&
      ((parsed as ConsentRecord).choice === 'granted' || (parsed as ConsentRecord).choice === 'denied')
    ) {
      return parsed as ConsentRecord
    }
    return null
  } catch {
    return null
  }
}

export function consentGranted(): boolean {
  return readConsent()?.choice === 'granted'
}

/** Records a decision and tells the app about it. */
export function setConsent(choice: ConsentChoice): void {
  const record: ConsentRecord = { choice, at: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Storage blocked: the choice still applies to this page view through the
    // event below — it just won't be remembered next time, and the banner will
    // ask again. Asking again is the safe failure.
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_EVENT, { detail: record }))
}

/** Reopens the banner so a choice can be changed — withdrawal must be as easy as giving. */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))
}
