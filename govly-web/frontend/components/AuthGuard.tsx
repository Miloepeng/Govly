import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If not loading and no user, redirect to login
      if (!user && router.pathname !== '/login' && router.pathname !== '/signup') {
        router.replace('/login');
      }
      // If user exists and on auth pages, redirect to dashboard
      else if (user && (router.pathname === '/login' || router.pathname === '/signup')) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router.pathname]);

  // Show nothing while loading or redirecting
  if (loading || (!user && router.pathname !== '/login' && router.pathname !== '/signup')) {
    return null;
  }

  return <>{children}</>;
}
