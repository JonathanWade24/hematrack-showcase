import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function createClient(request: NextRequest) {
  // Create an initial response to modify
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
          // First set the cookies on the request
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // Then create a fresh response with the updated request
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // Finally set the cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
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
  '/data-entry': ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'],
  '/admin': ['admin'],
}

// Helper to check access for a specific path
export function getRequiredRolesForPath(path: string): string[] | null {
  console.log(`Checking access for path: ${path}`);

  // Check exact matches first
  if (path in ROUTE_ROLE_MAP) {
    console.log(`Exact match found for: ${path}`, ROUTE_ROLE_MAP[path]);
    return ROUTE_ROLE_MAP[path];
  }
  
  // Check for paths that start with a specific route
  for (const [route, roles] of Object.entries(ROUTE_ROLE_MAP)) {
    // Skip the root route for this check
    if (route === '/') continue;
    
    if (path.startsWith(route + '/')) {
      console.log(`Path match found: ${path} starts with ${route}`, roles);
      return roles;
    }
  }
  
  // Default to null if no matching route is found
  console.log(`No route match found for: ${path}`);
  return null;
} 