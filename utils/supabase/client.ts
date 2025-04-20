// import { createBrowserClient } from "@supabase/ssr";

/**
 * @deprecated Supabase client is being removed. This function should no longer be used.
 */
export const createClient = () => {
  console.error("DEPRECATED: Attempted to call createClient from utils/supabase/client.ts");
  return null;
}; 