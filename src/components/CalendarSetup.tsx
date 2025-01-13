import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { CalendarService } from '../services/calendar';
import { useAuth } from '../context/AuthContext';

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  description?: string;
  backgroundColor?: string;
}

interface CalendarSetupProps {
  token: string;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export default function CalendarSetup({ token, onComplete, onError }: CalendarSetupProps) {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCalendars = async () => {
      if (!token) {
        setError('Invalid access token');
        onError(new Error('Invalid access token'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const calendarList = await CalendarService.listCalendars(token);
        setCalendars(calendarList);
        
        const primaryCalendar = calendarList.find(cal => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendars([primaryCalendar.id]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendars';
        setError(errorMessage);
        onError(new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    fetchCalendars();
  }, [token, onError]);

  const handleSave = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }
    
    if (selectedCalendars.length === 0) {
      setError('Please select at least one calendar');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await CalendarService.saveCalendarPreferences(user.id, {
        token,
        selectedCalendars
      });
      onComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save calendar preferences';
      setError(errorMessage);
      onError(new Error(errorMessage));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading calendars...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Choose Calendars to Import
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select which calendars you want to sync with Matcha
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {calendars.map((calendar) => (
          <label
            key={calendar.id}
            className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedCalendars.includes(calendar.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedCalendars([...selectedCalendars, calendar.id]);
                } else {
                  setSelectedCalendars(selectedCalendars.filter(id => id !== calendar.id));
                }
              }}
              className="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div className="ml-3 flex-1">
              <span className="text-gray-900 dark:text-white font-medium">
                {calendar.summary}
              </span>
              {calendar.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {calendar.description}
                </p>
              )}
              {calendar.primary && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  Primary
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={selectedCalendars.length === 0 || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
            selectedCalendars.length === 0 || saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
