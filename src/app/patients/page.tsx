import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
// import { getAllPatients } from '@/lib/supabase/operations' // Old Supabase import
import { getAllPatients } from '@/lib/prisma/operations' // New Prisma import
import { patients } from '@prisma/client'; // Import Prisma type

// Define the structure expected by the client/table component
// Ensure all complex types (Date, Decimal) are handled/serialized if passed to client
interface PatientForTable extends patients {
  // Add any calculated or specifically formatted fields if needed
  // Example: serialized_birth_date?: string;
}

// Helper function (define or import from utils if it exists)
// function serializePatientData(patient: patients): PatientForTable {
//   return {
//     ...patient,
//     // Explicitly serialize fields
//     created_at: patient.created_at?.toISOString() ?? null,
//     updated_at: patient.updated_at?.toISOString() ?? null,
//     birth_date: patient.birth_date?.toISOString() ?? null,
//     // Add serialization for any Decimal fields if they exist on patients
//   };
// }

export default async function PatientsPage() {
  const patientsData = await getAllPatients(); // Use Prisma version

  // *** Important: Serialize data if passing to a Client Component ***
  // const serializedPatients = patientsData.map(serializePatientData);
  // For now, assume this page/table is server-rendered or serialization happens in child
  const patientsForTable: PatientForTable[] = patientsData; 

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Patients</h1>
              <p className="mt-2 text-sm text-gray-600">
                Showing {patientsForTable.length} total patients
              </p>
            </div>
            {/* Add New Patient Button ? */}
          </div>

          {/* Patients Table */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Race</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ethnicity</th>
                  {/* Add Actions? */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patientsForTable.map((patient) => (
                  <tr key={patient.patient_mrn} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {/* Link to patient detail page? */}
                      {patient.patient_mrn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {`${patient.last_name || ''}, ${patient.first_name || ''} ${patient.middle_name || ''}`.trim()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : 'N/A'}
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
                  </tr>
                ))}
                
                {patientsForTable.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500"> 
                      No patients found
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