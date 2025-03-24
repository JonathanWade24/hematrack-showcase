'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccessDenied() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function getUserRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setRole(user?.app_metadata?.role || null);
      setLoading(false);
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
        </div>
        
        <div className="space-y-3">
          <Link 
            href="/dashboard" 
            className="block w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Go to Dashboard
          </Link>
          
          <Link 
            href="/" 
            className="block w-full border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 