import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
// import { convertToNumber } from '@/lib/utils' // Removed incorrect import
// import { getAllOmicsSubjects } from '@/lib/supabase/operations' // Old Supabase import
import { getAllOmicsSubjects } from '@/lib/prisma/operations' // Import Prisma version

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Use Prisma's generated type if available, otherwise define necessary fields
// Assuming a Prisma type `omics_subjects` exists
import { omics_subjects } from '@prisma/client'; 

// Define structure needed for the table, now receiving serialized data
interface SubjectForTable extends Omit<omics_subjects, 'created_at' | 'updated_at'> { // Omit original Date fields
  sample_count: number; 
  latest_sample_date: string | null; // Expecting string from serialization
  created_at: string | null; // Expecting string from serialization
  updated_at: string | null; // Expecting string from serialization
}

// Helper to format Date or null to 'YYYY-MM-DD' or null
const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  // Simple ISO string date part
  return date.toISOString().split('T')[0]; 
};

export default async function SubjectsPage() {
  console.log('Fetching all omics subjects with counts/dates using Prisma...');
  const rawSubjectsData = await getAllOmicsSubjects(); // Fetch using updated Prisma function
  console.log(`Fetched ${rawSubjectsData?.length || 0} subjects`);

  // Map and serialize the data for the component
  const subjects: SubjectForTable[] = (rawSubjectsData || []).map(subject => ({
    ...subject, // Spread existing fields (like subject_id, project, etc.)
    sample_count: subject._count.omics_results, // Get count from fetched data
    // Serialize dates
    latest_sample_date: formatDate(subject.latest_sample_date), 
    created_at: formatDate(subject.created_at), 
    updated_at: formatDate(subject.updated_at), 
  }));

  // Rest of the component using `subjects` array
  // ... (table rendering logic remains the same)
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Subjects</h1>
              <p className="mt-2 text-sm text-gray-600">
                Showing {subjects.length} total subjects
              </p>
            </div>
            <Link 
              href="/samples" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View All Samples
            </Link>
          </div>

          {/* Subjects Table */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Genotype
                  </th> */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latest Sample
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map((subject) => (
                  <tr key={subject.subject_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      <Link href={`/subjects/${subject.subject_id}`}>
                        {subject.subject_id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.project || 'N/A'}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.genotype || 'N/A'}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.sample_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.latest_sample_date || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link 
                        href={`/subjects/${subject.subject_id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
                
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500"> {/* Adjusted colSpan */} 
                      No subjects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 