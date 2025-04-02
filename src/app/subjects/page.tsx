import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { convertToNumber } from '@/lib/utils'
import { getAllOmicsSubjects } from '@/lib/supabase/operations'

interface Subject {
  subject_id: string
  patient_mrn: string | null
  project: string | null
  date_of_birth: string | null
  gender: string | null
  ethnicity: string | null
  genotype: string | null
  sample_count: number
  latest_sample_date: string | null
}

export default async function SubjectsPage() {
  console.log('Fetching all omics subjects...');
  const subjectsData = await getAllOmicsSubjects();
  console.log(`Fetched ${subjectsData?.length || 0} subjects`);
  console.log('First few subjects:', subjectsData?.slice(0, 3));
  
  const subjects = convertToNumber(subjectsData) as Subject[];
  
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Genotype
                  </th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.genotype || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.sample_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.latest_sample_date 
                        ? new Date(subject.latest_sample_date).toLocaleDateString() 
                        : 'N/A'}
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
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
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