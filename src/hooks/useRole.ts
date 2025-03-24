'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchRole() {
      try {
        console.log("DEBUG: Fetching role from user metadata");
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("DEBUG: Error fetching user:", userError);
          throw userError;
        }
        
        // Get role from JWT claims (app_metadata)
        const metadataRole = user?.app_metadata?.role;
        console.log("DEBUG: User metadata role:", metadataRole);
        
        // If no role in metadata, try to fetch from database
        if (!metadataRole && user) {
          console.log("DEBUG: No role in metadata, trying database lookup");
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_role_assignments')
              .select('role_id')
              .eq('user_id', user.id)
              .single();
              
            if (roleError) {
              console.error("DEBUG: Role assignment lookup error:", roleError);
            } else if (roleData) {
              console.log("DEBUG: Found role assignment:", roleData);
              
              // Look up the role name
              const { data: roleName, error: nameError } = await supabase
                .from('user_roles')
                .select('name')
                .eq('id', roleData.role_id)
                .single();
              
              if (nameError) {
                console.error("DEBUG: Role name lookup error:", nameError);
              } else if (roleName) {
                console.log("DEBUG: Setting role from database:", roleName.name);
                setRole(roleName.name);
                setLoading(false);
                return;
              }
            }
          } catch (dbErr) {
            console.error("DEBUG: Database lookup error:", dbErr);
          }
        }
        
        setRole(metadataRole || null);
      } catch (err) {
        console.error('DEBUG: Error in fetchRole:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRole();
    
    // Subscribe to auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("DEBUG: Auth state change event:", event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const newRole = session?.user?.app_metadata?.role;
          console.log("DEBUG: New role from auth change:", newRole);
          setRole(newRole || null);
        } else if (event === 'SIGNED_OUT') {
          console.log("DEBUG: User signed out, clearing role");
          setRole(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return { role, loading, error };
} 