import { useEffect, useState } from "react"
import { normalizeCatalog } from "@/lib/catalog"

let catalogPromise

const loadCatalog = () => {
  if (!catalogPromise) {
    catalogPromise = import("@/services/mock_data").then((module) => normalizeCatalog(module.MOCK_PRANKS_BY_LANGUAGE))
  }
  return catalogPromise
}

export function useCatalog() {
  const [state, setState] = useState({ loading: true, error: null, locales: [], scenarios: [] })

  useEffect(() => {
    let active = true
    loadCatalog()
      .then((catalog) => { if (active) setState({ loading: false, error: null, ...catalog }) })
      .catch((error) => { if (active) setState({ loading: false, error, locales: [], scenarios: [] }) })
    return () => { active = false }
  }, [])

  return state
}
