import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import GoogleCalendarButton from './GoogleCalendarButton';

export default function CanvasUrlPrompt() {
  const navigate = useNavigate();

  const handleGoogleSuccess = async (token: string) => {
    // Store the token if needed
    navigate('/');
  };

  const handleGoogleError = (error: Error) => {
    console.error('Google Calendar error:', error);
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Calendar className="h-12 w-12 text-emerald-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Connect Your Calendar
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sync with Google Calendar to manage your schedule effectively
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="flex justify-center">
              <GoogleCalendarButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}