'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { createClient } from '@/lib/supabase/client';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component that redirects unauthenticated users or users without proper role
 * @param allowedRoles Array of roles that are allowed to access the route
 * @param children Content to render if user is authenticated and authorized
 * @param redirectTo Optional path to redirect to (defaults to /login)
 */
export default function ProtectedRoute({ 
  allowedRoles, 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { role, loading } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    async function checkAuth() {
      if (loading) return;
      
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // User is not authenticated, redirect to login with return path
        const returnPath = encodeURIComponent(pathname);
        router.push(`${redirectTo}?redirect=${returnPath}`);
        return;
      }
      
      // User is authenticated but doesn't have the required role
      if (!role || !allowedRoles.includes(role)) {
        router.push('/access-denied');
      }
    }
    
    checkAuth();
  }, [loading, role, router, redirectTo, pathname, allowedRoles]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }
  
  // Only render children if user has the required role
  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }
  
  // Return null while redirecting
  return null;
} 