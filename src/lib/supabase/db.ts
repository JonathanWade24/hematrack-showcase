import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from './server';

// For server components
export const getSupabaseServerClient = () => {
  try {
    // Check if we're in an API route
    const isApiRoute = process.env.NEXT_RUNTIME === 'edge' || 
                      process.env.NEXT_RUNTIME === 'nodejs';
    
    // Use direct client for API routes to avoid cookie issues
    if (isApiRoute) {
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    
    // Use server client with cookies for regular server components
    const cookieStore = cookies();
    return createServerClient(cookieStore);
  } catch (error) {
    // Fallback to direct client if there's any error
    console.error('Error creating Supabase client, falling back to direct client:', error);
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Try both possible service key environment variable names
  const key = process.env.NEXT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Debug log to check if service key is available
  console.log('Admin client init - URL available:', !!url);
  console.log('Admin client init - URL:', url);
  console.log('Admin client init - Service key available:', !!key);
  console.log('Admin client init - Service key length:', key?.length || 0);
  console.log('Admin client init - NEXT_SUPABASE_SERVICE_KEY available:', !!process.env.NEXT_SUPABASE_SERVICE_KEY);
  console.log('Admin client init - SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  if (!url || !key) {
    console.error('Missing Supabase URL or service key for admin client');
    throw new Error('Missing Supabase URL or service key for admin client. Please check your environment variables.');
  }
  
  return createClient(url, key);
};

// Helper to handle Supabase errors consistently
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  
  // For API routes, we want to throw an error that can be caught and handled
  if (error.code === '23502') { // not-null constraint violation
    throw new Error(`Database constraint error: ${error.message || 'A required field is missing'}`);
  } else if (error.code === '23505') { // unique constraint violation
    throw new Error(`Duplicate entry: ${error.message || 'This record already exists'}`);
  } else if (error.code === '23503') { // foreign key constraint violation
    throw new Error(`Foreign key constraint error: ${error.message || 'Referenced record does not exist'}`);
  } else if (error.code === 'PGRST116') { // no rows returned
    // This is not really an error, just no data found
    return null;
  } else {
    throw new Error(`Database operation failed: ${error.message || 'Unknown error'}`);
  }
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