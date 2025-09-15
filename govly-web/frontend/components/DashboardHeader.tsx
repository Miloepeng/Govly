import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserProfile from './UserProfile';

export default function DashboardHeader() {
  const { user, profile, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showUserProfile, setShowUserProfile] = useState(false);

  return (
    <>
      <div className="bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Govly</h1>
                <p className="text-sm text-gray-600">Government Services Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Loading...
                </div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-semibold">
                      {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.full_name || user.email}
                    </p>
                  </button>
                  
                  <button
                    onClick={signOut}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfile
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </>
  );
}
