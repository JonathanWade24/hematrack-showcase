'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'

interface Settings {
  email_notifications: boolean
  dark_mode: boolean
  show_phi: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    email_notifications: true,
    dark_mode: false,
    show_phi: true
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching user:', error)
        router.push('/login')
        return
      }
      if (!user) {
        router.push('/login')
        return
      }
      setLoading(false)
    }

    getUser()
  }, [supabase.auth, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          settings
        }
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Settings</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Manage your preferences and account settings.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              {/* Notifications */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email_notifications"
                    name="email_notifications"
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email_notifications" className="font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <p className="text-gray-500">
                    Receive email notifications about important updates and changes.
                  </p>
                </div>
              </div>

              {/* Dark Mode */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="dark_mode"
                    name="dark_mode"
                    type="checkbox"
                    checked={settings.dark_mode}
                    onChange={(e) => setSettings({ ...settings, dark_mode: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="dark_mode" className="font-medium text-gray-700">
                    Dark Mode
                  </label>
                  <p className="text-gray-500">
                    Enable dark mode for a more comfortable viewing experience.
                  </p>
                </div>
              </div>

              {/* PHI Visibility */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="show_phi"
                    name="show_phi"
                    type="checkbox"
                    checked={settings.show_phi}
                    onChange={(e) => setSettings({ ...settings, show_phi: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="show_phi" className="font-medium text-gray-700">
                    Show PHI
                  </label>
                  <p className="text-gray-500">
                    Display protected health information in the interface.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Success</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Your settings have been updated successfully.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faSave} className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 