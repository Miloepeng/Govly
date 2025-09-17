import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Home, Building2, Heart, GraduationCap, Car, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DashboardHeader from '../components/DashboardHeader';
import { ApplicationService } from '../lib/applicationService';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isAvailable: boolean;
  category: string;
  onClick?: () => void;
}

function CategoryCard({ title, description, icon, isAvailable, category, onClick }: CategoryCardProps) {
  return (
    <div
      className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
        isAvailable
          ? 'bg-white border-gray-200 hover:border-red-300 hover:shadow-lg cursor-pointer'
          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-75'
      }`}
      onClick={isAvailable ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isAvailable ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isAvailable ? 'text-gray-900' : 'text-gray-500'}`}>
            {title}
          </h3>
          <p className={`text-sm ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
            {description}
          </p>
        </div>
      </div>
      
      {!isAvailable && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            Coming Soon
          </span>
        </div>
      )}
    </div>
  );
}

interface ApplicationData {
  id: string;
  formTitle: string;
  dateApplied: string;
  status: 'applied' | 'reviewed' | 'confirmed' | 'draft';
  lastSaved?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  // Fetch applications data
  useEffect(() => {
    const loadApplications = async () => {
      if (!user) {
        setApplicationsLoading(false);
        return;
      }

      try {
        const { data, error } = await ApplicationService.getUserApplications(user.id);
        if (error) {
          console.error('Error loading applications:', error);
          setApplications([]);
        } else {
          setApplications(data || []);
        }
      } catch (error) {
        console.error('Error loading applications:', error);
        setApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    };

    loadApplications();
  }, [user]);

  // Calculate application stats
  const getApplicationStats = () => {
    const total = applications.length;
    const pending = applications.filter(app => app.status === 'applied').length;
    const lastUpdated = applications.length > 0 
      ? new Date(Math.max(...applications.map(app => new Date(app.lastSaved || app.dateApplied).getTime())))
      : null;
    
    return {
      total,
      pending,
      lastUpdated: lastUpdated ? lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'
    };
  };

  // Get recent applications (last 3)
  const getRecentApplications = () => {
    return applications
      .sort((a, b) => new Date(b.lastSaved || b.dateApplied).getTime() - new Date(a.lastSaved || a.dateApplied).getTime())
      .slice(0, 3);
  };

  const stats = getApplicationStats();
  const recentApplications = getRecentApplications();

  // Show loading skeleton while auth state is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    {
      title: 'Housing',
      description: 'Get help with housing applications, permits, and regulations',
      icon: <Home className="w-6 h-6" />,
      isAvailable: true,
      category: 'housing'
    },
    {
      title: 'Business',
      description: 'Business registration, licenses, and compliance assistance',
      icon: <Building2 className="w-6 h-6" />,
      isAvailable: true,
      category: 'business'
    },
    {
      title: 'Healthcare',
      description: 'Health services, insurance, and medical assistance',
      icon: <Heart className="w-6 h-6" />,
      isAvailable: false,
      category: 'healthcare'
    },
    {
      title: 'Education',
      description: 'School enrollment, scholarships, and educational programs',
      icon: <GraduationCap className="w-6 h-6" />,
      isAvailable: false,
      category: 'education'
    },
    {
      title: 'Transport',
      description: 'Driver licenses, vehicle registration, and transportation services',
      icon: <Car className="w-6 h-6" />,
      isAvailable: false,
      category: 'transport'
    },
    {
      title: 'Social Services',
      description: 'Social benefits, welfare, and community support services',
      icon: <Users className="w-6 h-6" />,
      isAvailable: false,
      category: 'social_services'
    }
  ];

  const handleCategoryClick = (category: string) => {
    router.push(`/?category=${category}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex flex-col">
      <DashboardHeader />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Chat with Govly AI
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm">
            Ask questions, find relevant documents, and let us help you complete the right forms.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.category}
              title={category.title}
              description={category.description}
              icon={category.icon}
              isAvailable={category.isAvailable}
              category={category.category}
              onClick={() => handleCategoryClick(category.category)}
            />
          ))}
        </div>

        {/* Secondary actions - Emphasized layout */}
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Applications - Tall vertical rectangle with recent items and stats */}
            <button
              onClick={() => router.push('/status')}
              className="relative col-span-1 md:col-span-2 lg:col-span-2 md:row-span-2 p-6 rounded-xl border-2 bg-white border-gray-200 hover:border-red-300 hover:shadow-lg transition-colors text-left"
              style={{ minHeight: '18rem' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6M5 7h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Applications</div>
                    <div className="text-xs text-gray-600">Recent activity & stats</div>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Live</span>
              </div>

              {/* Recent Applications - dynamic */}
              <div className="space-y-3">
                {applicationsLoading ? (
                  // Loading skeleton
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                    </div>
                  ))
                ) : recentApplications.length > 0 ? (
                  recentApplications.map((app) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'draft': return 'bg-gray-100 text-gray-700';
                        case 'applied': return 'bg-yellow-100 text-yellow-700';
                        case 'reviewed': return 'bg-blue-100 text-blue-700';
                        case 'confirmed': return 'bg-green-100 text-green-700';
                        default: return 'bg-gray-100 text-gray-700';
                      }
                    };
                    
                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'draft': return 'Draft';
                        case 'applied': return 'Pending';
                        case 'reviewed': return 'In Review';
                        case 'confirmed': return 'Approved';
                        default: return status;
                      }
                    };

                    const lastUpdate = new Date(app.lastSaved || app.dateApplied);
                    const isToday = lastUpdate.toDateString() === new Date().toDateString();
                    const dateText = isToday 
                      ? 'Today' 
                      : lastUpdate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    return (
                      <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{app.formTitle}</div>
                          <div className="text-xs text-gray-500">Updated • {dateText}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No applications yet. Start by chatting with Govly AI!
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-gray-100 bg-white text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {applicationsLoading ? (
                      <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.total
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="p-3 rounded-lg border border-gray-100 bg-white text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {applicationsLoading ? (
                      <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.pending
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="p-3 rounded-lg border border-gray-100 bg-white text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {applicationsLoading ? (
                      <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.lastUpdated
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Last Update</div>
                </div>
              </div>
            </button>

            {/* Scan your form - square */}
            <button
              onClick={() => router.push('/scan')}
              className="relative p-6 rounded-xl border-2 bg-white border-gray-200 hover:border-red-300 hover:shadow-lg transition-colors text-center flex flex-col justify-center items-center"
              style={{ aspectRatio: '1 / 1' }}
            >
              <div className="w-16 h-16 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M7 12h10M7 9h10M7 15h6" />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">Scan your form</div>
              <div className="text-xs text-gray-600 mb-2">Auto-extract details</div>
              <div className="text-xs text-gray-500">Camera + PDF supported</div>
            </button>

            {/* View all documents - square */}
            <button
              onClick={() => router.push('/documents')}
              className="relative p-6 rounded-xl border-2 bg-white border-gray-200 hover:border-red-300 hover:shadow-lg transition-colors text-center flex flex-col justify-center items-center"
              style={{ aspectRatio: '1 / 1' }}
            >
              <div className="w-16 h-16 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M8 10h8M8 14h5M4 7a2 2 0 012-2h1m10 0h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">View all documents</div>
              <div className="text-xs text-gray-600 mb-2">Browse with AI summaries</div>
              <div className="text-xs text-gray-500">Policies, guides, requirements</div>
            </button>

            {/* Profile settings - smaller */}
            <button
              onClick={() => router.push('/profile')}
              className="p-4 rounded-xl border-2 bg-white border-gray-200 hover:border-red-300 hover:shadow-lg transition-colors text-left flex items-center gap-3 h-24"
            >
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Profile settings</div>
                <div className="text-xs text-gray-600">Personal information</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
