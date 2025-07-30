import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  Friendship,
  UserProfile,
  FriendsListResponse,
  NotificationData
} from '../types/enhanced-study';

export class FriendSystemService {
  private static instance: FriendSystemService;

  static getInstance(): FriendSystemService {
    if (!FriendSystemService.instance) {
      FriendSystemService.instance = new FriendSystemService();
    }
    return FriendSystemService.instance;
  }

  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(addresseeId: string): Promise<Friendship> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const requesterId = user.user.id;

      // Check if users are the same
      if (requesterId === addresseeId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if friendship already exists
      const existingFriendship = await this.getFriendshipStatus(requesterId, addresseeId);
      if (existingFriendship) {
        switch (existingFriendship.status) {
          case 'accepted':
            throw new Error('You are already friends with this user');
          case 'pending':
            if (existingFriendship.requester_id === requesterId) {
              throw new Error('Friend request already sent');
            } else {
              throw new Error('This user has already sent you a friend request');
            }
          case 'blocked':
            throw new Error('Cannot send friend request to this user');
        }
      }

      // Create the friend request
      const { data, error } = await supabase
        .from('friendships')
        .insert([{
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: 'pending'
        }])
        .select(`
          *,
          requester:requester_id (
            id, first_name, last_name, avatar_url, major
          ),
          addressee:addressee_id (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .single();

      if (error) throw error;

      // Create notification for the addressee
      await this.createNotification(addresseeId, {
        type: 'friend_request',
        title: 'New Friend Request',
        content: `${data.requester.first_name} ${data.requester.last_name} sent you a friend request`,
        metadata: {
          friendship_id: data.id,
          requester_id: requesterId,
          requester_name: `${data.requester.first_name} ${data.requester.last_name}`
        }
      });

      logger.info('Friend request sent successfully:', { requesterId, addresseeId });
      return data;
    } catch (error) {
      logger.error('Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update friendship status
      const { data, error } = await supabase
        .from('friendships')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', friendshipId)
        .eq('addressee_id', user.user.id) // Ensure only addressee can accept
        .eq('status', 'pending') // Ensure it's still pending
        .select(`
          *,
          requester:requester_id (
            id, first_name, last_name, avatar_url, major
          ),
          addressee:addressee_id (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Friend request not found or already processed');

      // Create notification for the requester
      await this.createNotification(data.requester_id, {
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        content: `${data.addressee.first_name} ${data.addressee.last_name} accepted your friend request`,
        metadata: {
          friendship_id: friendshipId,
          friend_id: user.user.id,
          friend_name: `${data.addressee.first_name} ${data.addressee.last_name}`
        }
      });

      logger.info('Friend request accepted:', { friendshipId });
      return data;
    } catch (error) {
      logger.error('Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(friendshipId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .eq('addressee_id', user.user.id) // Ensure only addressee can decline
        .eq('status', 'pending'); // Ensure it's still pending

      if (error) throw error;

      logger.info('Friend request declined:', { friendshipId });
    } catch (error) {
      logger.error('Error declining friend request:', error);
      throw error;
    }
  }

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(friendId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);

      if (error) throw error;

      logger.info('Friend removed:', { userId, friendId });
    } catch (error) {
      logger.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userIdToBlock: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      // First, remove any existing friendship
      await this.removeFriend(userIdToBlock);

      // Create a blocked relationship
      const { error } = await supabase
        .from('friendships')
        .insert([{
          requester_id: userId,
          addressee_id: userIdToBlock,
          status: 'blocked'
        }]);

      if (error) throw error;

      logger.info('User blocked:', { userId, userIdToBlock });
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userIdToUnblock: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', userId)
        .eq('addressee_id', userIdToUnblock)
        .eq('status', 'blocked');

      if (error) throw error;

      logger.info('User unblocked:', { userId, userIdToUnblock });
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Get all friends and pending requests for current user
   */
  async getFriendsList(): Promise<FriendsListResponse> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      // Get all friendships involving the current user
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:requester_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          ),
          addressee:addressee_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          )
        `)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .neq('status', 'blocked');

      if (error) throw error;

      const friends: UserProfile[] = [];
      const pending_requests: Friendship[] = [];
      const sent_requests: Friendship[] = [];

      (friendships || []).forEach(friendship => {
        if (friendship.status === 'accepted') {
          // Determine which user is the friend
          const friendProfile = friendship.requester_id === userId 
            ? friendship.addressee 
            : friendship.requester;
          
          friends.push({
            id: friendProfile.id,
            email: friendProfile.email,
            first_name: friendProfile.first_name,
            last_name: friendProfile.last_name,
            student_id: friendProfile.student_id,
            major: friendProfile.major,
            avatar_url: friendProfile.avatar_url,
            theme_color: friendProfile.theme_color,
            setup_completed: true,
            created_at: friendProfile.created_at,
            updated_at: friendProfile.updated_at,
            last_seen: friendProfile.last_seen
          });
        } else if (friendship.status === 'pending') {
          if (friendship.requester_id === userId) {
            // User sent this request
            sent_requests.push(friendship);
          } else {
            // User received this request
            pending_requests.push(friendship);
          }
        }
      });

      return {
        friends,
        pending_requests,
        sent_requests
      };
    } catch (error) {
      logger.error('Error getting friends list:', error);
      throw error;
    }
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(userId1: string, userId2: string): Promise<Friendship | null> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      
      return data || null;
    } catch (error) {
      logger.error('Error getting friendship status:', error);
      return null;
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.getFriendshipStatus(userId1, userId2);
    return friendship?.status === 'accepted';
  }

  /**
   * Get mutual friends between current user and another user
   */
  async getMutualFriends(otherUserId: string): Promise<UserProfile[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      // Get current user's friends
      const { friends: currentUserFriends } = await this.getFriendsList();
      const currentUserFriendIds = currentUserFriends.map(f => f.id);

      if (currentUserFriendIds.length === 0) return [];

      // Get other user's friends
      const { data: otherUserFriendships, error } = await supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:requester_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          ),
          addressee:addressee_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen
          )
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${otherUserId},addressee_id.eq.${otherUserId}`);

      if (error) throw error;

      const mutualFriends: UserProfile[] = [];

      (otherUserFriendships || []).forEach(friendship => {
        const friendId = friendship.requester_id === otherUserId 
          ? friendship.addressee_id 
          : friendship.requester_id;
        
        if (currentUserFriendIds.includes(friendId)) {
          const friendProfile = friendship.requester_id === otherUserId 
            ? friendship.addressee 
            : friendship.requester;
          
          mutualFriends.push({
            id: friendProfile.id,
            email: friendProfile.email,
            first_name: friendProfile.first_name,
            last_name: friendProfile.last_name,
            student_id: friendProfile.student_id,
            major: friendProfile.major,
            avatar_url: friendProfile.avatar_url,
            theme_color: friendProfile.theme_color,
            setup_completed: true,
            created_at: friendProfile.created_at,
            updated_at: friendProfile.updated_at,
            last_seen: friendProfile.last_seen
          });
        }
      });

      return mutualFriends;
    } catch (error) {
      logger.error('Error getting mutual friends:', error);
      throw error;
    }
  }

  /**
   * Search within friends
   */
  async searchFriends(query: string): Promise<UserProfile[]> {
    try {
      const { friends } = await this.getFriendsList();
      
      if (!query.trim()) return friends;

      const searchTerm = query.toLowerCase();
      return friends.filter(friend => {
        const fullName = `${friend.first_name || ''} ${friend.last_name || ''}`.toLowerCase();
        const major = (friend.major || '').toLowerCase();
        const email = (friend.email || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
               major.includes(searchTerm) || 
               email.includes(searchTerm);
      });
    } catch (error) {
      logger.error('Error searching friends:', error);
      throw error;
    }
  }

  /**
   * Get friend suggestions based on mutual friends and similar interests
   */
  async getFriendSuggestions(limit: number = 10): Promise<UserProfile[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const userId = user.user.id;

      // Get current friends and pending requests
      const { friends, pending_requests, sent_requests } = await this.getFriendsList();
      const excludeIds = [
        userId,
        ...friends.map(f => f.id),
        ...pending_requests.map(r => r.requester_id),
        ...sent_requests.map(r => r.addressee_id)
      ];

      // Get users with mutual friends
      const mutualFriendsQuery = supabase
        .from('friendships')
        .select(`
          requester_id,
          addressee_id,
          requester:requester_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen,
            enhanced_profiles (interests, study_preferences)
          ),
          addressee:addressee_id (
            id, email, first_name, last_name, student_id, major, 
            avatar_url, theme_color, created_at, updated_at, last_seen,
            enhanced_profiles (interests, study_preferences)
          )
        `)
        .eq('status', 'accepted')
        .in('requester_id', friends.map(f => f.id))
        .not('addressee_id', 'in', `(${excludeIds.join(',')})`)
        .limit(limit);

      const { data: mutualConnections, error } = await mutualFriendsQuery;
      if (error) throw error;

      const suggestions = new Map<string, UserProfile>();

      (mutualConnections || []).forEach(connection => {
        const suggestedUser = connection.addressee;
        if (!suggestions.has(suggestedUser.id)) {
          suggestions.set(suggestedUser.id, {
            id: suggestedUser.id,
            email: suggestedUser.email,
            first_name: suggestedUser.first_name,
            last_name: suggestedUser.last_name,
            student_id: suggestedUser.student_id,
            major: suggestedUser.major,
            avatar_url: suggestedUser.avatar_url,
            theme_color: suggestedUser.theme_color,
            setup_completed: true,
            created_at: suggestedUser.created_at,
            updated_at: suggestedUser.updated_at,
            last_seen: suggestedUser.last_seen
          });
        }
      });

      return Array.from(suggestions.values()).slice(0, limit);
    } catch (error) {
      logger.error('Error getting friend suggestions:', error);
      throw error;
    }
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
   * Subscribe to real-time friendship updates
   */
  subscribeToFriendshipUpdates(
    userId: string,
    onUpdate: (friendship: Friendship) => void
  ): () => void {
    const channel = supabase
      .channel(`friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `or(requester_id.eq.${userId},addressee_id.eq.${userId})`
        },
        (payload) => {
          onUpdate(payload.new as Friendship);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to friendship updates');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }
}

export const friendSystemService = FriendSystemService.getInstance();