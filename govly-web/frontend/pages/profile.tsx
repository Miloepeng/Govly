import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

interface FormState {
  full_name: string;
  email: string;
  phone_number: string;
  id_number: string;
  address: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  occupation: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: user?.email || '',
    phone_number: '',
    id_number: '',
    address: '',
    date_of_birth: '',
    gender: '',
    nationality: 'Vietnamese',
    occupation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;

      const supabase = getSupabase();
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('Error fetching profile:', error);
        return;
      }

      console.log('Profile data fetched:', data);
      
      if (data) {
        setForm({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          phone_number: data.phone_number || '',
          id_number: data.id_number || '',
          address: data.address || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          nationality: data.nationality || 'Vietnamese',
          occupation: data.occupation || ''
        });
      }
    }

    fetchProfile();
  }, [user]);

  function handleChange<K extends keyof FormState>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Form submitted:', form);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <div className="text-gray-600">Please sign in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <div className="border-b border-red-100 bg-white/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your personal information for a smoother experience</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white/90 rounded-2xl border border-gray-200 shadow-sm p-6">
          {message && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <p className="text-sm text-gray-600">Basic details about you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="Enter your email"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={e => handleChange('phone_number', e.target.value)}
                placeholder="Enter your phone number"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ID Number</label>
              <input
                type="text"
                value={form.id_number}
                onChange={e => handleChange('id_number', e.target.value)}
                placeholder="Enter your ID number"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-8 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Enter your address"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => handleChange('date_of_birth', e.target.value)}
                placeholder="dd/mm/yyyy"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                value={form.gender}
                onChange={e => handleChange('gender', e.target.value)}
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <input
                type="text"
                value={form.nationality}
                onChange={e => handleChange('nationality', e.target.value)}
                placeholder="Vietnamese"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Occupation</label>
              <input
                type="text"
                value={form.occupation}
                onChange={e => handleChange('occupation', e.target.value)}
                placeholder="Enter your occupation"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a href="/" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50">Cancel</a>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-white bg-red-600 hover:bg-red-700"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


