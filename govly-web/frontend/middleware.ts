import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Get the auth token from the cookie
  const accessToken = req.cookies.get('sb-access-token')?.value;
  
  // Get the pathname
  const path = req.nextUrl.pathname;
  
  // Redirect root to login if no category query param (since chat lives at /?category=X)
  if (path === '/' && !req.nextUrl.searchParams.has('category')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup'];
  
  // If no token and trying to access protected route, redirect to login
  if (!accessToken && !publicPaths.includes(path)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If has token and trying to access auth pages, redirect to dashboard
  if (accessToken && publicPaths.includes(path)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard',
    '/chat/:path*',
    '/documents/:path*',
    '/scan',
    '/status',
    '/profile'
  ]
}