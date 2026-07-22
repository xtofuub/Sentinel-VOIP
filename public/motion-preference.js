(() => {
  let systemPrefersReduced = true

  try {
    systemPrefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    // Reduced motion is the safest fallback when preference detection fails.
  }

  try {
    const storedMode = window.localStorage.getItem("sentinel-motion")
    document.documentElement.dataset.motion =
      storedMode === "full" || storedMode === "reduced"
        ? storedMode
        : systemPrefersReduced
          ? "reduced"
          : "full"
  } catch {
    document.documentElement.dataset.motion = systemPrefersReduced ? "reduced" : "full"
  }
})()
