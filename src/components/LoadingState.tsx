import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  initProgress: { step: number; message: string } | null;
}

export default function LoadingState({ initProgress }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] p-4">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">Loading AI Assistant</h2>
        {initProgress && (
          <div className="w-full max-w-xs mx-auto">
            <div className="bg-gray-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${initProgress.step}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {initProgress.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}