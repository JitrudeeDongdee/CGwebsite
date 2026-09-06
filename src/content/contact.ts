import data from './contact.json'
import type { Localized } from '../catalog/types'

/**
 * The company's contact channels — **edit `contact.json`, nowhere else**. Both
 * the marketing footer and the contact page read from here, so a phone number
 * or email only ever changes in one place.
 *
 * `kind` picks the icon, the label (`mkt.contact.<kind>Label`) and the link:
 * phone → `tel:`, email → `mailto:`, facebook → its page URL, and line/address
 * link only when the entry carries an explicit `url` (we don't invent a LINE or
 * map URL).
 *
 * `value` is either one string (a phone number, an email, a LINE id — the same
 * in every language) or a `{ th, en }` pair for text that must be translated,
 * such as the address. Resolve it with `contactValue`.
 */
export type ContactKind = 'phone' | 'line' | 'email' | 'facebook' | 'address'

export interface ContactChannel {
  kind: ContactKind
  /** What the visitor sees — one string, or `{ th, en }` when it needs translating. */
  value: string | Localized
  /** Optional explicit link, for channels we can't derive one for. */
  url?: string
}

export const CONTACT_CHANNELS = data.channels as ContactChannel[]

/** The channel's text in `lang` ('th' | 'en'); plain strings pass through. */
export function contactValue(channel: ContactChannel, lang: 'th' | 'en'): string {
  return typeof channel.value === 'string' ? channel.value : channel.value[lang]
}

/** i18n key for the channel's label, e.g. `mkt.contact.phoneLabel`. */
export function contactLabelKey(channel: ContactChannel): string {
  return `mkt.contact.${channel.kind}Label`
}

/** Values that mean "not filled in yet" — never rendered as a link, and hidden in the footer. */
const PLACEHOLDERS = new Set(['', '-', '—', 'N/A'])

/** True when the channel has no real value yet. */
export function isPlaceholder(channel: ContactChannel, lang: 'th' | 'en'): boolean {
  return PLACEHOLDERS.has(contactValue(channel, lang).trim())
}

/** The href for a channel, or undefined when it isn't linkable. */
export function contactHref(channel: ContactChannel, lang: 'th' | 'en' = 'th'): string | undefined {
  if (isPlaceholder(channel, lang)) return undefined
  // A `url` only counts when it actually looks like one — a leftover "-" must not
  // become <a href="-">.
  if (channel.url && /^(https?:|mailto:|tel:|\/)/.test(channel.url.trim())) return channel.url.trim()
  // Only single-string channels are linkable; a translated value (the address)
  // needs an explicit `url` if it should link anywhere.
  if (typeof channel.value !== 'string') return undefined
  if (channel.kind === 'phone') {
    // A placeholder like "0X-XXX-XXXX" strips down to "0" — not a dialable number.
    const digits = channel.value.replace(/[^\d+]/g, '')
    return digits.replace(/\D/g, '').length >= 6 ? `tel:${digits}` : undefined
  }
  if (channel.kind === 'email') return channel.value.includes('@') ? `mailto:${channel.value}` : undefined
  // A Facebook page is linkable straight from its value when that value is the
  // page URL; a bare page name needs an explicit `url`.
  if (channel.kind === 'facebook') return /^https?:\/\//.test(channel.value) ? channel.value : undefined
  return undefined
}

/** Channels worth listing in the footer — ones not filled in yet are skipped. */
export function footerChannels(lang: 'th' | 'en'): ContactChannel[] {
  return CONTACT_CHANNELS.filter((c) => !isPlaceholder(c, lang))
}
