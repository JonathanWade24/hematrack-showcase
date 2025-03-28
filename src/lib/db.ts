import { createClient } from '@/lib/supabase/server'

export async function getSupabaseClient() {
  return await createClient()
} 