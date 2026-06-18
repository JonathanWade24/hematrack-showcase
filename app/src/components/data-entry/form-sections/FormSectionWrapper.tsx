'use client'

import React from 'react'

interface FormSectionWrapperProps {
  children: React.ReactNode
}

export function FormSectionWrapper({ children }: FormSectionWrapperProps) {
  return (
    <div className="form-section space-y-8 pb-4">
      {children}
    </div>
  )
} 