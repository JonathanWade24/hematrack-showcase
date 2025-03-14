import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  // Example of fetching data with Supabase
  const { data: patients } = await supabase
    .from('phi.patients')
    .select('*')
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span>Welcome, {user.email}</span>
            <Link 
              href="/logout"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Sign Out
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Patients</h2>
          
          {patients && patients.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {patients.map((patient) => (
                <li key={patient.id} className="py-4">
                  {patient.first_name} {patient.last_name} (MRN: {patient.patient_mrn})
                </li>
              ))}
            </ul>
          ) : (
            <p>No patients found.</p>
          )}
        </div>
      </div>
    </div>
  )
} 