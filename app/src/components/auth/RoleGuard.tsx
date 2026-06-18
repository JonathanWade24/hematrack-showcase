'use client';

import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RoleGuard component that conditionally renders children based on user's role
 * @param allowedRoles Array of roles that are allowed to see the children
 * @param children Content to show if user has appropriate role
 * @param fallback Optional content to show if user doesn't have appropriate role
 */
export default function RoleGuard({ 
  allowedRoles, 
  children, 
  fallback = null 
}: RoleGuardProps) {
  const { role, loading } = useRole();
  
  if (loading) {
    return <div className="animate-pulse opacity-75">Loading...</div>;
  }
  
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
} 