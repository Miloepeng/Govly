import React from 'react';

export default function DebugEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Environment Variables Debug</h1>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Supabase Configuration</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>{' '}
                {supabaseUrl ? (
                  <span className="text-green-600 font-mono">{supabaseUrl}</span>
                ) : (
                  <span className="text-red-600 font-bold">❌ NOT SET</span>
                )}
              </div>
              <div>
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>{' '}
                {supabaseKey ? (
                  <span className="text-green-600 font-mono">
                    ✅ SET (Length: {supabaseKey.length})
                    <br />
                    <span className="text-gray-500">
                      {supabaseKey.substring(0, 20)}...{supabaseKey.substring(supabaseKey.length - 10)}
                    </span>
                  </span>
                ) : (
                  <span className="text-red-600 font-bold">❌ NOT SET</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Client-Side Test</h2>
            <div className="text-sm">
              <p className="mb-2">This page renders both server-side and client-side to test env vars:</p>
              <div className="bg-white p-3 rounded border">
                <div>Build Time (Server): {supabaseUrl ? '✅' : '❌'} Supabase URL available</div>
                <div>Build Time (Server): {supabaseKey ? '✅' : '❌'} Supabase Key available</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">Troubleshooting Steps</h2>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Check if <code className="bg-yellow-200 px-1 rounded">.env</code> file exists in root directory</li>
              <li>Verify NEXT_PUBLIC_ prefix on all frontend environment variables</li>
              <li>Rebuild Docker containers: <code className="bg-yellow-200 px-1 rounded">docker-compose build --no-cache</code></li>
              <li>Restart services: <code className="bg-yellow-200 px-1 rounded">docker-compose down && docker-compose up -d</code></li>
              <li>Check container logs: <code className="bg-yellow-200 px-1 rounded">docker-compose logs frontend -f</code></li>
            </ol>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Access this page at: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000/debug-env</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add client-side rendering test
export async function getServerSideProps() {
  return {
    props: {
      serverSideSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      serverSideSupabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : null,
    },
  };
}