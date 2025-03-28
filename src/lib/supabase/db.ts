import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from './server';

// Define a proper error type for Supabase errors
interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  // Add index signature to make it compatible with PostgrestError
  [key: string]: unknown;
}

// For server components
export const getSupabaseServerClient = async () => {
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
    // Convert cookieStore to awaited result to fix type error
    return await createServerClient();
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
export const handleSupabaseError = (error: SupabaseError) => {
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

// Define basic record types for tables
interface BaseRecord {
  id: string | number;
  created_at?: string;
  updated_at?: string;
}

// Type definitions with more specific types instead of 'any'
export type Schema = {
  laboratory: {
    omics_results: BaseRecord & {
      sample_id: string;
      subject_id: string;
      date_of_collection: string;
      genotype?: string;
      [key: string]: unknown; // Allow other properties
    };
    omics_subjects: BaseRecord & {
      subject_id: string;
      patient_mrn?: string;
      project?: string;
      [key: string]: unknown; // Allow other properties
    };
  };
  clinical: {
    patients: BaseRecord & {
      patient_mrn: string;
      [key: string]: unknown;
    };
    labs: BaseRecord & {
      patient_mrn: string;
      lab_date?: string;
      lab_result_value?: number | string;
      lab_component_description?: string;
      [key: string]: unknown;
    };
    bone_marrow: BaseRecord & {
      patient_mrn: string;
      [key: string]: unknown;
    };
    ip_admissions: BaseRecord & {
      patient_mrn: string;
      admit_date?: string;
      discharge_date?: string;
      [key: string]: unknown;
    };
    op_visits: BaseRecord & {
      patient_mrn: string;
      visit_date?: string;
      [key: string]: unknown;
    };
    ip_medications: BaseRecord & {
      patient_mrn: string;
      [key: string]: unknown;
    };
    op_medications: BaseRecord & {
      patient_mrn: string;
      generic_description?: string;
      [key: string]: unknown;
    };
    unified_visits: BaseRecord & {
      patient_mrn: string;
      visit_date?: string;
      visit_type?: string;
      [key: string]: unknown;
    };
  };
  public: {
    audit_log: BaseRecord & {
      action: string;
      user_id: string;
      [key: string]: unknown;
    };
    subject_registration: BaseRecord & {
      subject_id: string;
      [key: string]: unknown;
    };
  };
};