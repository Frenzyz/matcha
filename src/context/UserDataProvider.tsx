import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../config/supabase';
import { UserProfile } from '../types';
import { logger } from '../utils/logger';
import { retryOperation } from '../utils/retryOperation';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

interface UserDataContextType {
  userData: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateUserData: (updates: Partial<UserProfile>) => Promise<void>;
  refetch: () => Promise<void>;
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
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const setupSubscription = useCallback(() => {
    if (!user?.id) return null;

    const channel = supabase.channel(`profile:${user.id}`)
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
            setError(null);
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Profile subscription established');
          setRetryCount(0);
        } else if (status === 'CHANNEL_ERROR' && retryCount < MAX_RETRIES) {
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          logger.warn(`Profile subscription error, attempt ${nextRetry}/${MAX_RETRIES}`);
          
          // Exponential backoff for retries
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
          setupSubscription();
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Profile subscription failed after max retries');
          setError('Failed to establish real-time connection');
        }
      });

    return channel;
  }, [user?.id, retryCount]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await retryOperation(
        () => supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        {
          maxAttempts: 3,
          delay: 1000,
          onRetry: (attempt) => {
            logger.warn(`Retrying profile fetch (attempt ${attempt})`);
          }
        }
      );

      if (fetchError) throw fetchError;

      if (!data) {
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
        setUserData(newProfile);
      } else {
        setUserData(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user data';
      setError(message);
      logger.error('Error fetching user data:', { error: err, userId: user.id });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateUserData = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    try {
      setError(null);
      const { data, error: updateError } = await retryOperation(
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

      if (updateError) throw updateError;
      if (!data) throw new Error('Failed to update profile');

      setUserData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user data';
      setError(message);
      logger.error('Error updating user data:', { error: err, userId: user.id });
      throw new Error(message);
    }
  };

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    fetchUserData();
    const channel = setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, fetchUserData, setupSubscription]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={fetchUserData}
        onDismiss={() => setError(null)}
      />
    );
  }

  return (
    <UserDataContext.Provider
      value={{
        userData,
        loading,
        error,
        updateUserData,
        refetch: fetchUserData
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}
