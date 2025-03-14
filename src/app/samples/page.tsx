import { DashboardLayout } from '@/components/layout/DashboardLayout'
import SamplesTable from '@/components/dashboard/SamplesTable'
import { convertToNumber } from '@/lib/utils'
import Link from 'next/link'
import { PageSizeSelector } from '@/components/samples/PageSizeSelector'
import { SamplesSearchBar } from '@/components/samples/SamplesSearchBar'
import { getSupabaseServerClient } from '@/lib/supabase/db'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

interface OmicsResultWithSubject {
  sample_id: string
  subject_id: string
  date_of_collection: Date | null
  genotype: string | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  plt_advia: number | null
  wbc_advia: number | null
  concentration_1_dna: number | null
  cell_number_1_pbmc: number | null
  vol_plasma_1: number | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_pass_dna: string | null
  omics_subjects: {
    subject_id: string
    patient_mrn: string
    project: string
  }
}

async function getSamplesData(
  page = 1, 
  pageSize = DEFAULT_PAGE_SIZE,
  search?: string,
  sort = 'date_of_collection',
  order: 'asc' | 'desc' = 'desc'
) {
  const skip = (page - 1) * pageSize
  const supabase = await getSupabaseServerClient()
  
  try {
    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*', { count: 'exact', head: true })
      
    if (countError) {
      console.error('Error counting samples:', countError)
      throw countError
    }
    
    // Build the query for samples
    let query = supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*')
      
    // Add search filter if provided
    if (search) {
      query = query.or(`sample_id.ilike.%${search}%,subject_id.ilike.%${search}%,genotype.ilike.%${search}%`)
    }
    
    // Add pagination and ordering
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(skip, skip + pageSize - 1)
    
    // Execute the query
    const { data: samples, error } = await query
    
    if (error) {
      console.error('Error fetching samples:', error)
      throw error
    }
    
    // Get subject information for all samples
    const subjectIds = [...new Set(samples.map(sample => sample.subject_id))]
    
    const { data: subjects, error: subjectsError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*')
      .in('subject_id', subjectIds)
    
    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError)
    }
    
    // Create a map of subjects by ID for quick lookup
    const subjectMap = (subjects || []).reduce((map, subject) => {
      map[subject.subject_id] = subject
      return map
    }, {})
    
    // Combine sample data with subject data
    const samplesWithSubjects = samples.map(sample => ({
      ...sample,
      omics_subjects: subjectMap[sample.subject_id] || null
    }))

    // Process samples to include processing and QC status
    const processedSamples = samplesWithSubjects.map((sample: OmicsResultWithSubject) => {
      // Helper function to check if a value is non-zero
      const isNonZero = (value: number | null) => {
        if (value === null || value === undefined) return false
        return value !== 0
      }

      // Check if ADVIA has any non-zero values
      const hasValidAdvia = [
        sample.rbc_advia,
        sample.hb_advia,
        sample.hct_advia,
        sample.mcv_advia,
        sample.mch_advia,
        sample.mchc_advia,
        sample.rdw_advia,
        sample.plt_advia,
        sample.wbc_advia
      ].some(isNonZero)

      // Check other components for non-zero values
      const hasValidDNA = isNonZero(sample.concentration_1_dna)
      const hasValidPBMC = isNonZero(sample.cell_number_1_pbmc)
      const hasValidPlasma = isNonZero(sample.vol_plasma_1)

      // Determine processing status
      let processing_status: 'Complete' | 'Partial' | 'Pending'
      if (!hasValidAdvia) {
        processing_status = 'Pending'
      } else if (hasValidDNA && hasValidPBMC && hasValidPlasma) {
        processing_status = 'Complete'
      } else {
        processing_status = 'Partial'
      }

      // Determine QC status
      let qc_status: 'Passed' | 'Failed' | 'Review'
      if (sample.qc_pass_advia === 'No' || sample.qc_pass_lorrca === 'No' || sample.qc_pass_dna === 'No') {
        qc_status = 'Failed'
      } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review' || sample.qc_pass_dna === 'Review') {
        qc_status = 'Review'
      } else {
        qc_status = 'Passed'
      }

      return {
        ...sample,
        processing_status,
        qc_status,
        // Ensure date is properly formatted for the table
        date_of_collection: sample.date_of_collection ? new Date(sample.date_of_collection).toISOString() : null
      }
    })

    return {
      samples: convertToNumber(processedSamples),
      totalCount: totalCount || 0,
      totalPages: Math.ceil((totalCount || 0) / pageSize)
    }
  } catch (error) {
    console.error('Error in getSamplesData:', error)
    return {
      samples: [],
      totalCount: 0,
      totalPages: 0
    }
  }
}

interface PageProps {
  searchParams: { 
    page?: string
    pageSize?: string
    search?: string
    sort?: string
    order?: 'asc' | 'desc'
  }
}

export default async function SamplesPage({ searchParams }: PageProps) {
  // Convert searchParams to a regular object to avoid the async property access error
  const params = {
    page: searchParams.page,
    pageSize: searchParams.pageSize,
    search: searchParams.search,
    sort: searchParams.sort,
    order: searchParams.order
  };

  const currentPage = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE
  const search = params.search || undefined
  const sort = params.sort || 'date_of_collection'
  const order = (params.order || 'desc') as 'asc' | 'desc'

  const { samples, totalCount, totalPages } = await getSamplesData(
    currentPage,
    pageSize,
    search,
    sort,
    order
  )

  // Generate pagination range
  const generatePaginationRange = (currentPage: number, totalPages: number) => {
    const range: (number | 'ellipsis')[] = []
    const maxVisiblePages = 7 // Total number of page buttons to show

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    // Always show first page
    range.push(1)

    // Calculate start and end of the middle range
    let middleStart = Math.max(2, currentPage - 2)
    let middleEnd = Math.min(totalPages - 1, currentPage + 2)

    // Adjust if current page is near the start
    if (currentPage <= 4) {
      middleStart = 2
      middleEnd = 5
    }

    // Adjust if current page is near the end
    if (currentPage >= totalPages - 3) {
      middleStart = totalPages - 4
      middleEnd = totalPages - 1
    }

    // Add ellipsis and middle range
    if (middleStart > 2) range.push('ellipsis')
    for (let i = middleStart; i <= middleEnd; i++) {
      range.push(i)
    }
    if (middleEnd < totalPages - 1) range.push('ellipsis')

    // Always show last page
    range.push(totalPages)

    return range
  }

  const paginationRange = generatePaginationRange(currentPage, totalPages)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Samples</h1>
            <p className="mt-2 text-sm text-gray-600">
              Showing {samples.length} of {totalCount} total samples
            </p>
          </div>

          {/* Search and Page Size Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SamplesSearchBar />
            <PageSizeSelector pageSize={pageSize} pageSizeOptions={PAGE_SIZE_OPTIONS} />
          </div>

          {/* Samples Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <SamplesTable samples={samples} />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Link
                href={`/samples?page=${Math.max(1, currentPage - 1)}&pageSize=${pageSize}&search=${search}&sort=${sort}&order=${order}`}
                className={`px-3 py-2 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </Link>
              
              {paginationRange.map((page, index) => (
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-3 py-2">
                    ...
                  </span>
                ) : (
                  <Link
                    key={page}
                    href={`/samples?page=${page}&pageSize=${pageSize}&search=${search}&sort=${sort}&order=${order}`}
                    className={`px-3 py-2 rounded-md ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </Link>
                )
              ))}

              <Link
                href={`/samples?page=${Math.min(totalPages, currentPage + 1)}&pageSize=${pageSize}&search=${search}&sort=${sort}&order=${order}`}
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