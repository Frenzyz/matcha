import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';
import { logger } from '../utils/logger';
import { useAuth } from '../context/AuthContext';

export function useProfile() {
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        setProfileData(newProfile);
      } else {
        setProfileData(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      logger.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Update local state
      setProfileData(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      logger.error('Error updating profile:', err);
      throw new Error(message);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    loading,
    error,
    updateProfile
  };
}