'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <p className="text-gray-600 mb-4">Manage users and role assignments</p>
            <Link href="/admin/user-management">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Manage Users
              </button>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <p className="text-gray-600 mb-4">Configure system-wide settings</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Edit Settings
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Database Management</h2>
            <p className="text-gray-600 mb-4">Manage database operations</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              View Database
            </button>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    2023-07-01 13:45
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    admin@example.com
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    User role updated
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Changed user123 from researcher to admin
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    2023-07-01 10:23
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    admin@example.com
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    System backup
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Weekly backup completed successfully
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 