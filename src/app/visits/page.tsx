import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
// Remove old/deprecated imports
// import { createClinicalClient, createPhiClient } from '@/lib/supabase/server' 
// import { ITEMS_PER_PAGE as DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { getAllVisits } from '@/lib/prisma/operations' // Import new Prisma function
import { unified_visits, patients } from '@prisma/client' // Import relevant Prisma types
import Pagination from '@/components/samples/Pagination' // Use default import for Pagination

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Define structure needed for the table, based on Prisma return type
// Use Omit to exclude the actual relation object if needed, or just select fields
type VisitForTable = unified_visits & { 
  patient: patients | null; // Expecting patient relation 
  // We will serialize dates before rendering
};

// Helper to format Date for display
const formatDate = (date: Date | null | undefined): string => {
  return date ? new Date(date).toLocaleDateString() : 'N/A';
};

// Define Page Props, including searchParams for pagination/filtering
interface VisitsPageProps {
  searchParams?: { 
    page?: string;
    pageSize?: string;
    type?: string; // Keep type filter if needed
  };
}

// Remove the old local getVisits function
// async function getVisits(...) { ... }

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 20; // Default page size
  const type = searchParams?.type;

  console.log('Fetching all unified visits using Prisma...');
  const allVisitsData: (unified_visits & { patient: patients | null })[] = await getAllVisits(); 
  console.log(`Fetched ${allVisitsData?.length || 0} visits`);

  // --- Client-side Pagination/Filtering (Apply AFTER fetching all) ---
  const filteredVisits: (unified_visits & { patient: patients | null })[] = type 
    ? allVisitsData.filter(visit => visit.visit_type?.toLowerCase() === type.toLowerCase())
    : allVisitsData;

  const totalVisits = filteredVisits.length;
  const totalPages = Math.ceil(totalVisits / pageSize);
  
  // Explicitly type the result of slice
  const paginatedVisits: (unified_visits & { patient: patients | null })[] = filteredVisits.slice(
      (currentPage - 1) * pageSize, 
      currentPage * pageSize
  );
  // --- End Pagination/Filtering ---

  const visitsToDisplay = paginatedVisits;

  const handlePageChange = (newPage: number) => {
    // This function won't work directly in Server Component
    // Pagination needs URL updates handled by Link or router push in Client Component
    // For now, pagination links update the URL search params
    console.log("Page change requires URL update, handled by Pagination component links");
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Visits</h1>
              <p className="mt-2 text-sm text-gray-600">
                Showing {paginatedVisits.length} of {totalVisits} total visits {type ? `(Type: ${type})` : ''}
              </p>
            </div>
            {/* Add Filter controls here if needed */}
          </div>

          {/* Visits Table */}
          {/* Allow horizontal scrolling on smaller screens */}
          <div className="bg-white shadow overflow-x-auto rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient MRN
                  </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  {/* Add Actions Header */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visitsToDisplay.map((visit: unified_visits & { patient: patients | null }) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                       {/* Link to specific visit page if it exists */}
                      {/* <Link href={`/visits/${visit.visit_id}`}> */}
                        {visit.visit_id}
                      {/* </Link> */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/patients/${visit.patient_mrn}`} className="text-indigo-600 hover:text-indigo-900">
                        {visit.patient_mrn}
                      </Link>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {visit.patient ? `${visit.patient.first_name || ''} ${visit.patient.last_name || ''}`.trim() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.visit_type} {visit.specific_visit_type ? `(${visit.specific_visit_type})` : ''} 
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(visit.start_date)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(visit.end_date)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.department || 'N/A'}
                    </td>
                    {/* Add Actions Cell */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/visits/${visit.patient_mrn}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Timeline
                      </Link>
                       {/* Add link to specific visit page? (if it exists) */}
                      {/* <Link href={`/visit-details/${visit.visit_id}`} className="ml-4 text-gray-600 hover:text-gray-900">Details</Link> */}
                    </td>
                  </tr>
                ))}
                
                {visitsToDisplay.length === 0 && (
                  <tr>
                    {/* Adjust colspan */}
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500"> 
                      No visits found {type ? `for type ${type}` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

           {/* Pagination Controls */}
          <div className="mt-6 flex justify-center">
             <Pagination 
               currentPage={currentPage} 
               totalPages={totalPages} 
               // Pass the base path and any existing query params except 'page'
               // Note: The Pagination component needs to handle constructing the links
               // For server components, it might render Links directly.
               // We remove the onPageChange prop as it cannot be used directly here.
             />
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
} 