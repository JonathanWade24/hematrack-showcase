'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  try {
    const supabase = await createClient()
    
    // Handle missing client
    if (!supabase) {
      console.warn('[logout action] Supabase client not available. Cannot perform backend signout, but redirecting anyway.');
    } else {
      // Attempt sign out only if client exists
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error('Error during Supabase signOut:', error);
          // Decide if we should still redirect or handle differently
          // For now, we still redirect below
      }
    }
    
  } catch (error) {
    console.error('Error in logout action:', error)
    // Log error but proceed with redirect
  } finally {
    // Ensure redirect happens even if signOut fails or client is null
    redirect('/login')
  }
} 