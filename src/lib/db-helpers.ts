// import { getSupabaseClient } from '@/db'; // Removed Supabase dependency
import apiClient from '@/lib/apiClient'; // Import our new API client

// Helper to mimic Prisma's findMany, now using apiClient
export async function findMany<T = any>(table: string, options: Record<string, unknown> = {}): Promise<T[]> {
  // const supabase = await getSupabaseClient(); // Removed
  
  // Construct query parameters for the API call
  const apiParams: Record<string, any> = {};
  if (options.select) {
    // TODO: Decide how the API layer will handle column selection (e.g., 'select' query param)
    // apiParams.select = options.select;
    console.warn('[findMany] Column selection via `options.select` is not yet implemented in API layer.');
  }
  if (options.where) {
    // Pass the where clause directly, assuming API handles it
    apiParams.where = JSON.stringify(options.where); // Stringify for query param
  }
  if (options.orderBy) {
    // Pass orderBy, assuming API handles it
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
    // Note: We expect the API to return an array of results for findMany
    const data = await apiClient.get<T[]>(endpoint, apiParams);
    return data;

  } catch (error) {
    console.error(`[findMany] Error fetching data for table ${table}:`, error);
    // Re-throw or handle error appropriately
    // Depending on application needs, might return empty array or throw
    throw error; 
  }
  
  // --- Original Supabase Query Logic (Removed) ---
  // let query = supabase.from(table).select(options.select as string || '*');
  // 
  // if (options.where) {
  //   Object.entries(options.where).forEach(([key, value]) => {
  //     query = query.eq(key, value);
  //   });
  // }
  // 
  // if (options.orderBy) {
  //   const [field, direction] = Object.entries(options.orderBy)[0];
  //   query = query.order(field, { ascending: direction === 'asc' });
  // }
  // 
  // if (options.take) {
  //   query = query.limit(Number(options.take));
  // }
  // 
  // if (options.skip) {
  //   query = query.range(Number(options.skip), Number(options.skip) + (options.take ? Number(options.take) : 10) - 1);
  // }
  // 
  // const { data, error } = await query;
  // 
  // if (error) throw error;
  // return data;
  // --- End Original Supabase Query Logic ---
} 