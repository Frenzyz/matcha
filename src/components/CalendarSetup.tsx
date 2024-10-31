import React, { useState, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';
import { CalendarService } from '../services/calendar';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
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
  const { user } = useAuth();

  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const calendarList = await CalendarService.listCalendars(token);
        setCalendars(calendarList);
        // Auto-select primary calendar
        const primaryCalendar = calendarList.find(cal => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendars([primaryCalendar.id]);
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Failed to fetch calendars'));
      } finally {
        setLoading(false);
      }
    };

    fetchCalendars();
  }, [token, onError]);

  const handleSave = async () => {
    if (!user) return;
    
    if (selectedCalendars.length === 0) {
      onError(new Error('Please select at least one calendar'));
      return;
    }

    try {
      setSaving(true);
      await CalendarService.saveCalendarPreferences(user.id, {
        token,
        selectedCalendars
      });
      await CalendarService.syncGoogleEvents(user.id, token, selectedCalendars);
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to save calendar preferences'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
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
            <span className="ml-3 flex-1 text-gray-900 dark:text-white">
              {calendar.summary}
              {calendar.primary && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                  Primary
                </span>
              )}
            </span>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={selectedCalendars.length === 0 || saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}