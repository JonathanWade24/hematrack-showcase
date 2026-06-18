'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface PHIContextType {
  showPHI: boolean
  togglePHI: () => void
}

const PHIContext = createContext<PHIContextType | undefined>(undefined)

export function PHIProvider({ children }: { children: ReactNode }) {
  const [showPHI, setShowPHI] = useState(true)

  const togglePHI = () => {
    setShowPHI(prev => !prev)
  }

  return (
    <PHIContext.Provider value={{ showPHI, togglePHI }}>
      {children}
    </PHIContext.Provider>
  )
}

export function usePHI() {
  const context = useContext(PHIContext)
  if (context === undefined) {
    throw new Error('usePHI must be used within a PHIProvider')
  }
  return context
} 