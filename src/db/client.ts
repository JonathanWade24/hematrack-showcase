import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// Export a named export 'prisma' for backward compatibility
export const prisma = {
  // Add methods that mimic your most commonly used Prisma methods
  // This is a temporary solution to avoid changing all imports at once
};

// This function can be used in server components/actions
export function getSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(cookieStore);
}

// For admin operations that need service role
export function getSupabaseAdminClient() {
  // Import the admin client from your server utility
  const { createAdminClient } = require('@/lib/supabase/server');
  return createAdminClient();
}

// Helper function to convert Prisma-style queries to Supabase
export async function query(table: string, options: any = {}) {
  const supabase = getSupabaseClient();
  
  let query = supabase.from(table).select(options.select || '*');
  
  if (options.where) {
    // Convert Prisma where to Supabase filter
    Object.entries(options.where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  if (options.orderBy) {
    // Convert Prisma orderBy to Supabase order
    const [field, direction] = Object.entries(options.orderBy)[0];
    query = query.order(field as string, { ascending: direction === 'asc' });
  }
  
  if (options.take) {
    query = query.limit(options.take);
  }
  
  if (options.skip) {
    query = query.range(options.skip, options.skip + (options.take || 10) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
} 