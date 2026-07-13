import React, { createContext, useContext, useMemo, useState } from "react"

const AppContext = createContext(null)

const readStoredScenario = () => {
  try {
    return JSON.parse(sessionStorage.getItem("selectedScenario") || "null")
  } catch {
    return null
  }
}

export function AppProvider({ children }) {
  const [selectedScenario, setSelectedScenarioState] = useState(readStoredScenario)

  const setSelectedScenario = (scenario) => {
    setSelectedScenarioState(scenario)
    if (scenario) sessionStorage.setItem("selectedScenario", JSON.stringify(scenario))
    else sessionStorage.removeItem("selectedScenario")
  }

  const value = useMemo(() => ({ selectedScenario, setSelectedScenario }), [selectedScenario])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error("useApp must be used inside AppProvider")
  return value
}
