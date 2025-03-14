import { getSupabaseClient } from '@/db';
import { cookies } from 'next/headers';

// Helper to mimic Prisma's findMany
export async function findMany(table: string, options: any = {}) {
  const cookieStore = cookies();
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
    query = query.order(field, { ascending: direction === 'asc' });
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