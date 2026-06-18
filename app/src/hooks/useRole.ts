'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: session, status } = useSession();
  
  useEffect(() => {
    // Handle loading state from NextAuth
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    
    // NextAuth provides the role directly in the session
    if (session?.user?.role) {
      setRole(session.user.role);
    } else {
      setRole(null);
    }
    
    setLoading(false);
  }, [session, status]);
  
  return { role, loading, error };
} 