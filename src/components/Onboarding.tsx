import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Palette } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import GoogleCalendarButton from './GoogleCalendarButton';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to UNCC Mentor",
    description: "We're excited to help you navigate your academic journey as a first-generation student."
  },
  {
    title: "Personalize Your Experience",
    description: "Choose a color theme that represents you."
  },
  {
    title: "Connect Your Calendar",
    description: "Sync with Google Calendar to manage your schedule effectively."
  }
];

const colorThemes = [
  { name: 'emerald', color: '#10B981' },
  { name: 'blue', color: '#3B82F6' },
  { name: 'purple', color: '#8B5CF6' },
  { name: 'pink', color: '#EC4899' }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { setPrimaryColor } = useThemeStore();
  const { user } = useAuth();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [formData, setFormData] = useState({
    major: '',
    interests: ''
  });

  const handleComplete = async () => {
    if (!user) return;

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          setup_completed: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Save user preferences
      const { error: prefError } = await supabase
        .from('user_preferences')
        .insert([{
          user_id: user.id,
          major: formData.major,
          interests: formData.interests,
          created_at: new Date().toISOString()
        }]);

      if (prefError) throw prefError;

      // Navigate to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    setCalendarConnected(true);
  };

  const handleGoogleError = (error: Error) => {
    console.error('Google Calendar error:', error);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {steps[currentStep].title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {steps[currentStep].description}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What's your major?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              />
              <textarea
                placeholder="What are your academic interests?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              />
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                {colorThemes.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => setPrimaryColor(theme.name)}
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.color }}
                  >
                    <Palette className="text-white" size={20} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <GoogleCalendarButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>
              {calendarConnected && (
                <p className="text-center text-sm text-emerald-600">
                  ✓ Calendar connected successfully!
                </p>
              )}
              <p className="text-center text-sm text-gray-500">
                You can always connect your calendar later from the settings.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className={`px-4 py-2 text-sm font-medium text-gray-700 ${
                currentStep === 0 ? 'invisible' : ''
              }`}
            >
              Back
            </button>
            <button
              onClick={() => {
                if (currentStep < steps.length - 1) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleComplete();
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}