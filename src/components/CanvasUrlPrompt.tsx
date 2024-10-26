import React, { useState } from 'react';
import { Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../hooks/useConnection';
import { supabase } from '../config/supabase';

export default function CanvasUrlPrompt() {
  const [calendarUrl, setCalendarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useConnection();

  const validateUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'uncc.instructure.com' && 
             parsedUrl.pathname.includes('/feeds/calendars');
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isOnline) {
      setError('You are offline. Please connect to the internet to save your calendar URL.');
      return;
    }

    if (!validateUrl(calendarUrl)) {
      setError('Please enter a valid UNCC Canvas calendar URL');
      return;
    }

    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      setLoading(true);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          canvas_calendar_url: calendarUrl,
          setup_completed: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      navigate('/');
    } catch (err) {
      console.error('Error saving calendar URL:', err);
      setError(err instanceof Error 
        ? err.message 
        : 'Failed to save calendar URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          One Last Step
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connect your Canvas calendar to see all your assignments
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="calendar-url" className="block text-sm font-medium text-gray-700">
                Canvas Calendar URL
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="calendar-url"
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://uncc.instructure.com/feeds/calendars/..."
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Find this in Canvas under Calendar &gt; Calendar Feed
              </p>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between space-x-4">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading || !isOnline}
                className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                  (loading || !isOnline) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}