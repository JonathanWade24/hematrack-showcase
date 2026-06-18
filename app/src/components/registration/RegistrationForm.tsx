'use client'

import { useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'

interface RegistrationFormData {
  subject_id: string
  registration_date: string
  consent_date: string
  corporate_id?: string
  patient_mrn: string
  first_name: string
  middle_name?: string
  last_name: string
  date_of_birth: string
}

export function RegistrationForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegistrationFormData>({
    subject_id: '',
    registration_date: '',
    consent_date: '',
    corporate_id: '',
    patient_mrn: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      router.push(`/subjects/${formData.subject_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Subject ID *
          </label>
          <Input
            type="text"
            value={formData.subject_id}
            onChange={(e) => handleInputChange('subject_id', e.target.value)}
            placeholder="e.g., OMI-0001"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Patient MRN *
          </label>
          <Input
            type="text"
            value={formData.patient_mrn}
            onChange={(e) => handleInputChange('patient_mrn', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Registration Date *
          </label>
          <Input
            type="date"
            value={formData.registration_date}
            onChange={(e) => handleInputChange('registration_date', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Consent Date *
          </label>
          <Input
            type="date"
            value={formData.consent_date}
            onChange={(e) => handleInputChange('consent_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <Input
            type="text"
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Middle Name
          </label>
          <Input
            type="text"
            value={formData.middle_name}
            onChange={(e) => handleInputChange('middle_name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <Input
            type="text"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date of Birth *
          </label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Corporate ID
          </label>
          <Input
            type="text"
            value={formData.corporate_id}
            onChange={(e) => handleInputChange('corporate_id', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          isLoading={loading}
        >
          Register Patient
        </Button>
      </div>
    </form>
  )
} 