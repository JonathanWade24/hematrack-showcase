import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { convertToNumber } from '@/lib/utils'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHospital, faUserDoctor } from '@fortawesome/free-solid-svg-icons'
import { createClinicalClient, createPhiClient } from '@/lib/supabase/server'

const DEFAULT_PAGE_SIZE = 20

// Update PageProps for Next.js 15
type SearchParamsType = {
  page?: string
  pageSize?: string
  type?: string
};

type PageProps = {
  searchParams: Promise<SearchParamsType> | undefined;
};

interface Patient {
  first_name: string;
  last_name: string;
  patient_mrn: string;
}

interface Visit {
  id: number;
  patient_mrn: string;
  visit_type: string;
  department?: string;
  start_date: string;
  end_date?: string;
  patient: Patient;
}

async function getVisits(page = 1, pageSize = DEFAULT_PAGE_SIZE, type?: string) {
  const clinicalClient = await createClinicalClient()
  const phiClient = await createPhiClient()
  
  // Build the query for visits
  let query = clinicalClient
    .from('unified_visits')
    .select('*', { count: 'exact' })
    .order('start_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  
  // Add type filter if specified
  if (type) {
    query = query.eq('visit_type', type)
  }
  
  // Execute the query
  const { data: visitsData, count, error } = await query
  
  if (error) {
    console.error('Error fetching visits:', error)
    return {
      visits: [],
      totalCount: 0,
      totalPages: 0
    }
  }

  // Get unique patient MRNs
  const patientMrns = [...new Set(visitsData?.map(visit => visit.patient_mrn) || [])]
  
  // Fetch patient data for these MRNs
  const { data: patientsData, error: patientsError } = await phiClient
    .from('patients')
    .select('first_name, last_name, patient_mrn')
    .in('patient_mrn', patientMrns)
  
  if (patientsError) {
    console.error('Error fetching patients:', patientsError)
    return {
      visits: [],
      totalCount: 0,
      totalPages: 0
    }
  }
  
  // Create a map of patient data by MRN
  const patientMap: Record<string, Patient> = (patientsData || []).reduce((acc: Record<string, Patient>, patient: Patient) => {
    acc[patient.patient_mrn] = patient
    return acc
  }, {})
  
  // Combine visit data with patient data
  const visits = (visitsData || []).map((visit: unknown) => {
    const typedVisit = visit as Record<string, unknown>;
    return {
      ...typedVisit,
      patient: patientMap[typedVisit.patient_mrn as string] || { 
        first_name: 'Unknown', 
        last_name: 'Patient',
        patient_mrn: typedVisit.patient_mrn
      }
    } as Visit
  })
  
  return {
    visits: convertToNumber(visits),
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize)
  }
}

export default async function VisitsPage({ searchParams }: PageProps) {
  // Handle searchParams correctly, checking for undefined
  if (!searchParams) {
    throw new Error('Missing search parameters');
  }
  
  // Resolve searchParams if it's a Promise
  const params = await searchParams;
  const currentPage = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE
  const type = params.type

  const { visits, totalPages } = await getVisits(currentPage, pageSize, type)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visit History</h1>
            <p className="mt-2 text-sm text-gray-600">
              View all patient visits and their details
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Link
              href="/visits"
              className={`px-4 py-2 rounded-lg ${
                !type ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Visits
            </Link>
            <Link
              href="/visits?type=IP"
              className={`px-4 py-2 rounded-lg ${
                type === 'IP' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Inpatient Stays
            </Link>
            <Link
              href="/visits?type=OP"
              className={`px-4 py-2 rounded-lg ${
                type === 'OP' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Outpatient Visits
            </Link>
          </div>

          {/* Visits Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Type
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FontAwesomeIcon
                            icon={visit.visit_type === 'IP' ? faHospital : faUserDoctor}
                            className={visit.visit_type === 'IP' ? 'text-red-500 mr-2' : 'text-blue-500 mr-2'}
                          />
                          <span className="text-sm text-gray-900">
                            {visit.visit_type === 'IP' ? 'Inpatient Stay' : 'Outpatient Visit'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/visits/${visit.patient.patient_mrn}`}
                          className="text-sm text-indigo-600 hover:text-indigo-900"
                        >
                          {visit.patient.first_name} {visit.patient.last_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {visit.department || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(visit.start_date).toLocaleDateString()}
                        {visit.end_date && ` - ${new Date(visit.end_date).toLocaleDateString()}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link
                          href={`/visits/${visit.patient.patient_mrn}?selected=${visit.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-2 px-4">
              <Link
                href={`/visits?page=${Math.max(1, currentPage - 1)}${type ? `&type=${type}` : ''}`}
                className={`px-3 py-2 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </Link>
              
              <div className="flex flex-wrap justify-center gap-2">
                {/* First page */}
                <Link
                  href={`/visits?page=1${type ? `&type=${type}` : ''}`}
                  className={`px-3 py-2 rounded-md ${
                    currentPage === 1
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  1
                </Link>

                {/* Left ellipsis */}
                {currentPage > 4 && (
                  <span className="px-3 py-2">...</span>
                )}

                {/* Pages around current page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (page === 1 || page === totalPages) return false
                    return Math.abs(currentPage - page) <= 2
                  })
                  .map(page => (
                    <Link
                      key={page}
                      href={`/visits?page=${page}${type ? `&type=${type}` : ''}`}
                      className={`px-3 py-2 rounded-md ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </Link>
                  ))}

                {/* Right ellipsis */}
                {currentPage < totalPages - 3 && (
                  <span className="px-3 py-2">...</span>
                )}

                {/* Last page */}
                {totalPages > 1 && (
                  <Link
                    href={`/visits?page=${totalPages}${type ? `&type=${type}` : ''}`}
                    className={`px-3 py-2 rounded-md ${
                      currentPage === totalPages
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {totalPages}
                  </Link>
                )}
              </div>

              <Link
                href={`/visits?page=${Math.min(totalPages, currentPage + 1)}${type ? `&type=${type}` : ''}`}
                className={`px-3 py-2 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 