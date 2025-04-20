import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    // Get Supabase client
    const supabase = await createClient()

    // Handle missing client - redirect to error if unavailable
    if (!supabase) {
        console.warn('[GET /auth/confirm] Supabase client not available. Cannot verify OTP.');
        return redirect('/auth/error?reason=service_unavailable');
    }

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // Create a response that redirects to the dashboard
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // redirect the user to an error page with some instructions
  return redirect('/auth/error')
} 