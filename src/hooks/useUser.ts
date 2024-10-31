import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useConnection } from './useConnection';
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { retryOperation } from '../utils/retryOperation';

const CACHE_KEY = 'user_profile';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function useUser() {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const { user } = useAuth();
  const { isOnline } = useConnection();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  const {
    loading,
    error,
    executeQuery,
    invalidateCache,
    cancelRequest
  } = useSupabaseQuery<UserProfile>('user-profile');

  const getCachedProfile = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cached profile:', error);
      return null;
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return null;

    try {
      // Try cache first if offline
      if (!isOnline) {
        const cached = getCachedProfile();
        if (cached) return cached;
      }

      const data = await retryOperation(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          return data;
        },
        {
          maxAttempts: 3,
          delay: 1000
        }
      );

      if (data && mountedRef.current) {
        setUserData(data);
        // Cache the profile
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }

      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Return cached data as fallback
      return getCachedProfile();
    }
  }, [user?.id, isOnline, getCachedProfile]);

  const updateUserData = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to update profile');
    }

    try {
      const { data, error } = await retryOperation(
        () => supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single()
      );

      if (error) throw error;
      if (!data) throw new Error('Failed to update profile');

      setUserData(data);
      invalidateCache();
      
      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }, [user?.id, invalidateCache]);

  useEffect(() => {
    mountedRef.current = true;

    if (!user?.id) {
      setUserData(null);
      return;
    }

    fetchUserData();

    return () => {
      mountedRef.current = false;
      cancelRequest();
    };
  }, [user?.id, fetchUserData, cancelRequest]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id || !isOnline) return;

    channelRef.current = supabase.channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && mountedRef.current) {
            setUserData(payload.new as UserProfile);
            invalidateCache();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, isOnline, invalidateCache]);

  return {
    userData,
    loading,
    error,
    updateUserData,
    refetch: fetchUserData
  };
}