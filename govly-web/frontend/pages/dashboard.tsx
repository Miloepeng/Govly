import { useState } from 'react';
import { useRouter } from 'next/router';
import { Home, Building2, Heart, GraduationCap, Car, Users } from 'lucide-react';

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
          ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg cursor-pointer'
          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-75'
      }`}
      onClick={isAvailable ? onClick : undefined}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isAvailable ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
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

export default function Dashboard() {
  const router = useRouter();

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
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
              <button
                onClick={() => router.push('/status')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                View Applications
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Choose a Service Category
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the category that best matches your needs. Our AI assistant will help you with forms, 
            applications, and information specific to your chosen service area.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How it works
            </h3>
            <p className="text-blue-800">
              Once you select a category, you'll be connected to our AI assistant that specializes in that area. 
              You can ask questions, get help filling out forms, and receive personalized guidance for your specific needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
