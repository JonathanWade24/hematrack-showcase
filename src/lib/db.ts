import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export function getSupabaseClient() {
  const cookieStore = cookies()
  return createClient(cookieStore)
} 