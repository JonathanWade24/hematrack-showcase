import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// import { updateSession } from '@/utils/supabase/middleware'
// import { createClient } from '@/lib/supabase/middleware'

export default withAuth(
  function middleware(req) {
    // Get the pathname
    const path = req.nextUrl.pathname

    // Get the token from the session
    const token = req.nextauth.token

    // Auth pages redirect for logged in users
    if (token && (path.startsWith('/login') || path.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Protected routes
    if (path.startsWith('/dashboard') || path.startsWith('/data-entry')) {
      // Check role-based access
      if (!token?.role || token.role === 'user') {
        return NextResponse.redirect(new URL('/access-denied', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

// Protect these paths with authentication
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/data-entry/:path*',
    '/login',
    '/signup',
  ]
}

// --- Original Supabase Logic (Removed) ---
// const { supabase, response } = createClient(request)
// 
// try {
//   // Refresh session if expired - required for Server Components
//   // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
//   const { data: { session } } = await supabase.auth.getSession()
//   
//   console.log('[Middleware] Session:', session ? 'Exists' : 'None')
//   
//   const pathname = request.nextUrl.pathname
//   
//   // Redirect logged-in users from auth pages to home
//   if (session && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
//     console.log('[Middleware] Redirecting logged-in user from auth page')
//     return NextResponse.redirect(new URL('/', request.url))
//   }
//   
//   // Protect specific routes (example)
//   if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/data-entry'))) {
//     console.log('[Middleware] Redirecting unauthenticated user from protected route')
//     return NextResponse.redirect(new URL('/login', request.url))
//   }
//   
//   // Optionally update the session cookie
//   // await updateSession(request)
// } catch (e) {
//   // Log errors but allow request to proceed to avoid blocking UI on auth errors
//   console.error('[Middleware] Error:', e instanceof Error ? e.message : String(e))
//   // return NextResponse.next({
//   //   request: {
//   //     headers: request.headers,
//   //   },
//   // })
// }
// 
// return response
// --- End Original Supabase Logic ---

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*) ',
  ],
} 