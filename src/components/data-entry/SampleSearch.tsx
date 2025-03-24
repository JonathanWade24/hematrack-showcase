'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Sample {
  sample_id: string
  subject_id: string
  date_of_collection: string | null
  genotype: string | null
  processing_status: 'Complete' | 'Partial' | 'Pending'
  qc_status: 'Passed' | 'Failed' | 'Review'
}

interface SampleSearchProps {
  recentSamples?: Sample[]
}

export function SampleSearch({ recentSamples = [] }: SampleSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    // Redirect to the sample edit page if it's a sample ID
    if (searchQuery.includes('-')) {
      router.push(`/data-entry/individual/${searchQuery}`)
    } else {
      // If it's a subject ID, we'll show all samples for that subject
      router.push(`/data-entry/subject/${searchQuery}`)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter Sample ID (e.g., OMI-001-1) or Subject ID (e.g., OMI-001)"
          className="flex-1 rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Search
        </button>
      </form>

      {recentSamples.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Recent Samples</h3>
            <p className="mt-1 text-sm text-gray-600">
              Click on a sample to continue data entry
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {recentSamples.map((sample) => (
              <Link
                key={sample.sample_id}
                href={`/data-entry/individual/${sample.sample_id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-indigo-600">
                        {sample.sample_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Subject: {sample.subject_id}
                      </div>
                      {sample.date_of_collection && (
                        <div className="text-sm text-gray-500">
                          Date: {new Date(sample.date_of_collection).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sample.processing_status === 'Complete' ? 'bg-green-100 text-green-800' :
                        sample.processing_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sample.processing_status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 