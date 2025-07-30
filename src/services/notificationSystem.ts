import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { NotificationData } from '../types/enhanced-study';

export class NotificationSystemService {
  private static instance: NotificationSystemService;
  private activeSubscription: any = null;

  static getInstance(): NotificationSystemService {
    if (!NotificationSystemService.instance) {
      NotificationSystemService.instance = new NotificationSystemService();
    }
    return NotificationSystemService.instance;
  }

  /**
   * Get all notifications for current user
   */
  async getNotifications(page: number = 1, pageSize: number = 20): Promise<{
    notifications: NotificationData[];
    total_count: number;
    unread_count: number;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const offset = (page - 1) * pageSize;

      // Get notifications
      const { data: notifications, error, count } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false);

      if (unreadError) throw unreadError;

      return {
        notifications: notifications || [],
        total_count: count || 0,
        unread_count: unreadCount || 0
      };
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      logger.info('Notification marked as read:', notificationId);
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;

      logger.info('All notifications marked as read');
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      logger.info('Notification deleted:', notificationId);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    notification: Omit<NotificationData, 'id' | 'user_id' | 'is_read' | 'created_at'>
  ): Promise<NotificationData> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          ...notification
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info('Notification created:', { userId, type: notification.type });
      return data;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    onNotification: (notification: NotificationData) => void,
    onUnreadCountChange: (count: number) => void
  ): () => void {
    const { data: user } = supabase.auth.getUser();
    
    user.then(({ data: userData }) => {
      if (!userData.user) return;

      const userId = userData.user.id;

      // Unsubscribe from any existing subscription
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
      }

      this.activeSubscription = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              onNotification(payload.new as NotificationData);
            }

            // Update unread count
            const unreadCount = await this.getUnreadCount();
            onUnreadCountChange(unreadCount);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Subscribed to notification updates');
          }
        });
    });

    return () => {
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
        this.activeSubscription = null;
      }
    };
  }

  /**
   * Send push notification (if service worker is available)
   */
  async sendPushNotification(title: string, body: string, icon?: string): Promise<void> {
    try {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: icon || '/matcha.svg',
            badge: '/matcha.svg',
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      logger.error('Error sending push notification:', error);
      // Don't throw - push notifications are optional
    }
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
      this.activeSubscription = null;
    }
  }
}

export const notificationSystemService = NotificationSystemService.getInstance();