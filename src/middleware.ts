import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

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

// Protect these paths with authentication and exclude static files
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/data-entry/:path*',
    '/login',
    '/signup',
    
    // Match all other paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
} 