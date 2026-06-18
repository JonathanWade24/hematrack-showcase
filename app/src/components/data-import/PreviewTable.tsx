'use client'

import { useEffect, useState } from 'react'

interface PreviewData {
  [key: string]: string | number | boolean | Date | null | object
}

interface DebugInfo {
  type: string
  recordCount: number
  timestamp: string
  [key: string]: any
}

interface PreviewTableProps {
  type: string | null
  onClose: () => void
}

export function PreviewTable({ type, onClose }: PreviewTableProps) {
  const [data, setData] = useState<PreviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    if (!type) return

    const fetchPreview = async () => {
      try {
        setLoading(true)
        console.log(`Fetching preview for data type: ${type}`)
        const response = await fetch(`/api/data-import/preview?type=${type}&limit=10`)
        console.log(`Preview API response status: ${response.status}`)
        const result = await response.json()
        
        if (!response.ok) {
          console.error('Preview API error:', result)
          throw new Error(result.error || 'Failed to fetch preview data')
        }

        console.log(`Preview data received:`, result)
        setData(result.data || [])
        
        // Store debug info if available
        if (result.debug) {
          setDebugInfo(result.debug)
        }
        
        // Store error details if available
        if (result.errorDetails) {
          setErrorDetails(result.errorDetails)
        }
      } catch (err) {
        console.error('Error fetching preview data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch preview data')
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [type])

  if (!type) return null

  if (loading) {
    return (
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Preview of Imported {type.charAt(0).toUpperCase() + type.slice(1)} Data</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-red-600">Error Loading Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>
        <p className="text-red-600">{error}</p>
        {errorDetails && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
            <p className="text-gray-700">Error Details:</p>
            <p className="text-red-500">{errorDetails}</p>
          </div>
        )}
        {debugInfo && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium">Debug Information:</h4>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Preview of Imported {type.charAt(0).toUpperCase() + type.slice(1)} Data</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ×
          </button>
        </div>
        <p className="text-gray-500">No data available for preview</p>
        {debugInfo && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium">Debug Information:</h4>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const columns = Object.keys(data[0]).filter(key => 
    !key.includes('created_at') && 
    !key.includes('updated_at') &&
    !key.includes('id')
  )

  const formatValue = (value: string | number | boolean | Date | null | undefined | object) => {
    if (value === null || value === undefined) return '-'
    if (value instanceof Date) return new Date(value).toLocaleDateString()
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Preview of Imported {type.charAt(0).toUpperCase() + type.slice(1)} Data</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          ×
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.split('_').join(' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(column => (
                  <td
                    key={column}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {formatValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Showing the {data.length} most recent records
          </p>
          {debugInfo && (
            <button 
              onClick={() => console.log('Debug info:', debugInfo)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Debug Info
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 