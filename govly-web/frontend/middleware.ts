import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  );

  // Get the auth token from the cookie
  const accessToken = req.cookies.get('sb-access-token')?.value;
  const refreshToken = req.cookies.get('sb-refresh-token')?.value;

  let session = null;
  if (accessToken && refreshToken) {
    try {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user) {
        session = { user };
      } else {
        // Try to refresh the session
        const { data: { session: newSession } } = await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });
        session = newSession;
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  }

  // Get the pathname
  const path = req.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup'];
  
  // Root path should redirect to dashboard if authenticated, login if not
  if (path === '/') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = session ? '/dashboard' : '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is not signed in and trying to access a protected route
  if (!session && !publicPaths.includes(path)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If user is signed in and tries to access auth pages
  if (session && publicPaths.includes(path)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}