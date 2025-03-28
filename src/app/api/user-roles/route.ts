import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  raw_app_meta_data?: {
    role?: string;
  };
}

interface RoleAssignment {
  user_id: string;
  role_id: string;
}

interface Role {
  id: string;
  name: string;
}

// GET all users with their roles
export async function GET() {
  try {
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
            }
          },
        },
      }
    )
    
    // Check if requester has admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    // Since we can't use schema(), we have to use RPC to get users
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_all_users')
    
    if (authError) {
      console.error('Error fetching users:', authError)
      return NextResponse.json(
        { error: 'Error fetching users' },
        { status: 500 }
      )
    }
    
    // Get all role assignments
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select('user_id, role_id')
    
    if (rolesError) {
      console.error('Error fetching role assignments:', rolesError)
      return NextResponse.json(
        { error: 'Error fetching role assignments' },
        { status: 500 }
      )
    }
    
    // Get role definitions
    const { data: roles, error: rolesDefError } = await supabase
      .from('user_roles')
      .select('id, name')
    
    if (rolesDefError) {
      console.error('Error fetching roles:', rolesDefError)
      return NextResponse.json(
        { error: 'Error fetching roles' },
        { status: 500 }
      )
    }
    
    // Combine user data with role assignments
    const users = authUsers?.map((user: AuthUser) => {
      const roleAssignment = roleAssignments?.find((ra: RoleAssignment) => ra.user_id === user.id)
      const roleName = roleAssignment 
        ? roles?.find((r: Role) => r.id === roleAssignment.role_id)?.name
        : null
      
      return {
        id: user.id,
        email: user.email,
        role: user.raw_app_meta_data?.role || roleName || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      }
    }) || [];
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in GET /api/user-roles:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST to update a user's role
export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()
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
    
    // Check if requester has admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    // Validate input
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and role' },
        { status: 400 }
      )
    }
    
    // Valid roles
    const validRoles = [
      'admin', 
      'clinical_researcher_full', 
      'clinical_researcher_masked', 
      'non_clinical_researcher', 
      'clinical_data_entry'
    ]
    
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }
    
    // Get the role ID from the role name
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', role)
      .single()
    
    if (roleError) {
      console.error('Error getting role ID:', roleError)
      return NextResponse.json(
        { error: 'Error retrieving role information' },
        { status: 500 }
      )
    }
    
    // First update metadata using a direct update to auth.users
    const { error: metadataError } = await supabase
      .rpc('admin_update_user_metadata', {
        target_user_id: userId,
        role_value: role
      })
    
    if (metadataError) {
      console.error('Error updating user metadata:', metadataError)
      return NextResponse.json(
        { error: 'Error updating user metadata: ' + metadataError.message },
        { status: 500 }
      )
    }
    
    // First remove any existing role assignments for this user
    const { error: deleteError } = await supabase
      .from('user_role_assignments')
      .delete()
      .eq('user_id', userId)
    
    if (deleteError) {
      console.error('Error removing existing role assignments:', deleteError)
      return NextResponse.json(
        { error: 'Error updating role in database' },
        { status: 500 }
      )
    }
    
    // Then insert the new role assignment
    const { error: insertError } = await supabase
      .from('user_role_assignments')
      .insert({
        user_id: userId,
        role_id: roleData.id,
      })
    
    if (insertError) {
      console.error('Error updating role assignment:', insertError)
      return NextResponse.json(
        { error: 'Error updating role in database' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${role}`
    })
  } catch (error) {
    console.error('Error in POST /api/user-roles:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 