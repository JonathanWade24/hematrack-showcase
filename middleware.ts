import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

// Define protected routes and required roles
const PROTECTED_ROUTES = [
  { path: '/', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'] },
  { path: '/admin', roles: ['admin'] },
  { path: '/dashboard', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry'] },
  { path: '/data-entry', roles: ['admin', 'clinical_data_entry'] },
  { path: '/clinical', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'clinical_data_entry'] },
  { path: '/laboratory', roles: ['admin', 'clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher'] }
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/confirm', '/auth/error', '/api/auth/webhook'];

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
  
  const { supabase, response } = createClient(request);
  
  // Get current user and session
  const { data: { user } } = await supabase.auth.getUser();
  
  // If no user and not on a public route, redirect to login
  if (!user) {
    const redirectUrl = new URL('/login', request.url);
    // Save the original URL to redirect back after login
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Get user role from JWT claims (added by our custom hook)
  const role = user.app_metadata?.role;
  
  // Check route access based on role
  for (const route of PROTECTED_ROUTES) {
    if (path.startsWith(route.path)) {
      if (!role || !route.roles.includes(role)) {
        // User doesn't have required role for this route
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
      break;
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