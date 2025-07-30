import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  DirectMessage,
  ChatConversation,
  ConversationsResponse,
  MessageType,
  UserProfile,
  NotificationData
} from '../types/enhanced-study';
import { friendSystemService } from './friendSystem';

export class DirectMessagingService {
  private static instance: DirectMessagingService;
  private activeSubscriptions = new Map<string, any>();

  static getInstance(): DirectMessagingService {
    if (!DirectMessagingService.instance) {
      DirectMessagingService.instance = new DirectMessagingService();
    }
    return DirectMessagingService.instance;
  }

  /**
   * Send a direct message to another user
   */
  async sendMessage(
    receiverId: string,
    content: string,
    messageType: MessageType = 'text',
    metadata: Record<string, any> = {}
  ): Promise<DirectMessage> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const senderId = user.user.id;

      // Check if users are friends
      const areFriends = await friendSystemService.areFriends(senderId, receiverId);
      if (!areFriends) {
        throw new Error('Can only send messages to friends');
      }

      // Create the message
      const { data, error } = await supabase
        .from('direct_messages')
        .insert([{
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          metadata,
          is_read: false
        }])
        .select(`
          *,
          sender:sender_id (
            id, first_name, last_name, avatar_url, major
          ),
          receiver:receiver_id (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .single();

      if (error) throw error;

      // Create notification for receiver
      await this.createNotification(receiverId, {
        type: 'message',
        title: 'New Message',
        content: `${data.sender.first_name} ${data.sender.last_name} sent you a message`,
        metadata: {
          message_id: data.id,
          sender_id: senderId,
          sender_name: `${data.sender.first_name} ${data.sender.last_name}`,
          preview: content.substring(0, 100)
        }
      });

      logger.info('Message sent successfully:', { senderId, receiverId, messageType });
      return data;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get conversation messages between current user and another user
   */
  async getConversation(
    otherUserId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<DirectMessage[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;
      const offset = (page - 1) * pageSize;

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:sender_id (
            id, first_name, last_name, avatar_url, major
          ),
          receiver:receiver_id (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // Mark messages from the other user as read
      await this.markMessagesAsRead(otherUserId);

      return (data || []).reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(): Promise<ConversationsResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      // Get all direct messages involving the user
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:sender_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          ),
          receiver:receiver_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation (other participant)
      const conversationsMap = new Map<string, ChatConversation>();

      (messages || []).forEach(message => {
        const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === userId ? message.receiver : message.sender;

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            participant: {
              id: otherUser.id,
              email: otherUser.email,
              first_name: otherUser.first_name,
              last_name: otherUser.last_name,
              student_id: otherUser.student_id,
              major: otherUser.major,
              avatar_url: otherUser.avatar_url,
              theme_color: otherUser.theme_color,
              setup_completed: true,
              created_at: otherUser.created_at,
              updated_at: otherUser.updated_at,
              last_seen: otherUser.last_seen
            },
            last_message: message,
            unread_count: 0,
            last_activity: message.created_at
          });
        }

        // Update last message if this one is more recent
        const conversation = conversationsMap.get(otherUserId)!;
        if (new Date(message.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = message;
          conversation.last_activity = message.created_at;
        }

        // Count unread messages from the other user
        if (message.sender_id === otherUserId && !message.is_read) {
          conversation.unread_count++;
        }
      });

      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

      return {
        conversations,
        total_count: conversations.length
      };
    } catch (error) {
      logger.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Mark messages from a specific user as read
   */
  async markMessagesAsRead(senderId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;

      logger.info('Messages marked as read:', { senderId, receiverId: user.user.id });
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete by updating content)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('direct_messages')
        .update({
          content: '[Message deleted]',
          metadata: { deleted: true, deleted_at: new Date().toISOString() }
        })
        .eq('id', messageId)
        .eq('sender_id', user.user.id); // Only sender can delete their own messages

      if (error) throw error;

      logger.info('Message deleted:', { messageId });
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Search messages in a conversation
   */
  async searchConversation(
    otherUserId: string,
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<DirectMessage[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;
      const offset = (page - 1) * pageSize;

      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:sender_id (
            id, first_name, last_name, avatar_url, major
          ),
          receiver:receiver_id (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error searching conversation:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for current user
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Send a call invite message
   */
  async sendCallInvite(
    receiverId: string,
    callType: 'voice' | 'video',
    roomId?: string
  ): Promise<DirectMessage> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const callData = {
        type: callType,
        caller_id: user.user.id,
        room_id: roomId,
        timestamp: new Date().toISOString()
      };

      return await this.sendMessage(
        receiverId,
        `${callType === 'video' ? '📹' : '📞'} ${callType === 'video' ? 'Video' : 'Voice'} call invitation`,
        'call_invite',
        callData
      );
    } catch (error) {
      logger.error('Error sending call invite:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time messages for a conversation
   */
  subscribeToConversation(
    otherUserId: string,
    onMessage: (message: DirectMessage) => void
  ): () => void {
    const { data: user } = supabase.auth.getUser();
    
    user.then(({ data: userData }) => {
      if (!userData.user) return;

      const userId = userData.user.id;
      const subscriptionKey = `conversation:${userId}:${otherUserId}`;

      // Unsubscribe from any existing subscription for this conversation
      if (this.activeSubscriptions.has(subscriptionKey)) {
        this.activeSubscriptions.get(subscriptionKey).unsubscribe();
      }

      const channel = supabase
        .channel(`messages:${userId}:${otherUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId}))`
          },
          async (payload) => {
            // Fetch the complete message with user data
            const { data, error } = await supabase
              .from('direct_messages')
              .select(`
                *,
                sender:sender_id (
                  id, first_name, last_name, avatar_url, major
                ),
                receiver:receiver_id (
                  id, first_name, last_name, avatar_url, major
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              onMessage(data);
              
              // Auto-mark as read if message is from the other user
              if (data.sender_id === otherUserId) {
                await this.markMessagesAsRead(otherUserId);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Subscribed to conversation updates:', { userId, otherUserId });
          }
        });

      this.activeSubscriptions.set(subscriptionKey, channel);
    });

    return () => {
      const { data: user } = supabase.auth.getUser();
      user.then(({ data: userData }) => {
        if (!userData.user) return;
        
        const subscriptionKey = `conversation:${userData.user.id}:${otherUserId}`;
        const channel = this.activeSubscriptions.get(subscriptionKey);
        if (channel) {
          channel.unsubscribe();
          this.activeSubscriptions.delete(subscriptionKey);
        }
      });
    };
  }

  /**
   * Subscribe to all message updates for current user
   */
  subscribeToAllMessages(
    onMessage: (message: DirectMessage) => void,
    onUnreadCountChange: (count: number) => void
  ): () => void {
    const { data: user } = supabase.auth.getUser();
    
    user.then(({ data: userData }) => {
      if (!userData.user) return;

      const userId = userData.user.id;

      const channel = supabase
        .channel(`user_messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
            filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              // Fetch the complete message with user data
              const { data, error } = await supabase
                .from('direct_messages')
                .select(`
                  *,
                  sender:sender_id (
                    id, first_name, last_name, avatar_url, major
                  ),
                  receiver:receiver_id (
                    id, first_name, last_name, avatar_url, major
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!error && data) {
                onMessage(data);
              }
            }

            // Update unread count
            const unreadCount = await this.getUnreadCount();
            onUnreadCountChange(unreadCount);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('Subscribed to all message updates');
          }
        });

      return () => {
        channel.unsubscribe();
      };
    });

    return () => {};
  }

  /**
   * Create a notification
   */
  private async createNotification(
    userId: string,
    notification: Omit<NotificationData, 'id' | 'user_id' | 'is_read' | 'created_at'>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          ...notification
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Error creating notification:', error);
      // Don't throw - notification creation shouldn't break the main operation
    }
  }

  /**
   * Clean up all active subscriptions
   */
  cleanup(): void {
    this.activeSubscriptions.forEach((channel) => {
      channel.unsubscribe();
    });
    this.activeSubscriptions.clear();
  }
}

export const directMessagingService = DirectMessagingService.getInstance();