import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async (schema = 'laboratory') => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      db: {
        schema: schema
      }
    }
  );
};

// Helper to get client with specific schema
export const createClinicalClient = async () => {
  return createClient('clinical');
};

export const createPhiClient = async () => {
  return createClient('phi');
};

// For admin operations that require service role
export const createAdminClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { /* No-op */ }
      },
      db: {
        schema: 'laboratory'
      }
    }
  );
}; 