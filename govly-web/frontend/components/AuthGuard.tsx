import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Public pages that don't require authentication
  const publicPages = ['/login', '/signup'];
  const isPublicPage = publicPages.includes(router.pathname);

  useEffect(() => {
    if (!loading) {
      // If not loading and no user, redirect to login (except for public pages)
      if (!user && !isPublicPage) {
        router.replace('/login');
      }
      // If user exists and on auth pages, redirect to dashboard
      else if (user && (router.pathname === '/login' || router.pathname === '/signup')) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router.pathname, isPublicPage]);

  // Show nothing while loading or redirecting (except for public pages)
  if (loading || (!user && !isPublicPage)) {
    return null;
  }

  return <>{children}</>;
}
