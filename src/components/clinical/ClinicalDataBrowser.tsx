'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendar } from '@fortawesome/free-solid-svg-icons'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Button } from '../ui/button'
import { useDebounce } from '@/hooks/useDebounce'

const DATA_TYPES = [
  { id: 'medications', label: 'Medications' },
  { id: 'labs', label: 'Lab Results' },
  { id: 'ip_admissions', label: 'IP Admissions' },
  { id: 'op_visits', label: 'OP Visits' }
] as const

type DataTypeOption = typeof DATA_TYPES[number]

type LabData = {
  id: number
  patient_mrn: string
  result_time: Date
  lab_component_description: string
  bone_marrow_results_by_component: string | null
  lab_code: string | null
  lab_name: string | null
  type: 'lab'
}

type AdmissionData = {
  id: number
  patient_mrn: string
  adm_date_time: Date
  disch_date_time: Date | null
  discharge_department: string | null
  discharge_disposition: string | null
  icu_admission_yn: string | null
  admit_dx_description_1: string | null
  final_dx_description_1: string | null
  type: 'admission'
}

type VisitData = {
  id: number
  patient_mrn: string
  visit_date: Date
  visit_type: string | null
  department_name: string | null
  dx_name: string | null
  bp_systolic: number | null
  bp_diastolic: number | null
  weight_kg: number | null
  weight_lbs: number | null
  type: 'visit'
}

type IPMedicationData = {
  id: number
  patient_mrn: string
  adm_date_time: Date
  medication: string
  dosage: string | null
  unit: string | null
  frequency: string | null
  rx_class_name: string | null
  type: 'ip_medication'
}

type OPMedicationData = {
  id: number
  patient_mrn: string
  visit_date: Date
  generic_description: string | null
  rx_status: string | null
  type: 'op_medication'
}

type ClinicalData = 
  | LabData
  | AdmissionData
  | VisitData
  | IPMedicationData
  | OPMedicationData

// Type guards
const isLabData = (data: ClinicalData): data is LabData => data.type === 'lab'
const isAdmissionData = (data: ClinicalData): data is AdmissionData => data.type === 'admission'
const isVisitData = (data: ClinicalData): data is VisitData => data.type === 'visit'
const isIPMedicationData = (data: ClinicalData): data is IPMedicationData => data.type === 'ip_medication'
const isOPMedicationData = (data: ClinicalData): data is OPMedicationData => data.type === 'op_medication'

interface ClinicalDataBrowserProps {
  initialData: ClinicalData[]
  totalCount: number
  currentPage: number
  pageSize: number
  initialType: string
}

export function ClinicalDataBrowser({
  initialData,
  totalCount,
  currentPage,
  pageSize,
  initialType
}: ClinicalDataBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [type, setType] = useState(initialType)
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
  
  const debouncedSearch = useDebounce(search, 300)

  // Update URL when filters change
  const updateFilters = () => {
    const params = new URLSearchParams(searchParams)
    
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }

    // Always set type parameter to ensure consistency
    params.set('type', type)

    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }

    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }

    params.set('page', '1') // Reset to first page on filter change
    router.push(`/clinical?${params.toString()}`, { scroll: false })
  }

  // Generate pagination range
  const totalPages = Math.ceil(totalCount / pageSize)
  const generatePaginationRange = () => {
    const range = []
    const maxPages = 7
    const sidePages = 2

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i)
      }
    } else {
      if (currentPage <= sidePages + 3) {
        for (let i = 1; i <= sidePages + 3; i++) {
          range.push(i)
        }
        range.push('...')
        for (let i = totalPages - 1; i <= totalPages; i++) {
          range.push(i)
        }
      } else if (currentPage >= totalPages - (sidePages + 2)) {
        range.push(1, 2, '...')
        for (let i = totalPages - (sidePages + 2); i <= totalPages; i++) {
          range.push(i)
        }
      } else {
        range.push(1, 2, '...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          range.push(i)
        }
        range.push('...')
        for (let i = totalPages - 1; i <= totalPages; i++) {
          range.push(i)
        }
      }
    }
    return range
  }

  const getTableHeaders = () => {
    switch (type) {
      case 'labs':
        return ['Date', 'MRN', 'Test', 'Result', 'Lab Code', 'Lab Name']
      case 'ip_admissions':
        return ['Admission Date', 'Discharge Date', 'MRN', 'Department', 'Disposition', 'ICU', 'Primary Diagnosis', 'Final Diagnosis']
      case 'op_visits':
        return ['Visit Date', 'MRN', 'Visit Type', 'Department', 'Diagnosis', 'BP', 'Weight']
      case 'medications':
      default:
        return ['Date', 'MRN', 'Medication', 'Dosage', 'Unit', 'Frequency', 'Class', 'Status']
    }
  }

  const renderDataRow = (data: ClinicalData) => {
    if (isLabData(data)) {
      return (
        <tr key={data.id}>
          <td>{data.result_time ? new Date(data.result_time).toLocaleDateString() : 'N/A'}</td>
          <td>{data.patient_mrn}</td>
          <td>{data.lab_component_description || 'N/A'}</td>
          <td>{data.bone_marrow_results_by_component || 'N/A'}</td>
          <td>{data.lab_code || 'N/A'}</td>
          <td>{data.lab_name || 'N/A'}</td>
        </tr>
      )
    }

    if (isAdmissionData(data)) {
      return (
        <tr key={data.id}>
          <td>{data.adm_date_time ? new Date(data.adm_date_time).toLocaleDateString() : 'N/A'}</td>
          <td>{data.disch_date_time ? new Date(data.disch_date_time).toLocaleDateString() : 'N/A'}</td>
          <td>{data.patient_mrn}</td>
          <td>{data.discharge_department || 'N/A'}</td>
          <td>{data.discharge_disposition || 'N/A'}</td>
          <td>{data.icu_admission_yn || 'N/A'}</td>
          <td>{data.admit_dx_description_1 || 'N/A'}</td>
          <td>{data.final_dx_description_1 || 'N/A'}</td>
        </tr>
      )
    }

    if (isVisitData(data)) {
      const bp = data.bp_systolic && data.bp_diastolic 
        ? `${data.bp_systolic}/${data.bp_diastolic}`
        : 'N/A'
      const weight = data.weight_kg 
        ? `${data.weight_kg.toFixed(1)} kg (${data.weight_lbs?.toFixed(1) || 'N/A'} lbs)`
        : 'N/A'
        
      return (
        <tr key={data.id}>
          <td>{data.visit_date ? new Date(data.visit_date).toLocaleDateString() : 'N/A'}</td>
          <td>{data.patient_mrn}</td>
          <td>{data.visit_type || 'N/A'}</td>
          <td>{data.department_name || 'N/A'}</td>
          <td>{data.dx_name || 'N/A'}</td>
          <td>{bp}</td>
          <td>{weight}</td>
        </tr>
      )
    }

    if (isIPMedicationData(data)) {
      return (
        <tr key={data.id}>
          <td>{data.adm_date_time ? new Date(data.adm_date_time).toLocaleDateString() : 'N/A'}</td>
          <td>{data.patient_mrn}</td>
          <td>{data.medication || 'N/A'}</td>
          <td>{data.dosage || 'N/A'}</td>
          <td>{data.unit || 'N/A'}</td>
          <td>{data.frequency || 'N/A'}</td>
          <td>{data.rx_class_name || 'N/A'}</td>
          <td>Inpatient</td>
        </tr>
      )
    }

    if (isOPMedicationData(data)) {
      return (
        <tr key={data.id}>
          <td>{data.visit_date ? new Date(data.visit_date).toLocaleDateString() : 'N/A'}</td>
          <td>{data.patient_mrn}</td>
          <td>{data.generic_description || 'N/A'}</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>N/A</td>
          <td>{data.rx_status || 'N/A'}</td>
        </tr>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search by MRN or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Type
            </label>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                updateFilters()
              }}
            >
              {DATA_TYPES.map(dataType => (
                <option key={dataType.id} value={dataType.id}>
                  {dataType.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={faCalendar} className="mr-2" />
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                updateFilters()
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={faCalendar} className="mr-2" />
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                updateFilters()
              }}
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {getTableHeaders().map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialData.map(item => renderDataRow(item))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(currentPage - 1))
                router.push(`/clinical?${params.toString()}`)
              }}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(currentPage + 1))
                router.push(`/clinical?${params.toString()}`)
              }}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {Math.min((currentPage - 1) * pageSize + 1, totalCount)}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalCount}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {generatePaginationRange().map((page, index) => (
                  <Button
                    key={index}
                    onClick={() => {
                      if (typeof page === 'number') {
                        const params = new URLSearchParams(searchParams)
                        params.set('page', String(page))
                        router.push(`/clinical?${params.toString()}`)
                      }
                    }}
                    disabled={page === '...' || page === currentPage}
                    variant={page === currentPage ? 'primary' : 'outline'}
                    className="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                  >
                    {page}
                  </Button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 