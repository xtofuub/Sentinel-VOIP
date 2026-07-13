import { useState } from "react"
import { Globe2 } from "lucide-react"

const normalizeCode = (code) => (/^[a-z]{2}$/i.test(code || "") ? code.toLowerCase() : "")

export function LocaleFlag({ code, eager = false }) {
  const normalizedCode = normalizeCode(code)
  const src = normalizedCode ? `https://flagcdn.com/40x30/${normalizedCode}.png` : ""
  const [failedSrc, setFailedSrc] = useState("")

  if (!src) return <Globe2 size={16} aria-hidden="true" />

  if (failedSrc === src) {
    return <span className="locale-flag__fallback">{normalizedCode.toUpperCase()}</span>
  }

  return (
    <img
      className="locale-flag__image"
      src={src}
      srcSet={`https://flagcdn.com/80x60/${normalizedCode}.png 2x`}
      width="40"
      height="30"
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable="false"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  )
}
