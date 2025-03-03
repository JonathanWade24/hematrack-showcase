'use client'

import { useEffect, useState } from 'react'

interface PreviewData {
  [key: string]: string | number | boolean | Date | null | object
}

interface PreviewTableProps {
  type: string | null
  onClose: () => void
}

export function PreviewTable({ type, onClose }: PreviewTableProps) {
  const [data, setData] = useState<PreviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type) return

    const fetchPreview = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/data-import/preview?type=${type}&limit=10`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch preview data')
        }

        setData(result.data)
      } catch (err) {
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
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const columns = Object.keys(data[0]).filter(key => 
    !key.includes('created_at') && 
    !key.includes('updated_at') &&
    !key.includes('id')
  )

  const formatValue = (value: any) => {
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
        <p className="text-sm text-gray-500">
          Showing the {data.length} most recent records
        </p>
      </div>
    </div>
  )
} 