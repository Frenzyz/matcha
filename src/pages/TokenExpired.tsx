import React from 'react';
    import { Link } from 'react-router-dom';
    import { Leaf, AlertTriangle } from 'lucide-react';

    export default function TokenExpired() {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="text-red-600" size={48} />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Token Expired
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your password reset link has expired. Please request a new one.
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Request New Link
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }
