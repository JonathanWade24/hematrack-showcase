'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  } catch (error) {
    console.error('Error signing out:', error)
    // Still redirect to login even if there was an error
    redirect('/login')
  }
} 