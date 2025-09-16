'use client';

import { useEffect, useState } from 'react';

export default function EnvTestPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Only collect NEXT_PUBLIC_ variables
    const publicEnvVars = {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'Not set',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden for security)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };
    
    setEnvVars(publicEnvVars);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Note: Only NEXT_PUBLIC_ variables are accessible in the browser.
      </p>
    </div>
  );
}
