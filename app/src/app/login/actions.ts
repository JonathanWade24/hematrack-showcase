'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signIn } from "next-auth/react";

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirect') as string || '/'
  
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }
  
  try {
    console.log(`[Login Action] Attempting signIn for ${email}`);
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    console.log('[Login Action] signIn result:', result);

    if (result?.error) {
      console.error('[Login Action] SignIn Error:', result.error);
      if (result.error === "CredentialsSignin") {
         return { error: "Invalid email or password." };
      }
      return { error: "Login failed. Please try again." };
    }

    const targetUrl = redirectTo && redirectTo !== '/login' ? redirectTo : '/'
    return { success: true, redirectUrl: targetUrl };

  } catch (error) {
      console.error("[Login Action] Unexpected error:", error);
      return { error: "An unexpected error occurred during login." };
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // --- TODO: Implement Signup via API Route --- 
  // 1. Create a new API route (e.g., /api/auth/register)
  // 2. This route will handle:
  //    - Input validation
  //    - Checking if user exists (prisma.user.findUnique)
  //    - Hashing the password (bcryptjs.hash)
  //    - Creating the user (prisma.user.create with hashed password & default role)
  //    - Optionally triggering email verification if needed later.
  // 3. Call that API route from here or (preferably) from the client-side form.

  console.warn("[Signup Action] Signup logic needs to be implemented via /api/auth/register");
  return { error: 'Signup functionality is not yet available.' };

  /* --- Removed Supabase Signup Logic ---
  const supabase = await createClient()
  if (!supabase) {
    console.error('[signup action] Supabase client not available.');
    return { error: 'Signup service is currently unavailable. Please try again later.' };
  }
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
  revalidatePath('/login', 'page')
  return { success: true, message: 'Check your email to confirm your sign up' };
  */
} 