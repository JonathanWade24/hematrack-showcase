'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DataDownload } from '@/components/data/DataDownload'
import type { FilterCriteria } from '@/components/data/DataDownload'

export default function DataDownloadPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async (filters: FilterCriteria) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/data-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'omics-data-export.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return { success: true }
    } catch (error) {
      console.error('Error downloading data:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = async (filters: FilterCriteria) => {
    try {
      const response = await fetch('/api/data-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch preview data')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching preview:', error)
      throw error
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Download</h1>
            <p className="mt-2 text-sm text-gray-600">
              Download patient data with customizable filters and data types
            </p>
          </div>

          {/* Data Download Form */}
          <DataDownload 
            onSubmit={handleDownload} 
            onPreview={handlePreview}
          />
          
          {/* Loading State */}
          {isLoading && (
            <div className="mt-4 text-center">
              <p className="text-gray-600">Preparing your download...</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 