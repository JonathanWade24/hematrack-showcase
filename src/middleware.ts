import { withAuth, NextRequestWithAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ['/login', '/signup', '/access-denied'] // Add any other public paths

export default withAuth(
  // This function runs *only* if the user is considered authorized by the `callbacks.authorized` logic below
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Redirect logged-in users away from public auth pages
    if (token && PUBLIC_PATHS.includes(path)) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Role-based access control for protected routes
    if (!PUBLIC_PATHS.includes(path) && path.startsWith('/')) { // Check non-public paths
      if (path.startsWith('/dashboard') || path.startsWith('/data-entry')) {
        // Example: Require 'admin' or 'editor' role
        if (!token?.role || !['admin', 'editor'].includes(token.role as string)) {
           console.log(`[Middleware] Access denied for role '${token?.role}' to path '${path}'`);
           return NextResponse.redirect(new URL('/access-denied', req.url))
        }
      }
      // Add checks for other protected paths/roles as needed
    }

    // Allow the request to proceed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname

        // 1. User is logged in (token exists) - AUTHORIZED
        if (token) {
          return true
        }

        // 2. User is NOT logged in, accessing a PUBLIC path - AUTHORIZED (to view the public page)
        if (!token && PUBLIC_PATHS.includes(path)) {
          return true
        }

        // 3. User is NOT logged in, accessing a PROTECTED path - NOT AUTHORIZED (redirect handled by withAuth)
        return false
      },
    },
  }
)

// Apply middleware to all paths except static files and internal Next.js paths
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*) ',
  ],
} 