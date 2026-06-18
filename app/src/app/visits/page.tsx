import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilter, faTimesCircle, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons' // Added chevrons
import { getAllVisitsForListView, type VisitForListView } from '@/lib/db/queries' // Drizzle query
import { Button } from '@/components/ui/button' // Import Button for pagination

// Explicitly force dynamic rendering because we use searchParams
export const dynamic = 'force-dynamic';

const VISITS_PER_PAGE = 15;

interface VisitsPageProps {
  searchParams?: { 
    page?: string;
    type?: string; 
  };
}

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const visitTypeFilter = searchParams?.type || ''; 

  const { visits: fetchedVisits, totalVisits } = await getAllVisitsForListView(
    VISITS_PER_PAGE,
    (currentPage - 1) * VISITS_PER_PAGE,
    visitTypeFilter || undefined 
  );

  const totalPages = Math.ceil(totalVisits / VISITS_PER_PAGE);

  // Helper function to create pagination links
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (visitTypeFilter) {
      params.set('type', visitTypeFilter);
    }
    return `/visits?${params.toString()}`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <header className="flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">All Visits</h1>
          </header>

          {/* Filters */} 
          <div className="flex space-x-4 mb-4 items-center">
            <span className="text-sm font-medium text-gray-700">Filter by Type:</span>
             {/* Links now construct URLs without relying on internal state of Pagination component */}
            <Link href={createPageUrl(1) + (visitTypeFilter === 'IP' ? '' : '&type=IP')} passHref>
              <Button variant={visitTypeFilter === 'IP' ? 'default' : 'outline'} size="sm">
                 Inpatient (IP)
              </Button>
            </Link>
            <Link href={createPageUrl(1) + (visitTypeFilter === 'OP' ? '' : '&type=OP')} passHref>
              <Button variant={visitTypeFilter === 'OP' ? 'default' : 'outline'} size="sm">
                 Outpatient (OP)
               </Button>
            </Link>
            {visitTypeFilter && (
              <Link href={createPageUrl(1)} passHref>
                 <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                   <FontAwesomeIcon icon={faTimesCircle} className="mr-1" /> Clear Type Filter
                 </Button>
              </Link>
            )}
          </div>

          <div className="overflow-x-auto bg-white shadow sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
               {/* Table Head */}
              <thead className="bg-gray-50">
                 <tr>
                   {['Visit ID', 'Patient MRN', 'Patient Name', 'Type', 'Start Date', 'End Date', 'Department', 'Actions'].map((header) => (
                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Table Body */} 
              <tbody className="bg-white divide-y divide-gray-200">
                 {fetchedVisits.map((visit: VisitForListView) => (
                  <tr key={visit.visit_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {visit.visit_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/patients/${visit.patient_mrn}`} className="text-indigo-600 hover:text-indigo-900">
                        {visit.patient_mrn}
                      </Link>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {`${visit.patient_first_name || ''} ${visit.patient_last_name || ''}`.trim() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.visit_type} 
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.start_date ? new Date(visit.start_date).toLocaleDateString() : 'N/A'} 
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.end_date ? new Date(visit.end_date).toLocaleDateString() : 'N/A'} 
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.department_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/visits/${visit.patient_mrn}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Timeline
                      </Link>
                    </td>
                  </tr>
                ))}
                
                {fetchedVisits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500"> 
                      No visits found {visitTypeFilter ? `for type ${visitTypeFilter}` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Server-Side Pagination Links */} 
          {totalPages > 1 && (
             <div className="mt-6 flex justify-center items-center space-x-2">
              <Link href={createPageUrl(currentPage - 1)} passHref legacyBehavior={currentPage === 1} aria-disabled={currentPage === 1}>
                 <Button variant="outline" size="sm" disabled={currentPage === 1}>
                    <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 mr-1" /> Previous
                 </Button>
               </Link>
               <span className="text-sm text-gray-700">
                 Page {currentPage} of {totalPages}
              </span>
              <Link href={createPageUrl(currentPage + 1)} passHref legacyBehavior={currentPage === totalPages} aria-disabled={currentPage === totalPages}>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
                   Next <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 ml-1" />
                 </Button>
               </Link>
             </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 