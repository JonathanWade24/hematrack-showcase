import { SampleEntryForm } from '@/components/data-entry/SampleEntryForm'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function IndividualSampleEntryPage() {
  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Individual Sample Entry</h1>
          <p className="mt-2 text-sm text-gray-700">
            Enter data for a single sample. All fields are optional unless marked as required.
          </p>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <SampleEntryForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 