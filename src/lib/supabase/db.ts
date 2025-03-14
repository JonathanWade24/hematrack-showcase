import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from './server';

// For server components
export const getSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(cookieStore);
};

// For client components or API routes that don't have access to cookies
export const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// For admin operations that require service role
export const getSupabaseAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_KEY!
  );
};

// Helper to handle Supabase errors consistently
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  throw new Error(`Database operation failed: ${error.message || 'Unknown error'}`);
};

// Type definitions to help with schema typing
export type Schema = {
  laboratory: {
    omics_results: any;
    omics_subjects: any;
  };
  clinical: {
    patients: any;
    labs: any;
    bone_marrow: any;
    ip_admissions: any;
    op_visits: any;
    ip_medications: any;
    op_medications: any;
    unified_visits: any;
  };
  public: {
    audit_log: any;
    subject_registration: any;
  };
};