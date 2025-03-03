'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SampleSearch() {
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
  )
} 