'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const router = useRouter();
  
  const roles = [
    { id: 'admin', name: 'Administrator' },
    { id: 'clinical_researcher_full', name: 'Clinical Researcher (Full)' },
    { id: 'clinical_researcher_masked', name: 'Clinical Researcher (Masked)' },
    { id: 'non_clinical_researcher', name: 'Non-Clinical Researcher' },
    { id: 'clinical_data_entry', name: 'Clinical Data Entry' },
  ];
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch('/api/user-roles');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  
  function handleEditUser(user: User) {
    setEditingUser(user);
    setSelectedRole(user.role || '');
  }
  
  async function handleUpdateRole() {
    if (!editingUser || !selectedRole) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editingUser.id,
          role: selectedRole,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }
      
      // Update the local state
      setUsers(users.map(user => 
        user.id === editingUser.id ? { ...user, role: selectedRole } : user
      ));
      
      // Close the edit modal
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user role:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  
  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }
  
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <button 
            onClick={() => router.push('/admin')}
            className="bg-gray-100 px-4 py-2 rounded hover:bg-gray-200"
          >
            Back to Dashboard
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && !users.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.role ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {roles.find(r => r.id === user.role)?.name || user.role}
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            No role
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Edit Role Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Edit User Role</h2>
              <p className="mb-4 text-gray-600">
                {editingUser.email}
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select a role --</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={!selectedRole || loading}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 ${
                    (!selectedRole || loading) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 