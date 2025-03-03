'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faSort, faSortUp, faSortDown, faCalendar } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OmicsResult } from '@/lib/types'
import { useState } from 'react'
import { PHIMask } from '@/components/ui/phi-mask'

interface Patient {
  patient_mrn: string
  first_name: string | null
  last_name: string | null
  birth_date: Date | null
  sex: string | null
  race: string | null
  ethnicity: string | null
  registrations: {
    subject_id: string
    registration_date: Date
    consent_date: Date
  }[] | null
  omics_subjects: {
    subject_id: string
    project: string
    omics_results: OmicsResult[]
  }[]
}

interface PatientsTableProps {
  patients: Patient[]
}

type SortField = 'first_name' | 'last_name' | 'birth_date'

export function PatientsTable({ patients }: PatientsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showOnlyOmics, setShowOnlyOmics] = useState(false)
  
  const currentSort = searchParams.get('sort') as SortField || 'last_name'
  const currentOrder = searchParams.get('order') || 'desc'

  const handleSort = (field: SortField) => {
    const params = new URLSearchParams(searchParams)
    const newOrder = field === currentSort && currentOrder === 'asc' ? 'desc' : 'asc'
    params.set('sort', field)
    params.set('order', newOrder)
    router.push(`/patients?${params.toString()}`)
  }

  const getSortIcon = (field: SortField) => {
    if (field !== currentSort) return faSort
    return currentOrder === 'asc' ? faSortUp : faSortDown
  }

  const getSubjectIds = (patient: Patient) => {
    const subjectIds = new Set<string>()
    
    // Add subject IDs from registrations
    if (patient.registrations) {
      patient.registrations.forEach(reg => {
        subjectIds.add(reg.subject_id)
      })
    }
    
    // Add subject IDs from omics_subjects
    patient.omics_subjects.forEach(subject => {
      subjectIds.add(subject.subject_id)
    })
    
    return Array.from(subjectIds)
  }

  const getSampleCount = (patient: Patient) => {
    return patient.omics_subjects.reduce((total, subject) => {
      return total + subject.omics_results.length
    }, 0)
  }

  // Filter patients if showOnlyOmics is true
  const filteredPatients = showOnlyOmics 
    ? patients.filter(patient => getSampleCount(patient) > 0)
    : patients

  return (
    <div>
      {/* Filter Toggle */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showOnlyOmics}
            onChange={(e) => setShowOnlyOmics(e.target.checked)}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-900">Show only patients with OMICs samples</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('last_name')}
              >
                Name
                <FontAwesomeIcon icon={getSortIcon('last_name')} className="ml-1" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('birth_date')}
              >
                Birth Date
                <FontAwesomeIcon icon={getSortIcon('birth_date')} className="ml-1" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject ID(s)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sample Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <tr key={patient.patient_mrn}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <PHIMask
                    type="name"
                    value={`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <PHIMask
                    type="birth_date"
                    value={patient.birth_date ? 
                      (patient.birth_date instanceof Date ? 
                        patient.birth_date : 
                        new Date(String(patient.birth_date))
                      ) : null}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getSubjectIds(patient).map((id, index) => (
                    <span key={id} className="mr-1">
                      <PHIMask type="id" value={id} maskWith="SCD-" />
                      {index < getSubjectIds(patient).length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getSampleCount(patient)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-4">
                  {getSubjectIds(patient).map(subjectId => (
                    <Link
                      key={subjectId}
                      href={`/subjects/${subjectId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      View Omics
                    </Link>
                  ))}
                  <Link
                    href={`/visits/${patient.patient_mrn}`}
                    className="text-green-600 hover:text-green-800"
                  >
                    <FontAwesomeIcon icon={faCalendar} className="mr-1" />
                    View Visits
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 