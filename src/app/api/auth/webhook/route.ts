import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const requestBody = await request.json()
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Verify that this is a valid webhook call from Supabase
    // In production, you'd want to validate JWT or a shared secret
    const eventType = requestBody.type
    
    // Handle user creation
    if (eventType === 'INSERT' && requestBody.table === 'auth.users') {
      const user = requestBody.record
      
      // Default role assignment
      const defaultRole = 'non_clinical_researcher'
      
      // Update the user's metadata to include the role
      await supabase.auth.admin.updateUserById(user.id, {
        app_metadata: { role: defaultRole },
      })
      
      // Insert into user_roles table
      await supabase.from('user_roles').insert({
        user_id: user.id,
        role: defaultRole,
        created_at: new Date().toISOString(),
      })
      
      console.log(`Assigned default role '${defaultRole}' to user: ${user.email}`)
    }
    
    // Handle user deletion
    if (eventType === 'DELETE' && requestBody.table === 'auth.users') {
      const user = requestBody.old_record
      
      // Clean up the user_roles entries
      await supabase.from('user_roles').delete().eq('user_id', user.id)
      
      console.log(`Cleaned up role assignments for deleted user: ${user.email}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// The following function handles GET requests to check webhook health
export async function GET() {
  return NextResponse.json({ status: 'Webhook is active' })
} 