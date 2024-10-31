import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useConnection } from './useConnection';
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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

  const fetchUserData = useCallback(async () => {
    if (!user?.id || !mountedRef.current || !isOnline) return null;

    const data = await executeQuery<UserProfile>(
      () => supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      {
        cacheTime: 30000, // 30 seconds
        retryCount: 2
      }
    );

    if (data && mountedRef.current) {
      setUserData(data);
    }

    return data;
  }, [user?.id, isOnline, executeQuery]);

  const updateUserData = useCallback(async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to update profile');
    }

    const data = await executeQuery<UserProfile>(
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
        retryCount: 3,
        retryDelay: 2000
      }
    );

    if (!data) {
      throw new Error('Failed to update profile');
    }

    setUserData(data);
    invalidateCache();
    return data;
  }, [user?.id, executeQuery, invalidateCache]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || !mountedRef.current || !isOnline) return;

    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

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
  }, [user?.id, isOnline, invalidateCache]);

  useEffect(() => {
    mountedRef.current = true;

    if (!user?.id) {
      setUserData(null);
      return;
    }

    fetchUserData();
    setupRealtimeSubscription();

    return () => {
      mountedRef.current = false;
      cancelRequest();
      
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user?.id, fetchUserData, setupRealtimeSubscription, cancelRequest]);

  // Reconnect and refetch when connection is restored
  useEffect(() => {
    if (isOnline && user?.id) {
      fetchUserData();
      setupRealtimeSubscription();
    }
  }, [isOnline, user?.id, fetchUserData, setupRealtimeSubscription]);

  return {
    userData,
    loading,
    error,
    updateUserData,
    refetch: fetchUserData
  };
}