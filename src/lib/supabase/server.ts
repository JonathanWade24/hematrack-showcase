import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async (schema = 'laboratory') => {
  try {
    const cookieStore = await cookies()
    
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return cookieStore.getAll()
            } catch {
              // Return empty array if cookies are not available (e.g. during static generation)
              return []
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component or during static generation.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
        db: {
          schema: schema
        }
      }
    );
  } catch (error) {
    // Fallback for static generation or when cookies are not available
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {}
        },
        db: {
          schema: schema
        }
      }
    );
  }
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