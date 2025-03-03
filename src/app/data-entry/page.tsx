import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faFileUpload } from '@fortawesome/free-solid-svg-icons'

export default function DataEntryPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Entry</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter new sample data or upload data in bulk
            </p>
          </div>

          {/* Entry Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Individual Entry */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900">Individual Sample Entry</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter data for a single sample. You can save partially completed entries
                and return to add more data later.
              </p>
              <div className="mt-6 space-y-4">
                <Link
                  href="/data-entry/individual"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  New Sample
                </Link>
                <Link
                  href="/data-entry/continue"
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Update Existing Entry
                </Link>
              </div>
            </div>

            {/* Bulk Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Data Upload</h2>
              <p className="mt-2 text-sm text-gray-600">
                Upload multiple samples at once using our template format.
                Download the template below.
              </p>
              <div className="mt-6 space-y-4">
                <Link
                  href="/data-entry/bulk-upload"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FontAwesomeIcon icon={faFileUpload} className="mr-2" />
                  Upload Data
                </Link>
                <button
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Recent Entries */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Recent Entries</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Your recently entered or modified samples will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 