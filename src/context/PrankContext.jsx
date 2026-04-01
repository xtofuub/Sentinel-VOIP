import React, { createContext, useContext, useState } from "react"

// Create the context
export const PrankContext = createContext(undefined)

// Provider component
export const PrankProvider = ({ children }) => {
  const [selectedPrank, setSelectedPrank] = useState(null)
  const [credits, setCredits] = useState(24)

  const value = {
    selectedPrank,
    setSelectedPrank,
    credits,
    setCredits
  }

  return (
    <PrankContext.Provider value={value}>
      {children}
    </PrankContext.Provider>
  )
}

// Custom hook for convenience
export const usePrank = () => {
  const context = useContext(PrankContext)
  if (!context) {
    throw new Error("usePrank must be used within a PrankProvider")
  }
  return context
}
