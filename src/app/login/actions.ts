'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirect') as string || '/'
  
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }
  
  const supabase = await createClient()
  
  if (!supabase) {
    console.error('[login action] Supabase client not available.');
    return { error: 'Authentication service is currently unavailable. Please try again later.' };
  }
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('Login error:', error.message)
    return { error: error.message };
  }
  
  // Ensure the cache is invalidated before redirect
  revalidatePath('/', 'layout')
  
  // Successful login - redirect occurs on client side based on lack of error
  const targetUrl = redirectTo && redirectTo !== '/login' ? redirectTo : '/'
  // Return success state or redirect URL instead of directly redirecting from action
  return { success: true, redirectUrl: targetUrl };
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }
  
  const supabase = await createClient()
  
  if (!supabase) {
    console.error('[signup action] Supabase client not available.');
    return { error: 'Signup service is currently unavailable. Please try again later.' };
  }
  
  // Check if NEXT_PUBLIC_SITE_URL is set, provide default if not
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })
  
  if (error) {
    console.error('Signup error:', error.message)
    return { error: error.message };
  }
  
  // Ensure cache is invalidated before redirect
  revalidatePath('/login', 'page')
  
  // Return success state with message instead of redirecting
  return { success: true, message: 'Check your email to confirm your sign up' };
} 