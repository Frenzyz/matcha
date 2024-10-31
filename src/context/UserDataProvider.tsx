import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';
import { logger } from '../utils/logger';

interface UserDataContextType {
  userData: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateUserData: (updates: Partial<UserProfile>) => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setUserData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(message);
      logger.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      await fetchUserData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user data';
      setError(message);
      logger.error('Error updating user data:', err);
      throw new Error(message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
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

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <UserDataContext.Provider
      value={{
        userData,
        loading,
        error,
        updateUserData,
        refetchUserData: fetchUserData
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}