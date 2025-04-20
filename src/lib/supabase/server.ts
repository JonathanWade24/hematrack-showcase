// import { createServerClient } from "@supabase/ssr";
// import { type SupabaseClient } from "@supabase/supabase-js";
// import { cookies } from "next/headers";

/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createClient = async (schema = 'laboratory'): Promise<any | null> => {
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.error("DEPRECATED: Attempted to call createClient from src/lib/supabase/server.ts");

  // // Prevent client creation during build if essential variables are missing
  // if (!supabaseUrl || !supabaseAnonKey) {
  //   // Log a warning during build/dev, but allow the build to continue
  //   if (process.env.NODE_ENV !== 'production') {
  //     console.warn('Supabase URL or Anon Key is missing, Supabase client creation skipped.');
  //   }
  //   // In a real build (NODE_ENV=production), this check effectively prevents
  //   // the client from being created if vars aren't set, avoiding the SSR error.
  //   return null; 
  // }
  // 
  // try {
  //   const cookieStore = await cookies()
  //   
  //   return createServerClient(
  //     supabaseUrl,
  //     supabaseAnonKey,
  //     {
  //       cookies: {
  //         getAll() {
  //           try {
  //             return cookieStore.getAll()
  //           } catch {
  //             // Return empty array if cookies are not available (e.g. during static generation)
  //             return []
  //           }
  //         },
  //         setAll(cookiesToSet) {
  //           try {
  //             cookiesToSet.forEach(({ name, value, options }) => 
  //               cookieStore.set(name, value, options)
  //             );
  //           } catch {
  //             // The `setAll` method was called from a Server Component or during static generation.
  //             // This can be ignored if you have middleware refreshing user sessions.
  //           }
  //         },
  //       },
  //       db: {
  //         schema: schema
  //       }
  //     }
  //   );
  // } catch (error) {
  //   // Fallback might also fail if variables are missing, add check here too
  //   if (!supabaseUrl || !supabaseAnonKey) {
  //      console.error('Fallback Supabase client creation failed: URL or Anon Key missing.', error);
  //      return null;
  //   }
  //   console.error('Error creating Supabase server client, attempting fallback:', error);
  //   // Fallback for static generation or when cookies are not available
  //   return createServerClient(
  //     supabaseUrl,
  //     supabaseAnonKey,
  //     {
  //       cookies: {
  //         getAll: () => [],
  //         setAll: () => {}
  //       },
  //       db: {
  //         schema: schema
  //       }
  //     }
  //   );
  // }
  return null; // Return null to satisfy call sites temporarily
};

// Helper to get client with specific schema
/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createClinicalClient = async () => {
  console.error("DEPRECATED: Attempted to call createClinicalClient");
  return null;
  // return createClient('clinical');
};

/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createPhiClient = async () => {
  console.error("DEPRECATED: Attempted to call createPhiClient");
  return null;
  // return createClient('phi');
};

// For admin operations that require service role
/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createAdminClient = (): any | null => {
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_KEY;

  console.error("DEPRECATED: Attempted to call createAdminClient");

  // // Prevent client creation if essential variables are missing
  // if (!supabaseUrl || !supabaseServiceKey) {
  //   if (process.env.NODE_ENV !== 'production') {
  //     console.warn('Supabase URL or Service Key is missing for Admin Client, creation skipped.');
  //   }
  //   return null;
  // }

  // // Return type needs to match the modified createClient
  // return createServerClient(
  //   supabaseUrl,
  //   supabaseServiceKey,
  //   {
  //     cookies: {
  //       getAll() { return []; },
  //       setAll() { /* No-op */ }
  //     },
  //     db: {
  //       schema: 'laboratory'
  //     }
  //   }
  // );
  return null; // Return null to satisfy call sites temporarily
}; 