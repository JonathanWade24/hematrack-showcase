'use client'

import { usePHI } from '@/contexts/PHIContext'
import { ReactNode } from 'react'

type PHIType = 
  | 'name'           // Full names
  | 'birth_date'     // Birth dates (masked)
  | 'mrn'            // Medical Record Numbers
  | 'id'             // Other IDs (subject, sample, etc.)
  | 'race'           // Race information
  | 'ethnicity'      // Ethnicity information
  | 'location'       // Department, facility
  | 'diagnosis'      // Diagnosis codes and descriptions
  | 'collection_date' // Collection dates (not masked)
  | 'sex'            // Sex (not masked)
  | 'age'            // Age at collection (not masked)
  | 'lab_value'      // Laboratory values (not masked)

interface BasePhiMaskProps {
  maskWith?: string
  showPartial?: boolean // Whether to show partial information
}

// Original props with type and value
interface PhiMaskValueProps extends BasePhiMaskProps {
  type: PHIType
  value: string | number | Date | null | undefined
  children?: never
}

// New props with children
interface PhiMaskChildrenProps extends BasePhiMaskProps {
  type?: never
  value?: never
  children: ReactNode
}

// Union type to handle both ways of using the component
type PHIMaskProps = PhiMaskValueProps | PhiMaskChildrenProps

export function PHIMask(props: PHIMaskProps) {
  const { showPHI } = usePHI()
  const maskWith = props.maskWith || '••••'
  const showPartial = props.showPartial !== undefined ? props.showPartial : true

  // If children are provided, use those
  if ('children' in props && props.children) {
    return showPHI ? <>{props.children}</> : <span className="phi-masked">{maskWith}</span>
  }

  // Extract type and value for the original usage
  if (!('type' in props) || !('value' in props)) {
    return null
  }

  const { type, value } = props

  if (!value) return null

  // Always show these types regardless of PHI settings
  if (type === 'collection_date' || type === 'sex' || type === 'age' || type === 'lab_value') {
    if (value instanceof Date) {
      return <span>{value.toLocaleDateString()}</span>
    }
    return <span>{value}</span>
  }

  if (showPHI) {
    if (value instanceof Date) {
      return <span>{value.toLocaleDateString()}</span>
    }
    return <span>{value}</span>
  }

  const stringValue = String(value)

  switch (type) {
    case 'name':
      // Show only initials if showPartial, otherwise mask completely
      return (
        <span className="phi-masked">
          {showPartial
            ? stringValue
                .split(' ')
                .map(part => part[0])
                .join('.')
            : maskWith}
        </span>
      )

    case 'birth_date':
      try {
        // Convert value to Date if it isn't already
        const date = value instanceof Date ? value : new Date(String(value))
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return <span className="phi-masked">{maskWith}</span>
        }
        return (
          <span className="phi-masked">
            {showPartial
              ? date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
              : maskWith}
          </span>
        )
      } catch {
        return <span className="phi-masked">{maskWith}</span>
      }

    case 'mrn':
      // Always show only last 4 digits
      return (
        <span className="phi-masked">
          {maskWith + stringValue.slice(-4)}
        </span>
      )

    case 'id':
      // Show partial ID if showPartial
      return (
        <span className="phi-masked">
          {showPartial
            ? stringValue.slice(0, 3) + maskWith + stringValue.slice(-2)
            : maskWith}
        </span>
      )

    case 'race':
    case 'ethnicity':
      // Show first letter if showPartial
      return (
        <span className="phi-masked">
          {showPartial ? stringValue[0] + maskWith : maskWith}
        </span>
      )

    case 'location':
      // Show department type only if showPartial
      return (
        <span className="phi-masked">
          {showPartial
            ? stringValue.includes('clinic')
              ? 'Clinic'
              : stringValue.includes('ward')
              ? 'Ward'
              : 'Dept'
            : maskWith}
        </span>
      )

    case 'diagnosis':
      // Show only the code if showPartial, mask description
      const isDxCode = /^[A-Z][0-9]/.test(stringValue)
      return (
        <span className="phi-masked">
          {showPartial && isDxCode ? stringValue : maskWith}
        </span>
      )

    default:
      return <span className="phi-masked">{maskWith}</span>
  }
} 