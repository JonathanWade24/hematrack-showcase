'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { searchSamplesAction, type SearchState, type SampleSearchResult } from '@/app/data-entry/actions'
import { useFormStatus } from 'react-dom'

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

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Searching...' : 'Search'}
    </button>
  );
}

export function SampleSearch({ recentSamples = [] }: SampleSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const initialState: SearchState = { results: [], message: null, error: false };
  const [searchState, dispatchSearchForm] = useActionState(searchSamplesAction, initialState);
  const [showRecent, setShowRecent] = useState(true);

  const handleFormSubmit = (formData: FormData) => {
    setShowRecent(false);
    dispatchSearchForm(formData);
  };

  const displayList = showRecent ? recentSamples : searchState?.results;
  const listTitle = showRecent ? "Recent Samples" : "Search Results";
  const listIsEmpty = !displayList || displayList.length === 0;
  const emptyListMessage = showRecent 
    ? "No recent samples found." 
    : searchState?.message || "No matching samples found.";

  return (
    <div className="space-y-6">
      <form action={handleFormSubmit} className="flex gap-4">
        <input
          type="text"
          name="searchQuery"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Sample ID or Subject ID (min 2 chars)"
          className="flex-1 rounded-md border border-gray-300 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <SearchButton />
      </form>

      {!showRecent && searchState?.message && (
         <p className={`text-sm ${searchState.error ? 'text-red-600' : 'text-gray-600'}`}>
           {searchState.message}
         </p>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">{listTitle}</h3>
           {!showRecent && (
             <button 
                onClick={() => setShowRecent(true)} 
                className="text-sm text-indigo-600 hover:underline mt-1"
              >Show Recent Samples</button>
           )}
        </div>
        {listIsEmpty ? (
           <p className="px-6 py-4 text-sm text-gray-500">{emptyListMessage}</p>
         ) : (
          <div className="divide-y divide-gray-200">
            {displayList.map((item) => {
                // Determine the type of item and extract common fields
                const sample_id = item.sample_id;
                const subject_id = item.subject_id;
                const date_of_collection = item.date_of_collection;
                let processing_status: string | null = null;
                
                // Check if it's the 'Sample' type (from recent) which has processing_status
                // and also check the type of the property
                if ('processing_status' in item && (typeof item.processing_status === 'string' || item.processing_status === null)) {
                    processing_status = item.processing_status;
                }
            
                return (
                  <Link
                    key={sample_id}
                    href={`/data-entry/edit/${sample_id}`} 
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-indigo-600">
                            {sample_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            Subject: {subject_id}
                          </div>
                          {/* Display date differently based on source type */}
                          {date_of_collection && (
                            <div className="text-sm text-gray-500">
                              Date: {new Date(date_of_collection + 'T00:00:00').toLocaleDateString()} {/* Add time part for correct local date */} 
                            </div>
                          )}
                        </div>
                        {/* Show status only if it exists and is not null */} 
                        {processing_status && ( 
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              processing_status === 'Complete' ? 'bg-green-100 text-green-800' :
                              processing_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800' // Assuming 'Pending' maps here
                            }`}>
                              {processing_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
            })}
          </div>
        )}
      </div>
    </div>
  )
} 