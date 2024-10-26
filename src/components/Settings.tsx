import React, { useState } from 'react';
import { Save, Palette, Moon, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { useConnection } from '../hooks/useConnection';
import ConnectionStatus from './ConnectionStatus';
import GoogleCalendarButton from './GoogleCalendarButton';

const colorThemes = [
  { name: 'emerald', color: '#10B981', label: 'Emerald' },
  { name: 'blue', color: '#3B82F6', label: 'Blue' },
  { name: 'purple', color: '#8B5CF6', label: 'Purple' },
  { name: 'pink', color: '#EC4899', label: 'Pink' }
];

export default function Settings() {
  const { user } = useAuth();
  const { setPrimaryColor, primaryColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = useConnection();

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    if (user && isOnline) {
      try {
        setMessage({ type: 'success', text: 'Theme color updated!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to save theme preference' });
      }
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    try {
      setMessage({ 
        type: 'success', 
        text: 'Google Calendar connected successfully!' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to connect Google Calendar' 
      });
    }
  };

  const handleGoogleError = (error: Error) => {
    setMessage({ 
      type: 'error', 
      text: 'Failed to connect Google Calendar' 
    });
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
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Calendar Integration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  Connect Your Calendar
                </label>
                <div className="flex justify-start">
                  <GoogleCalendarButton
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Connect your Google Calendar to sync your academic and personal events
                </p>
              </div>

              {message.text && (
                <div className={`p-4 rounded-md ${
                  message.type === 'success' ? 'bg-theme-light text-theme-primary' : 'bg-red-50 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}