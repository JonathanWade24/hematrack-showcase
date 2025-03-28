import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server';

// Export a named export 'prisma' for backward compatibility
export const prisma = {
  // Add methods that mimic your most commonly used Prisma methods
  // This is a temporary solution to avoid changing all imports at once
};

// This function can be used in server components/actions
export async function getSupabaseClient() {
  return createServerClient();
}

// For admin operations that need service role
export function getSupabaseAdminClient() {
  return createAdminClient();
}

// Define proper type for options instead of any
interface QueryOptions {
  select?: string;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
}

// Helper function to convert Prisma-style queries to Supabase
export async function query(table: string, options: QueryOptions = {}) {
  const supabase = await getSupabaseClient();
  
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