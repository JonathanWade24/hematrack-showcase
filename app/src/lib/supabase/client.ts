// import { createBrowserClient } from "@supabase/ssr";
// import { type SupabaseClient } from "@supabase/supabase-js";

// Define the specific client type we expect
// type LaboratorySchemaClient = SupabaseClient<any, 'laboratory'>;

// Basic mock Supabase client structure (Removed - No longer needed)
// const mockSupabaseClient: Partial<LaboratorySchemaClient> = { ... };

/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createClient = (): any => {
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.error("DEPRECATED: Attempted to call createClient from src/lib/supabase/client.ts");

  // // Check if Supabase credentials are provided
  // if (!supabaseUrl || !supabaseAnonKey) {
  //   if (typeof window !== 'undefined') { // Only warn in the browser
  //       console.warn("Supabase URL or Anon Key missing. Returning mock Supabase client.");
  //   }
  //   // Return the mock client if credentials are not available
  //   return mockSupabaseClient as LaboratorySchemaClient;
  // }

  // // Otherwise, create and return the real client
  // return createBrowserClient(
  //   supabaseUrl,
  //   supabaseAnonKey,
  //   {
  //     db: {
  //       schema: 'laboratory'
  //     }
  //   }
  // );
  return null; // Return null to satisfy call sites temporarily
} 