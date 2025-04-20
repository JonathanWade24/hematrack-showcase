import { type NextRequest, NextResponse } from 'next/server'

// import { updateSession } from '@/utils/supabase/middleware'
// import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // console.log('[Middleware] Path:', request.nextUrl.pathname)
  
  // Simplification: Allow all requests for now. 
  // TODO: Implement new authentication/authorization checks later.
  return NextResponse.next();

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*) ',
  ],
} 