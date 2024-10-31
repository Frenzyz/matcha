import React, { useState } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useUserData } from '../context/UserDataProvider';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import ConnectionStatus from '../components/ConnectionStatus';
import GoogleCalendarButton from '../components/GoogleCalendarButton';
import ColorPicker from '../components/ColorPicker';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { Save, Key, Palette, Moon, Calendar, Upload, User, Settings as SettingsIcon } from 'lucide-react';
import CalendarSetup from '../components/CalendarSetup';

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { user } = useAuth();
  const { userData, loading, error, updateUserData } = useUserData();
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showCalendarSetup, setShowCalendarSetup] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    major: ''
  });

  // Update form data when user data changes
  React.useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        major: userData.major || ''
      });
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });
      await updateUserData(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5 * 1024 * 1024,
    onDrop: async (acceptedFiles) => {
      if (!user || acceptedFiles.length === 0) return;

      try {
        setIsSaving(true);
        const file = acceptedFiles[0];

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        await updateUserData({ avatar_url: publicUrl });
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture';
        setMessage({ type: 'error', text: errorMessage });
        logger.error('Profile picture upload error:', err);
      } finally {
        setIsSaving(false);
      }
    }
  });

  const handleGoogleSuccess = async (token: string) => {
    if (!user) return;

    try {
      setIsSaving(true);
      await updateUserData({ google_calendar_token: token });
      setMessage({ type: 'success', text: 'Calendar connected successfully!' });
      setShowCalendarSetup(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect calendar';
      setMessage({ type: 'error', text: errorMessage });
      logger.error('Google Calendar connection error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!user || !window.confirm('Are you sure you want to disconnect your calendar?')) return;

    try {
      setIsSaving(true);
      await updateUserData({ google_calendar_token: null });
      setMessage({ type: 'success', text: 'Calendar disconnected successfully!' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect calendar';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (showCalendarSetup && userData?.google_calendar_token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 p-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Configure Calendar
            </h2>
            <button
              onClick={() => setShowCalendarSetup(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
          <CalendarSetup
            token={userData.google_calendar_token}
            onComplete={() => {
              setShowCalendarSetup(false);
              setMessage({ type: 'success', text: 'Calendar settings updated successfully!' });
            }}
            onError={(error) => {
              setMessage({ type: 'error', text: error.message });
              setShowCalendarSetup(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <ConnectionStatus />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
          
          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                Profile Settings
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="relative">
                    {userData?.avatar_url ? (
                      <img
                        src={userData.avatar_url}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div {...getRootProps()} className="absolute bottom-0 right-0">
                      <input {...getInputProps()} />
                      <button type="button" className="p-2 bg-emerald-500 rounded-full text-white hover:bg-emerald-600">
                        <Upload size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Major
                  </label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Theme Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                Theme Settings
              </h2>
              <ColorPicker />
              <div className="mt-4">
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Moon size={20} />
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                Calendar Integration
              </h2>
              {userData?.google_calendar_token ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Calendar size={20} />
                    <span>Google Calendar Connected</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowCalendarSetup(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <SettingsIcon size={20} />
                      Configure Calendar
                    </button>
                    <button
                      onClick={handleDisconnectCalendar}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Calendar size={20} />
                      Disconnect Calendar
                    </button>
                  </div>
                </div>
              ) : (
                <GoogleCalendarButton
                  onSuccess={handleGoogleSuccess}
                  onError={(error) => {
                    setMessage({ 
                      type: 'error', 
                      text: error instanceof Error ? error.message : 'Failed to connect Google Calendar'
                    });
                  }}
                />
              )}
            </div>
          </div>

          {message.text && (
            <div className={`mt-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}