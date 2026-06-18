'use client'

import { ProcessedSample } from '@/types/samples'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faEye, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface SamplesTableProps {
  samples: ProcessedSample[]
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  sort: string
  order: 'asc' | 'desc'
  search?: string
}

export default function SamplesTable({
  samples,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  sort,
  order,
  search,
}: SamplesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams)
    const newOrder = field === sort && order === 'asc' ? 'desc' : 'asc'
    params.set('sort', field)
    params.set('order', newOrder)
    router.push(`/samples?${params.toString()}`)
  }

  const getSortIcon = (field: string) => {
    if (field !== sort) return faSort
    return order === 'asc' ? faSortUp : faSortDown
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not available'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  // Generate a unique key for each row
  const getRowKey = (sample: ProcessedSample, index: number) => {
    const id = sample.id || 'unknown'
    const date = sample.dateOfCollection || 'unknown'
    return `row-${id}-${date}-${index}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              { field: 'id', label: 'ID' },
              { field: 'dateOfCollection', label: 'Collection Date' },
              { field: 'patientId', label: 'Patient ID' },
              { field: 'status', label: 'Status' },
              { field: 'actions', label: 'Actions' }
            ].map(({ field, label }) => (
              <th
                key={field}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => field !== 'actions' && handleSort(field)}
              >
                <div className="flex items-center space-x-1">
                  <span>{label}</span>
                  {field !== 'actions' && (
                    <FontAwesomeIcon 
                      icon={getSortIcon(field)} 
                      className="h-4 w-4"
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {samples.length > 0 ? (
            samples.map((sample, index) => (
              <tr key={getRowKey(sample, index)} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sample.id || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(sample.dateOfCollection)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sample.patientId || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${sample.status === 'processed' ? 'bg-green-100 text-green-800' :
                      sample.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {sample.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-4">
                    <Link
                      href={`/samples/${sample.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      aria-label={`View sample ${sample.id}`}
                    >
                      <FontAwesomeIcon icon={faEye} className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/data-entry/edit/${sample.id}`}
                      className="text-gray-600 hover:text-gray-900"
                      aria-label={`Edit sample ${sample.id}`}
                    >
                      <FontAwesomeIcon icon={faEdit} className="h-5 w-5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                No samples found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
} 