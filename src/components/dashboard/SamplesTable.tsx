'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faEye, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export interface Sample {
  sample_id: string
  subject_id: string
  date_of_collection: string | null // Date comes as string from API
  genotype: string | null
  processing_status: 'Complete' | 'Partial' | 'Pending'
  qc_status: 'Passed' | 'Failed' | 'Review'
}

interface SamplesTableProps {
  samples: Sample[]
}

type SortField = 'subject_id' | 'sample_id' | 'date_of_collection' | 'genotype' | 'processing_status' | 'qc_status'

export function SamplesTable({ samples }: SamplesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentSort = searchParams.get('sort') as SortField || 'date_of_collection'
  const currentOrder = searchParams.get('order') || 'desc'

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams)
    const newOrder = field === currentSort && currentOrder === 'asc' ? 'desc' : 'asc'
    params.set('sort', field)
    params.set('order', newOrder)
    router.push(`/samples?${params.toString()}`)
  }

  const getSortIcon = (field: SortField) => {
    if (field !== currentSort) return faSort
    return currentOrder === 'asc' ? faSortUp : faSortDown
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not available'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
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
          {samples.map((sample) => (
            <tr key={sample.sample_id} className="hover:bg-gray-50">
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
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${sample.processing_status === 'Complete' ? 'bg-green-100 text-green-800' :
                    sample.processing_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'}`}>
                  {sample.processing_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${sample.qc_status === 'Passed' ? 'bg-green-100 text-green-800' :
                    sample.qc_status === 'Failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'}`}>
                  {sample.qc_status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-4">
                  <Link
                    href={`/data-entry/individual/${sample.sample_id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <FontAwesomeIcon icon={faEdit} className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/samples/${sample.sample_id}`}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <FontAwesomeIcon icon={faEye} className="h-5 w-5" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 