'use client';

import { useState } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { useRole } from '@/hooks/useRole';

export default function RoleTestPage() {
  const { role, loading } = useRole();
  const [activeTab, setActiveTab] = useState<string>('roleGuard');
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Role-Based Access Test Page</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        {loading ? (
          <p className="animate-pulse">Loading...</p>
        ) : (
          <div className="space-y-2">
            <p>
              <span className="font-medium">Role:</span>{' '}
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {role || 'No role assigned'}
              </span>
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            className={`px-4 py-3 flex-1 ${activeTab === 'roleGuard' ? 'bg-blue-50 text-blue-600' : ''}`}
            onClick={() => setActiveTab('roleGuard')}
          >
            RoleGuard Component
          </button>
          <button
            className={`px-4 py-3 flex-1 ${activeTab === 'protectedRoute' ? 'bg-blue-50 text-blue-600' : ''}`}
            onClick={() => setActiveTab('protectedRoute')}
          >
            ProtectedRoute Component
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'roleGuard' ? (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h3 className="font-medium">Admin Content</h3>
                </div>
                <div className="p-4">
                  <RoleGuard 
                    allowedRoles={['admin']}
                    fallback={
                      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
                        You need admin access to view this content.
                      </div>
                    }
                  >
                    <div className="p-4 bg-green-50 border border-green-200 rounded text-green-600">
                      This content is only visible to admins.
                    </div>
                  </RoleGuard>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h3 className="font-medium">Researcher Content</h3>
                </div>
                <div className="p-4">
                  <RoleGuard 
                    allowedRoles={['clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'admin']}
                    fallback={
                      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
                        You need researcher access to view this content.
                      </div>
                    }
                  >
                    <div className="p-4 bg-green-50 border border-green-200 rounded text-green-600">
                      This content is visible to researchers and admins.
                    </div>
                  </RoleGuard>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b">
                  <h3 className="font-medium">Data Entry Content</h3>
                </div>
                <div className="p-4">
                  <RoleGuard 
                    allowedRoles={['clinical_data_entry', 'admin']}
                    fallback={
                      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
                        You need data entry access to view this content.
                      </div>
                    }
                  >
                    <div className="p-4 bg-green-50 border border-green-200 rounded text-green-600">
                      This content is visible to data entry users and admins.
                    </div>
                  </RoleGuard>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mb-4">
                The ProtectedRoute component redirects users without the required role.
                To test this functionality, navigate to these routes:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <a 
                    href="/admin" 
                    className="text-blue-600 hover:underline"
                  >
                    Admin Route
                  </a>
                  {' '}- Requires admin role
                </li>
                <li>
                  <a 
                    href="/clinical" 
                    className="text-blue-600 hover:underline"
                  >
                    Clinical Route
                  </a>
                  {' '}- Requires clinical roles
                </li>
                <li>
                  <a 
                    href="/data-entry" 
                    className="text-blue-600 hover:underline"
                  >
                    Data Entry Route
                  </a>
                  {' '}- Requires data entry role
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 