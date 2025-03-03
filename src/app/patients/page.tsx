import { prisma } from '@/db'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PatientsTable } from '@/components/patients/PatientsTable'
import { convertToNumber } from '@/lib/utils'

async function getAllPatients() {
  // Get all patients from both registration and omics subjects
  const patients = await prisma.patients.findMany({
    include: {
      registrations: true,
      omics_subjects: {
        include: {
          omics_results: {
            orderBy: {
              date_of_collection: 'desc'
            }
          }
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return convertToNumber(patients)
}

export default async function PatientsPage() {
  const patients = await getAllPatients()

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Registered Patients</h1>
            <p className="mt-2 text-sm text-gray-600">
              View all registered patients and their associated subjects
            </p>
          </div>

          {/* Patients Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <PatientsTable patients={patients} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 