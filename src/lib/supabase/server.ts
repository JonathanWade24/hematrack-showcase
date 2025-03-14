import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: { expires?: Date; maxAge?: number; domain?: string; path?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean }) {
          try {
            cookieStore.set(name, value, options);
          } catch (_error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: { expires?: Date; maxAge?: number; domain?: string; path?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean }) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (_error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

// For admin operations that require service role
export const createAdminClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get(_name: string) { return undefined; },
        set(_name: string, _value: string, _options: { expires?: Date; maxAge?: number; domain?: string; path?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean }) { /* No-op */ },
        remove(_name: string, _options: { expires?: Date; maxAge?: number; domain?: string; path?: string; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean }) { /* No-op */ }
      }
    }
  );
}; 