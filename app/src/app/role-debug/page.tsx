'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

interface UserInfo {
  id: string;
  email: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
}

export default function RoleDebugPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/user-info')
        if (!response.ok) {
          throw new Error('Failed to fetch user info')
        }
        const data = await response.json()
        setUserInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserInfo()
  }, [])
  
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Debugging</h1>
            <p className="mt-2 text-sm text-gray-600">
              This page helps diagnose role-based access control issues
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <p>Loading user information...</p>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : userInfo ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-medium">User Information</h2>
                  <p><strong>Email:</strong> {userInfo.email}</p>
                  <p><strong>User ID:</strong> {userInfo.id}</p>
                  <p><strong>Role:</strong> <span className="font-mono bg-gray-100 px-2 py-1 rounded">{userInfo.role || 'No role assigned'}</span></p>
                  <p><strong>Created:</strong> {new Date(userInfo.created_at).toLocaleString()}</p>
                  <p><strong>Last Login:</strong> {userInfo.last_sign_in_at ? new Date(userInfo.last_sign_in_at).toLocaleString() : 'Never'}</p>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium">Role Requirements for Routes</h2>
                  <div className="mt-2 border rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Roles</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[
                          { path: '/', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'] },
                          { path: '/admin', roles: ['admin'] },
                          { path: '/patients', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked'] },
                          { path: '/visits', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked'] },
                          { path: '/data-entry', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'] },
                          { path: '/subjects', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher'] },
                        ].map((route) => (
                          <tr key={route.path}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route.path}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {route.roles.map(role => (
                                <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                  {role}
                                </span>
                              ))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {userInfo.role && route.roles.includes(userInfo.role) ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Allowed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Denied
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium">App Metadata</h2>
                  <pre className="bg-gray-50 p-4 rounded overflow-auto mt-2">
                    {JSON.stringify(userInfo.app_metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p>No user information available</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 