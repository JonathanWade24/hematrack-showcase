// import { createClient as createServerClient, createAdminClient } from '../lib/supabase/server'; // Removed Supabase
import { getPlaceholderData } from '../lib/placeholder-data'; // Keep placeholder for now
import apiClient from '@/lib/apiClient'; // Import our new API client

// Export a named export 'prisma' for backward compatibility (Keep if needed elsewhere)
export const prisma = {
  // Add methods that mimic your most commonly used Prisma methods
  // This is a temporary solution to avoid changing all imports at once
};

// REMOVED - No longer needed as Supabase clients are removed
// export async function getSupabaseClient() {
//   return createServerClient();
// }
// 
// export function getSupabaseAdminClient() {
//   return createAdminClient();
// }

// Define proper type for options instead of any
interface QueryOptions {
  select?: string;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
}

// Helper function, now using apiClient
export async function query<T = any>(table: string, options: QueryOptions = {}): Promise<T[]> {
  // const supabase = await getSupabaseClient(); // Removed
  
  // Construct query parameters for the API call
  const apiParams: Record<string, any> = {};
  if (options.select) {
    // TODO: Decide how the API layer will handle column selection (e.g., 'select' query param)
    // apiParams.select = options.select;
    console.warn('[query] Column selection via `options.select` is not yet implemented in API layer.');
  }
  if (options.where) {
    apiParams.where = JSON.stringify(options.where); // Stringify for query param
  }
  if (options.orderBy) {
    apiParams.orderBy = JSON.stringify(options.orderBy); // Stringify for query param
  }
  if (options.take) {
    apiParams.take = options.take;
  }
  if (options.skip) {
    apiParams.skip = options.skip;
  }

  try {
    // Construct the API endpoint path (assuming a simple /api/data/{table} structure)
    const endpoint = `/data/${table}`;
    
    // Call the API client
    const data = await apiClient.get<T[]>(endpoint, apiParams);
    return data;

  } catch (error) {
    console.error(`[query] Error fetching data for table ${table}:`, error);
    // Fallback to placeholder data if API fails?
    console.warn(`[query] API call failed for ${table}. Returning placeholder data.`);
    return getPlaceholderData(`query helper for ${table}`); 
  }
  
  // --- Original Supabase Logic (Removed) ---
  // if (!supabase) {
  //     console.warn(`[query helper] Supabase client not available for table: ${table}. Returning placeholder data.`);
  //     return getPlaceholderData(`query helper for ${table}`); 
  // }
  // 
  // let queryBuilder = supabase.from(table).select(options.select || '*');
  // 
  // if (options.where) {
  //   Object.entries(options.where).forEach(([key, value]) => {
  //     queryBuilder = queryBuilder.eq(key, value);
  //   });
  // }
  // 
  // if (options.orderBy) {
  //   const [field, direction] = Object.entries(options.orderBy)[0];
  //   queryBuilder = queryBuilder.order(field as string, { ascending: direction === 'asc' });
  // }
  // 
  // if (options.take) {
  //   queryBuilder = queryBuilder.limit(options.take);
  // }
  // 
  // if (options.skip) {
  //   const lowerBound = options.skip;
  //   const upperBound = options.skip + (options.take || 10) - 1;
  //   queryBuilder = queryBuilder.range(lowerBound, upperBound);
  // }
  // 
  // const { data, error } = await queryBuilder;
  // 
  // if (error) throw error;
  // return data;
  // --- End Original Supabase Logic ---
} 