import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConnection } from './useConnection';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';

export function useUser() {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isOnline = useConnection();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setUserData(null);
      return;
    }

    let subscription: any;

    const setupSubscription = async () => {
      // Initial fetch
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        setError('Failed to load user data');
      } else {
        setUserData(data);
      }
      setLoading(false);

      // Set up real-time subscription
      subscription = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new) {
              setUserData(payload.new as UserProfile);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user, isOnline]);

  return {
    userData,
    loading,
    error,
    isOnline
  };
}