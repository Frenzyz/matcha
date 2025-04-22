import React from 'react';
import { Link } from 'react-router-dom';
import SupabaseDebug from '../components/SupabaseDebug';
import { useAuth } from '../context/AuthContext';

export default function DebugPage() {
  const { user, session, isAuthenticated } = useAuth();

  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Debug Page Not Available</h1>
          <p className="text-gray-700 mb-4">
            The debug page is only available in development mode for security reasons.
          </p>
          <Link
            to="/"
            className="block w-full text-center py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Supabase Authentication Debug</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className="p-2 bg-gray-50 rounded">
              <p className="font-medium">Authenticated: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>{isAuthenticated ? 'Yes' : 'No'}</span></p>
            </div>
            
            {isAuthenticated && (
              <div className="p-4 bg-gray-50 rounded overflow-auto">
                <h3 className="text-md font-medium mb-2">User Information</h3>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(user, null, 2)}
                </pre>
                
                <h3 className="text-md font-medium mt-4 mb-2">Session Information</h3>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="block py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Go to Login
            </Link>
            <Link
              to="/signup"
              className="block py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Go to Signup
            </Link>
            <Link
              to="/"
              className="block py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Return to Home
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration Details</h2>
          <div className="p-2 bg-gray-50 rounded mb-4">
            <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}</p>
            <p><strong>Anon Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing'}</p>
            <p><strong>Environment:</strong> {import.meta.env.DEV ? 'Development' : 'Production'}</p>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Use the debug component below to create a test user if you're having trouble logging in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* The SupabaseDebug component will appear at the bottom-right corner */}
      <SupabaseDebug />
    </div>
  );
} 