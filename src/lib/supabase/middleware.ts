import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function createClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response: supabaseResponse }
}

// Modified: Simpler role check that avoids SQL functions that might cause stack depth issues
export async function checkUserRole(request: NextRequest, requiredRoles: string[]) {
  try {
    const { supabase } = createClient(request)
    
    // Get user directly to extract role from app_metadata
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error checking user:', error)
      return false
    }
    
    if (!user) {
      return false
    }
    
    // Extract role directly from app_metadata
    const userRole = user.app_metadata?.role
    
    // Simple role check
    return userRole && requiredRoles.includes(userRole)
  } catch (error) {
    console.error('Error in checkUserRole:', error)
    return false
  }
}

// Define the mapping of routes to required roles
export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/': ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'],
  '/visits': ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'clinical_data_entry'],
  '/clinical': ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'clinical_data_entry'],
  '/admin': ['admin'],
}

// Helper to check access for a specific path
export function getRequiredRolesForPath(path: string): string[] | null {
  // Check exact matches first
  if (path in ROUTE_ROLE_MAP) {
    return ROUTE_ROLE_MAP[path]
  }
  
  // Check for paths that start with a specific route
  for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    // Skip the root route for this check
    if (route === '/') continue
    
    if (path.startsWith(route + '/')) {
      return roles
    }
  }
  
  // Default to null if no matching route is found
  return null
} 