import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn('[GET /api/user-info] Supabase client not available.');
        return NextResponse.json(
            { error: 'User information service unavailable' },
            { status: 503 } // Service Unavailable
        );
    }
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Return user information with role data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_sign_in_at: user.last_sign_in_at,
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error fetching user info' },
      { status: 500 }
    );
  }
} 