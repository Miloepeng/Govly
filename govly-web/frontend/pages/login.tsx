import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  // Force logout if needed
  const forceLogout = async () => {
    await signOut();
    window.location.href = '/login'; // Hard refresh to clear everything
  };

  // Handle initial redirect only once
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (!mounted) return;
      
      if (user && !isLoading) {
        console.log('Checking auth state...');
        try {
          await router.replace('/dashboard');
        } catch (err) {
          console.error('Redirect error:', err);
          // If there's an error, force logout
          await forceLogout();
        }
      }
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Create a timeout for the entire login process
    const loginTimeout = setTimeout(() => {
      setError('Login is taking too long. Please try again.');
      setIsLoading(false);
    }, 15000); // 15 second timeout for the entire process

    try {
      console.log('Attempting login...');
      const { error: signInError, session } = await signIn(email, password);
      
      clearTimeout(loginTimeout); // Clear timeout on success

      if (signInError) {
        console.error('Login error:', signInError);
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (!session) {
        console.error('No session received after login');
        setError('Login successful but no session created. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('Login successful with session, redirecting...');
      try {
        // Force a hard navigation to dashboard to ensure fresh state
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Redirect error:', err);
        setError('Failed to redirect after login. Please try again.');
        setIsLoading(false);
      }
      
    } catch (err) {
      clearTimeout(loginTimeout); // Clear timeout on error
      console.error('Unexpected error during login:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding */}
        <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24 bg-gradient-to-br from-red-600 to-red-700 text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-4xl">🇻🇳</span>
              </div>
              <h1 className="text-6xl font-bold tracking-tight">Govly</h1>
            </div>
            
            <h2 className="text-2xl font-medium text-white/90 tracking-wide mb-12">
              Vietnam's AI Government Assistance
            </h2>

            <div className="flex gap-8">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <span className="text-sm text-white/80">Smart reply</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📖</span>
                <span className="text-sm text-white/80">Explain policies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span className="text-sm text-white/80">Fill forms</span>
              </div>
            </div>
          </div>
          
          {/* Background decoration removed */}
        </div>

        {/* Right side - Login form */}
        <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access your AI government assistant
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${
                    isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">New to Govly?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/signup"
                  className="text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}