import { DashboardLayout } from '@/components/layout/DashboardLayout'
import SamplesTable from '@/components/dashboard/SamplesTable'
import Link from 'next/link'
import { PageSizeSelector } from '@/components/samples/PageSizeSelector'
import { SamplesSearchBar } from '@/components/samples/SamplesSearchBar'
import { createClient } from '@/lib/supabase/server'

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
  const labClient = await createClient() // Default is laboratory schema
  
  // Define the default return value for errors or missing client
  const defaultReturn = { samples: [], totalCount: 0, totalPages: 0 };

  // Handle missing client
  if (!labClient) {
      console.warn('[getSamplesData] Supabase client not available. Returning empty data.');
      return defaultReturn;
  }
  
  try {
    // Get total count first
    const { count: totalCount, error: countError } = await labClient
      .from('omics_results')
      .select('*', { count: 'exact', head: true })
      
    if (countError) {
      console.error('Error counting samples:', countError)
      throw countError
    }
    
    // Build the query for samples
    let query = labClient
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
    const subjectIds = [...new Set(samples.map((sample: any) => sample.subject_id))]
    
    const { data: subjects, error: subjectsError } = await labClient
      .from('omics_subjects')
      .select('*')
      .in('subject_id', subjectIds)
    
    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError)
    }
    
    // Create a map of subjects by ID for quick lookup
    const subjectMap = (subjects || []).reduce((map: any, subject: any) => {
      map[subject.subject_id] = subject
      return map
    }, {})
    
    // Combine sample data with subject data
    const samplesWithSubjects = samples.map((sample: any) => ({
      ...sample,
      omics_subjects: subjectMap[sample.subject_id] || null
    }))

    // Process samples to include processing and QC status
    const processedSamples = samplesWithSubjects.map((sample: any) => {
      // Helper function to check if a value is non-zero
      const isNonZero = (value: number | null | undefined) => {
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
      samples: processedSamples,
      totalCount: totalCount || 0,
      totalPages: Math.ceil((totalCount || 0) / pageSize)
    }
  } catch (error) {
    console.error('Error in getSamplesData:', error)
    return defaultReturn; // Return default on error
  }
}

// Update the interface
type SearchParamsType = { 
  page?: string
  pageSize?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
};

type PageProps = {
  searchParams: Promise<SearchParamsType> | undefined;
};

export default async function SamplesPage({ searchParams }: PageProps) {
  // Handle searchParams correctly, checking for undefined
  if (!searchParams) {
    throw new Error('Missing search parameters');
  }
  
  // Resolve searchParams if it's a Promise
  const awaitedParams = await searchParams;

  // Now use the awaited params
  const currentPage = Number(awaitedParams.page) || 1
  const pageSize = Number(awaitedParams.pageSize) || DEFAULT_PAGE_SIZE
  const search = awaitedParams.search || undefined
  const sort = awaitedParams.sort || 'date_of_collection'
  const order = (awaitedParams.order || 'desc') as 'asc' | 'desc'

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
    if (totalPages > 1) range.push(totalPages)

    return range
  }

  const paginationRange = generatePaginationRange(currentPage, totalPages)

  // Generate URL for pagination links
  const getPaginationUrl = (page: number) => {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    url.pathname = '/samples'
    
    if (page !== 1) url.searchParams.set('page', page.toString())
    if (pageSize !== DEFAULT_PAGE_SIZE) url.searchParams.set('pageSize', pageSize.toString())
    if (search) url.searchParams.set('search', search)
    if (sort !== 'date_of_collection') url.searchParams.set('sort', sort)
    if (order !== 'desc') url.searchParams.set('order', order)
    
    return url.pathname + url.search
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Samples</h1>
            <Link
              href="/data-entry/individual"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add New Sample
            </Link>
          </div>
          
          <div className="flex justify-between mb-4">
            <SamplesSearchBar />
            <PageSizeSelector 
              pageSize={pageSize} 
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          </div>
          
          <SamplesTable samples={samples} />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <nav className="flex justify-center">
                <ul className="flex items-center space-x-2">
                  {/* Previous button */}
                  <li>
                    <Link
                      href={currentPage > 1 ? getPaginationUrl(currentPage - 1) : '#'}
                      className={`px-3 py-2 rounded-md ${
                        currentPage > 1
                          ? 'text-gray-700 hover:bg-gray-50'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      aria-disabled={currentPage <= 1}
                      tabIndex={currentPage <= 1 ? -1 : undefined}
                    >
                      &laquo;
                    </Link>
                  </li>
                  
                  {/* Page numbers */}
                  {paginationRange.map((page, index) => (
                    <li key={index}>
                      {page === 'ellipsis' ? (
                        <span className="px-3 py-2">...</span>
                      ) : (
                        <Link
                          href={getPaginationUrl(page as number)}
                          className={`px-3 py-2 rounded-md ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </Link>
                      )}
                    </li>
                  ))}
                  
                  {/* Next button */}
                  <li>
                    <Link
                      href={currentPage < totalPages ? getPaginationUrl(currentPage + 1) : '#'}
                      className={`px-3 py-2 rounded-md ${
                        currentPage < totalPages
                          ? 'text-gray-700 hover:bg-gray-50'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      aria-disabled={currentPage >= totalPages}
                      tabIndex={currentPage >= totalPages ? -1 : undefined}
                    >
                      &raquo;
                    </Link>
                  </li>
                </ul>
              </nav>
              <p className="mt-3 text-center text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({totalCount} total samples)
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 