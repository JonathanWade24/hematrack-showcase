'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('Login error:', error.message)
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }
  
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm`,
    },
  })
  
  if (error) {
    console.error('Signup error:', error.message)
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }
  
  return redirect('/login?message=Check your email to confirm your sign up')
} 