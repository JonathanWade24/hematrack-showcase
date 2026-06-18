import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { getAllPatientsData, type PatientWithSubjectId } from '@/lib/db/queries' // Use updated query & type
import type { patientsInClinical } from '@/lib/db/schema'; // Keep for base type if needed, maybe remove
import { Button } from '@/components/ui/button'; // Import Button
import { auth } from '@/app/api/auth/[...nextauth]/route' // Added
import type { UserRole } from '@/lib/definitions' // Added

// Use the specific type from the query
type PatientForTable = PatientWithSubjectId;

// Explicitly make the page dynamic to handle searchParams correctly
export const dynamic = 'force-dynamic';

export default async function PatientsPage({ 
  searchParams 
}: { 
  searchParams?: { [key: string]: string | string[] | undefined } 
}) {
  const session = await auth(); // Added
  const userRole = session?.user?.role as UserRole | undefined; // Added

  // Added role check
  if (userRole === 'noPHI_viewer' || userRole === 'noPHI_editor') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filter = searchParams?.filter === 'hasSubject'; // Read filter state
  const patientsData = await getAllPatientsData(filter); // Pass filter to query

  const patientsForTable: PatientForTable[] = patientsData; 

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Patients</h1>
              <p className="mt-2 text-sm text-gray-600">
                Showing {patientsForTable.length} {filter ? 'linked' : 'total'} patients
              </p>
            </div>
            {/* Filter Buttons */} 
            <div className="flex space-x-2">
              <Link href="/patients" passHref>
                <Button variant={!filter ? 'default' : 'outline'}>
                  Show All
                </Button>
              </Link>
              <Link href="/patients?filter=hasSubject" passHref>
                 <Button variant={filter ? 'default' : 'outline'}>
                   Show Linked Only
                 </Button>
              </Link>
            </div>
          </div>

          {/* Patients Table */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                  {/* Removed Name Column Header */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Race</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ethnicity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patientsForTable.map((patient, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {patient.patient_mrn}
                    </td>
                    {/* Removed Name Cell */}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.subject_id || 'N/A'} {/* Display Subject ID */} 
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.birth_date ? new Date(patient.birth_date + 'T00:00:00').toLocaleDateString() : 'N/A'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.sex || 'N/A'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.race || 'N/A'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.ethnicity || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/visits/${patient.patient_mrn}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Timeline
                      </Link>
                    </td>
                  </tr>
                ))}
                
                {patientsForTable.length === 0 && (
                  <tr>
                    {/* Adjusted colSpan */} 
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500"> 
                      No patients found {filter ? 'with linked subjects' : ''}
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