import React, { useState, useEffect } from 'react';
import { Save, Key, Palette, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { useConnection } from '../hooks/useConnection';
import { supabase, retryOperation } from '../config/supabase';
import ConnectionStatus from './ConnectionStatus';

const colorThemes = [
  { name: 'emerald', color: '#10B981', label: 'Emerald' },
  { name: 'blue', color: '#3B82F6', label: 'Blue' },
  { name: 'purple', color: '#8B5CF6', label: 'Purple' },
  { name: 'pink', color: '#EC4899', label: 'Pink' }
];

export default function Settings() {
  const { user } = useAuth();
  const { setPrimaryColor, primaryColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const [calendarUrl, setCalendarUrl] = useState('');
  const [hasExistingCalendar, setHasExistingCalendar] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isOnline = useConnection();

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const { data, error } = await retryOperation(async () =>
          supabase
            .from('profiles')
            .select('canvas_calendar_url, theme_color')
            .eq('id', user.id)
            .single()
        );

        if (error) throw error;

        if (data) {
          setHasExistingCalendar(!!data.canvas_calendar_url);
          if (data.canvas_calendar_url) {
            setCalendarUrl(data.canvas_calendar_url);
          }
          if (data.theme_color) {
            setPrimaryColor(data.theme_color);
          }
        }
      } catch (error) {
        setMessage({
          type: 'error',
          text: isOnline 
            ? 'Having trouble connecting to the server. Please try again.' 
            : 'You\'re offline. Settings will sync when you\'re back online.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSettings();
  }, [user, isOnline, setPrimaryColor]);

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    if (user && isOnline) {
      try {
        const { error } = await retryOperation(async () =>
          supabase
            .from('profiles')
            .update({ theme_color: color })
            .eq('id', user.id)
        );

        if (error) throw error;
        setMessage({ type: 'success', text: 'Theme color updated!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to save theme preference' });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSaving(true);
      const { error } = await retryOperation(async () =>
        supabase
          .from('profiles')
          .update({
            canvas_calendar_url: calendarUrl,
            theme_color: primaryColor,
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id)
      );

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: isOnline 
          ? 'Settings saved successfully!' 
          : 'Settings saved locally and will sync when you\'re back online.'
      });
      setHasExistingCalendar(true);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <ConnectionStatus />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Theme Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Color Theme
                </label>
                <div className="flex gap-4">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleColorChange(theme.name)}
                      className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                        primaryColor === theme.name ? 'ring-2 ring-offset-2 ring-theme-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: theme.color }}
                    >
                      <Palette className="text-white" size={20} />
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Moon size={20} />
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Canvas Calendar Integration</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="calendar-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Canvas Calendar URL {hasExistingCalendar && '(Already configured)'}
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-theme-primary focus:border-theme-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder={hasExistingCalendar ? '••••••••' : 'Enter your Canvas calendar URL'}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Find your calendar URL in Canvas under Calendar &gt; Calendar Feed
                </p>
              </div>

              {message.text && (
                <div className={`p-4 rounded-md ${
                  message.type === 'success' ? 'bg-theme-light text-theme-primary' : 'bg-red-50 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || (!isOnline && !calendarUrl)}
                  className={`flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-theme-primary hover:bg-theme-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme-primary transition-colors ${
                    (isSaving || (!isOnline && !calendarUrl)) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}