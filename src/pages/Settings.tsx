import React, { useState, useEffect } from 'react';
import { Save, Key, Palette, Moon } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const colorThemes = [
  { name: 'emerald', color: '#10B981' },
  { name: 'blue', color: '#3B82F6' },
  { name: 'purple', color: '#8B5CF6' },
  { name: 'pink', color: '#EC4899' }
];

export default function Settings() {
  const { user } = useAuth();
  const { setPrimaryColor, primaryColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const [canvasToken, setCanvasToken] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    assignments: true,
    events: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setHasExistingToken(!!data.canvasToken);
          setNotifications(data.notifications || {
            email: true,
            assignments: true,
            events: true
          });
        }
      }
    };
    fetchUserSettings();
  }, [user]);

  const handleColorChange = async (color: string) => {
    if (user) {
      document.documentElement.style.setProperty('--color-primary', colorThemes.find(t => t.name === color)?.color || '#10B981');
      await setPrimaryColor(color, user.uid);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      // Validate Canvas token
      const response = await fetch('https://uncc.instructure.com/api/v1/account_calendars', {
        headers: {
          'Authorization': `Bearer ${canvasToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid Canvas API token');
      }

      await updateDoc(doc(db, 'users', user.uid), {
        canvasToken: canvasToken,
        notifications,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setHasExistingToken(true);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
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
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                        primaryColor === theme.name ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: theme.color }}
                    >
                      <Palette className="text-white" size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Moon size={20} />
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Canvas Integration</h2>
            
            <form onSubmit={handleSave}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="canvas-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Canvas API Token {hasExistingToken && '(Already configured)'}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="canvas-token"
                      value={canvasToken}
                      onChange={(e) => setCanvasToken(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={hasExistingToken ? '••••••••' : 'Enter your Canvas API token'}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    You can generate an API token from your Canvas account settings
                  </p>
                </div>

                {message.text && (
                  <div className={`p-4 rounded-md ${
                    message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}