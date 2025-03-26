'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccessDenied() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function getUserRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setRole(user?.app_metadata?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserRole();
  }, []);
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        
        <div className="mb-6">
          <p className="mb-2">
            You don&apos;t have permission to access this resource.
          </p>
          
          {role && (
            <p className="text-gray-600">
              Your current role: <span className="font-semibold">{role}</span>
            </p>
          )}
          
          <p className="mt-4 text-sm text-gray-500">
            This page requires a role with clinical data access permissions.
            If you believe you should have access, please contact your administrator.
          </p>
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/" 
            className="block w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Go to Home
          </Link>
          
          <Link 
            href="/subjects" 
            className="block w-full border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
          >
            Go to Subjects
          </Link>
        </div>
      </div>
    </div>
  );
} 