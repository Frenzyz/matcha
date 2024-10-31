import { UserProfile } from '../types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { RequestManager } from './requestManager';

export class UserService {
  private static instance: UserService;
  private requestManager: RequestManager;
  private readonly FETCH_TIMEOUT = 10000;
  private readonly UPDATE_TIMEOUT = 15000;

  private constructor() {
    this.requestManager = RequestManager.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async fetchUserProfile(userId: string): Promise<UserProfile> {
    const requestId = `fetchUserProfile-${userId}`;
    const { signal, cleanup, retry } = this.requestManager.createRequest(requestId, {
      timeout: this.FETCH_TIMEOUT
    });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(signal);

      if (error) {
        if (error.message?.includes('network')) {
          await retry();
          return this.fetchUserProfile(userId);
        }
        throw error;
      }

      if (!data) {
        throw new Error('User profile not found');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.info(`Request ${requestId} was cancelled`);
          if (this.requestManager.isRequestActive(requestId)) {
            await retry();
            return this.fetchUserProfile(userId);
          }
          throw new Error('Request cancelled');
        }
      }
      logger.error('Error fetching user profile:', { error, userId });
      throw error;
    } finally {
      cleanup();
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const requestId = `updateUserProfile-${userId}`;
    const { signal, cleanup, retry } = this.requestManager.createRequest(requestId, {
      timeout: this.UPDATE_TIMEOUT
    });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
        .abortSignal(signal);

      if (error) {
        if (error.message?.includes('network')) {
          await retry();
          return this.updateUserProfile(userId, updates);
        }
        throw error;
      }

      if (!data) {
        throw new Error('Failed to update profile');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.info(`Request ${requestId} was cancelled`);
          if (this.requestManager.isRequestActive(requestId)) {
            await retry();
            return this.updateUserProfile(userId, updates);
          }
          throw new Error('Request cancelled');
        }
      }
      logger.error('Error updating user profile:', { error, userId });
      throw error;
    } finally {
      cleanup();
    }
  }

  cleanup(): void {
    this.requestManager.cancelAllRequests();
  }
}