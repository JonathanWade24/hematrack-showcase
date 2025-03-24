'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DataDownloadTool } from '@/components/data-download/DataDownloadTool'

export default function DataDownloadPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Download</h1>
            <p className="mt-2 text-sm text-gray-600">
              Download data from the SCD Dashboard database
            </p>
          </div>

          {/* Data Download Tool */}
          <DataDownloadTool />
        </div>
      </div>
    </DashboardLayout>
  )
} 