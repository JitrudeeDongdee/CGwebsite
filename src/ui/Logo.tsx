import { useState } from 'react'

/**
 * TDD (Thai Dongdee Engineering) logo mark — renders `public/favicon.svg`, the
 * same file the browser tab icon uses, so the logo only ever changes in one
 * place. Vector, so it stays crisp at any size and on any background. Falls
 * back to an inline copy of the same artwork if the file can't be loaded.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  const [failed, setFailed] = useState(false)
  const src = `${import.meta.env.BASE_URL}favicon.svg`

  if (!failed) {
    return (
      <img
        src={src}
        alt="TDD"
        height={size}
        onError={() => setFailed(true)}
        style={{ display: 'block', height: size, width: 'auto', flexShrink: 0 }}
      />
    )
  }

  // Fallback approximation (only if the PNG is unavailable).
  return (
    <svg
      width={size}
      height={(size * 112) / 96}
      viewBox="0 0 96 112"
      role="img"
      aria-label="TDD"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M16 6 H80 A10 10 0 0 1 90 16 V60 C90 86 72 100 48 108 C24 100 6 86 6 60 V16 A10 10 0 0 1 16 6 Z"
        fill="#C8102E"
      />
      <text
        x="48"
        y="53"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Archivo Black','Arial Black',system-ui,sans-serif"
        fontWeight={900}
        fontSize="31"
        letterSpacing="-2"
      >
        TDD
      </text>
      <g fill="#FFFFFF">
        <rect x="9" y="72" width="49" height="6.5" rx="3.25" transform="rotate(-20 33 75)" />
        <rect x="15" y="85" width="41" height="6.5" rx="3.25" transform="rotate(-20 35 88)" />
      </g>
    </svg>
  )
}
