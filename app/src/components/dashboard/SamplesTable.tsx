'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faEye, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// Simplified interface for the props this specific table needs
// Ensures only serializable data is expected.
export interface SampleForDashboardTable { // Renamed for clarity
  sample_id: string;
  subject_id: string;
  date_of_collection: string | null; // Expect serialized string date
  genotype: string | null;
  processing_status: 'Complete' | 'Partial' | 'Pending'; // Expect simple status from page.tsx formatting
  qc_status: 'Passed' | 'Failed' | 'Review';
}

type SortField = 'subject_id' | 'sample_id' | 'date_of_collection' | 'genotype' | 'processing_status' | 'qc_status'

interface SamplesTableProps {
  samples: SampleForDashboardTable[] // Use the new simplified interface
}

export default function SamplesTable({ 
  samples = [], 
}: SamplesTableProps) { 
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // --- Sorting logic might need adjustment or removal --- 
  // This simple table on dashboard might not need server-side sorting via params.
  // If sorting is needed, it should likely be done client-side on the `samples` prop array.
  // For now, keep the logic but be aware it might not function as intended without page/sort params passed in.
  const currentSort = searchParams.get('sort') as SortField || 'date_of_collection'
  const currentOrder = searchParams.get('order') || 'desc'

  const handleSort = (field: SortField) => {
    // This navigation will likely reload the whole page or navigate away
    // Consider client-side sorting implementation instead if needed
    const params = new URLSearchParams(searchParams) 
    const newOrder = field === currentSort && currentOrder === 'asc' ? 'desc' : 'asc'
    params.set('sort', field)
    params.set('order', newOrder)
    // router.push(`/samples?${params.toString()}`) // Avoid navigating away from dashboard? Or adjust target URL?
    console.warn('Client-side sorting not implemented for dashboard table. Header click may not work as expected.');
  }

  const getSortIcon = (field: SortField) => {
    if (field !== currentSort) return faSort
    return currentOrder === 'asc' ? faSortUp : faSortDown
  }
  // --- End Sorting Logic Section ---

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not available'
    try {
      // Input should already be YYYY-MM-DD or parsable string
      return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch {
      return 'Invalid date'
    }
  }

  // Use the samples prop directly
  const sampleData = Array.isArray(samples) ? samples : [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Use fields from SampleForDashboardTable */}
            {[
              { field: 'subject_id', label: 'Subject ID' },
              { field: 'sample_id', label: 'Sample ID' },
              { field: 'date_of_collection', label: 'Collection Date' },
              { field: 'genotype', label: 'Genotype' },
              { field: 'processing_status', label: 'Processing Status' },
              { field: 'qc_status', label: 'QC Status' },
              { field: 'actions', label: 'Actions' }
            ].map(({ field, label }) => (
              <th
                key={field}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => field !== 'actions' && handleSort(field as SortField)}
              >
                <div className="flex items-center space-x-1">
                  <span>{label}</span>
                  {field !== 'actions' && (
                    <FontAwesomeIcon 
                      icon={getSortIcon(field as SortField)} 
                      className="h-4 w-4"
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Map over sampleData which uses SampleForDashboardTable type */}
          {sampleData.length > 0 ? (
            sampleData.map((sample) => (
              // Use sample_id which is guaranteed by the new type
              <tr key={sample.sample_id} className="hover:bg-gray-50">
                {/* Access fields defined in SampleForDashboardTable */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sample.subject_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sample.sample_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(sample.date_of_collection)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sample.genotype || 'Not available'}
                </td>
                 {/* ... Processing Status span ... */}
                 <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${sample.processing_status === 'Complete' ? 'bg-green-100 text-green-800' :
                      sample.processing_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {sample.processing_status}
                  </span>
                </td>
                 {/* ... QC Status span ... */}
                 <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${sample.qc_status === 'Passed' ? 'bg-green-100 text-green-800' :
                      sample.qc_status === 'Failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {sample.qc_status}
                  </span>
                </td>
                {/* ... Actions links ... */}
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-4">
                    <Link
                      href={`/data-entry/edit/${sample.sample_id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      aria-label={`Edit sample ${sample.sample_id}`}
                    >
                      <FontAwesomeIcon icon={faEdit} className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/samples/${sample.sample_id}`}
                      className="text-gray-600 hover:text-gray-900"
                      aria-label={`View sample ${sample.sample_id}`}
                    >
                      <FontAwesomeIcon icon={faEye} className="h-5 w-5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            // ... No samples found row ...
             <tr>
              <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                No samples found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 