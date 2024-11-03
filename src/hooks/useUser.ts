import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useConnection } from './useConnection';
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { retryOperation } from '../utils/retryOperation';
import { logger } from '../utils/logger';

const CACHE_KEY = 'user_profile';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_SUBSCRIPTION_RETRIES = 3;
const SUBSCRIPTION_RETRY_DELAY = 2000;

export function useUser() {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { isOnline } = useConnection();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const {
    loading: queryLoading,
    error: queryError,
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
      logger.error('Error reading cached profile:', error);
      return null;
    }
  }, []);

  const setupSubscription = useCallback(() => {
    if (!user?.id || !isOnline || !mountedRef.current) return;

    try {
      // Clean up existing subscription if any
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      // Create new channel with unique name to prevent conflicts
      const channelName = `profile:${user.id}:${Date.now()}`;
      channelRef.current = supabase.channel(channelName)
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

              // Update cache
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: payload.new,
                timestamp: Date.now()
              }));
            }
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            retryCountRef.current = 0;
            logger.info('Profile subscription established');
          } else if (status === 'CHANNEL_ERROR') {
            logger.warn('Profile subscription error');
            if (retryCountRef.current < MAX_SUBSCRIPTION_RETRIES) {
              retryCountRef.current++;
              await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_RETRY_DELAY * Math.pow(2, retryCountRef.current - 1)));
              if (mountedRef.current) {
                setupSubscription();
              }
            }
          }
        });

    } catch (error) {
      logger.error('Error setting up profile subscription:', error);
    }
  }, [user?.id, isOnline, invalidateCache]);

  const fetchUserData = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return null;

    try {
      setLoading(true);
      setError(null);

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
          delay: 1000,
          onRetry: (attempt) => {
            logger.warn(`Retrying profile fetch (attempt ${attempt})`);
          }
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
      const message = error instanceof Error ? error.message : 'Failed to fetch user data';
      setError(message);
      logger.error('Error fetching user data:', { error, userId: user.id });
      // Return cached data as fallback
      return getCachedProfile();
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, isOnline, getCachedProfile]);

  const updateUserData = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to update profile');
    }

    try {
      const { data, error: updateError } = await retryOperation(
        () => supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single(),
        {
          maxAttempts: 3,
          delay: 1000,
          onRetry: (attempt) => {
            logger.warn(`Retrying profile update (attempt ${attempt})`);
          }
        }
      );

      if (updateError) throw updateError;
      if (!data) throw new Error('Failed to update profile');

      setUserData(data);
      invalidateCache();
      
      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user data';
      setError(message);
      logger.error('Error updating user data:', { error: err, userId: user.id });
      throw new Error(message);
    }
  }, [user?.id, invalidateCache]);

  // Initial setup and cleanup
  useEffect(() => {
    mountedRef.current = true;

    if (!user?.id) {
      setUserData(null);
      return;
    }

    fetchUserData();
    setupSubscription();

    return () => {
      mountedRef.current = false;
      cancelRequest();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchUserData, setupSubscription, cancelRequest]);

  // Handle connection changes
  useEffect(() => {
    if (isOnline && user?.id) {
      setupSubscription();
    }
  }, [isOnline, user?.id, setupSubscription]);

  return {
    userData,
    loading: loading || queryLoading,
    error: error || queryError,
    updateUserData,
    refetch: fetchUserData
  };
}