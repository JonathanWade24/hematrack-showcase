import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type for objects with toJSON method
interface WithToJSON {
  toJSON: () => unknown;
  toString: () => string;
}

// Helper function to safely convert to Date
function safelyConvertToDate(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (value instanceof Date) {
    return value;
  }
  
  try {
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function convertToNumber<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  // Handle objects with toJSON method (like Decimal from Prisma)
  if (typeof value === 'object' && value !== null && 
      'toJSON' in value && typeof (value as WithToJSON).toJSON === 'function') {
    try {
      // Try to convert to number first
      const numValue = Number((value as WithToJSON).toString())
      if (!isNaN(numValue)) {
        return numValue as unknown as T
      }
      // If that fails, use the toJSON method
      return (value as WithToJSON).toJSON() as T
    } catch {
      // If all else fails, return the original value
      return value
    }
  }

  if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value) as unknown as T
  }

  if (value instanceof Date) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(convertToNumber) as unknown as T
  }

  if (typeof value === 'object' && value !== null) {
    const converted: { [key: string]: unknown } = {}
    for (const key in value as object) {
      const val = (value as { [key: string]: unknown })[key]
      
      // Special handling for date fields
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('_at')) {
        converted[key] = safelyConvertToDate(val);
      } else {
        converted[key] = convertToNumber(val)
      }
    }
    return converted as unknown as T
  }

  return value
} 