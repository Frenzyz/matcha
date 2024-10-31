import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={16} />
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left w-full">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                Error details
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto text-xs text-gray-800">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}