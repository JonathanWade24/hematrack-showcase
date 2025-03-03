'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ViewModeContextType {
  isRestrictedView: boolean
  toggleViewMode: () => void
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined)

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [isRestrictedView, setIsRestrictedView] = useState(false)

  const toggleViewMode = () => {
    setIsRestrictedView(prev => !prev)
  }

  return (
    <ViewModeContext.Provider value={{ isRestrictedView, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider')
  }
  return context
} 