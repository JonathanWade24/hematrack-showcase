import { NextResponse, type NextRequest } from 'next/server';
import { createClient, checkUserRole, getRequiredRolesForPath } from '@/lib/supabase/middleware';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/confirm', '/auth/error', '/api/auth/webhook', '/access-denied'];

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and public routes
  const path = request.nextUrl.pathname;
  
  if (
    path.startsWith('/_next') || 
    path.includes('.') ||
    PUBLIC_ROUTES.some(route => path.startsWith(route))
  ) {
    return NextResponse.next();
  }
  
  try {
    // Get Supabase client
    const { supabase, response } = createClient(request);
    
    // Try to get the user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Not authenticated, redirect to login
      console.log(`User not authenticated. Redirecting to login from ${path}`);
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Add verbose logging
    console.log(`User role check:`, {
      path,
      userRole: user.app_metadata?.role,
      userId: user.id,
      userEmail: user.email,
      metadata: user.app_metadata
    });
    
    // Check if this path requires specific roles
    const requiredRoles = getRequiredRolesForPath(path);
    
    if (requiredRoles) {
      // This path has role restrictions
      const hasAccess = await checkUserRole(request, requiredRoles);
      
      // Log the role check results
      console.log(`Route match:`, {
        routePath: path,
        allowedRoles: requiredRoles,
        userHasAccess: hasAccess
      });
      
      if (!hasAccess) {
        // User doesn't have the required role
        console.log(`Access denied, redirecting to /access-denied`);
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    } else {
      console.log(`No role restrictions for path: ${path}`);
    }
    
    // User is authenticated and authorized
    return response;
  } catch (error) {
    console.error(`Middleware error:`, error);
    // In case of error, redirect to error page
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 