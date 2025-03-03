import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { RegistrationForm } from '@/components/registration/RegistrationForm'

export default function RegistrationPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
            <p className="mt-2 text-sm text-gray-600">
              Register a new patient and create their subject record. Fields marked with * are required.
            </p>
          </div>

          {/* Registration Form */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <RegistrationForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 