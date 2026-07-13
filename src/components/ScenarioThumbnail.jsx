import React, { useState } from "react"

const thumbnailDimensions = { small: 48, medium: 68, large: 96 }

export const ScenarioThumbnail = React.memo(function ScenarioThumbnail({
  src,
  title,
  size = "medium",
  className = "",
  eager = false,
}) {
  const [failedSrc, setFailedSrc] = useState("")
  const normalizedSrc = src?.replace(/^http:/, "https:")
  const failed = failedSrc === normalizedSrc
  const dimension = thumbnailDimensions[size] || thumbnailDimensions.medium

  const initial = title?.trim()?.charAt(0)?.toUpperCase() || "S"
  const classes = `scenario-thumbnail scenario-thumbnail--${size}${className ? ` ${className}` : ""}`

  return (
    <span className={classes} aria-hidden="true">
      <span className="scenario-thumbnail__fallback">{initial}</span>
      {normalizedSrc && !failed && (
        <img
          src={normalizedSrc}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          width={dimension}
          height={dimension}
          onError={() => setFailedSrc(normalizedSrc)}
        />
      )}
    </span>
  )
})
