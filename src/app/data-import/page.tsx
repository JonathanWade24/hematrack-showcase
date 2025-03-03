import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DataImportForm } from '@/components/data-import/DataImportForm'

export default function DataImportPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
          <p className="mt-2 text-gray-600">
            Import clinical data from EPIC text files. Select the files you want to import and click the Import button.
            The system will process each file and update the database with the new information.
          </p>
        </div>

        <DataImportForm />
      </div>
    </DashboardLayout>
  )
} 