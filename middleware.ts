import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

// Define protected routes and required roles
const PROTECTED_ROUTES = [
  { path: '/', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'] },
  { path: '/admin', roles: ['admin'] },
  { path: '/patients', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked'] },
  { path: '/visits', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked'] },
  { path: '/data-entry', roles: ['admin', 'clinical_data_entry'] },
  { path: '/subjects', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher'] },
  { path: '/laboratory', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher'] }
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/confirm', '/auth/error', '/api/auth/webhook', '/role-debug', '/api/user-info'];

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
  
  // Create Supabase client
  const { supabase, response } = createClient(request);
  
  // Get current user and session
  const { data: { user } } = await supabase.auth.getUser();
  
  // If no user and not on a public route, redirect to login
  if (!user) {
    // Create redirect URL with original path as a redirect parameter
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', path);
    
    // Use temporary redirect to prevent caching issues
    return NextResponse.redirect(redirectUrl);
  }
  
  // Get user role from JWT claims
  const role = user.app_metadata?.role;
  
  // Add debug logging
  console.log('User role check:', {
    path,
    userRole: role,
    userId: user.id,
    userEmail: user.email,
    metadata: user.app_metadata,
  });
  
  // Find the most specific matching route
  // Sort routes by length (longest/most specific first) to ensure we match the most specific route
  const routes = [...PROTECTED_ROUTES].sort((a, b) => b.path.length - a.path.length);
  
  // Find the first route that matches the current path
  const matchedRoute = routes.find(route => {
    // Exact match or path with trailing slash
    if (path === route.path || path === `${route.path}/`) return true;
    
    // Check if it's a subpath (must match complete segments)
    if (path.startsWith(`${route.path}/`)) return true;
    
    return false;
  });
  
  if (matchedRoute) {
    // Log the route match for debugging
    console.log('Route match:', {
      routePath: matchedRoute.path,
      allowedRoles: matchedRoute.roles,
      userHasAccess: role && matchedRoute.roles.includes(role)
    });
    
    if (!role || !matchedRoute.roles.includes(role)) {
      // User doesn't have required role for this route
      console.log('Access denied, redirecting to /access-denied');
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  } else {
    // No specific route matched, use home route as default for the check
    const homeRoute = PROTECTED_ROUTES.find(r => r.path === '/');
    if (homeRoute && (!role || !homeRoute.roles.includes(role))) {
      console.log('Access denied (default route), redirecting to /access-denied');
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }
  
  // User is authenticated and authorized for this route
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 