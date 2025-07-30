import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  StudyRoomEnhanced,
  StudyRoomFilters,
  SearchRoomsResponse,
  StudyRoomRecommendation,
  EnhancedProfile,
  StudyInvite,
  CreateRoomFormData
} from '../types/enhanced-study';

export class EnhancedRoomMatchingService {
  private static instance: EnhancedRoomMatchingService;

  static getInstance(): EnhancedRoomMatchingService {
    if (!EnhancedRoomMatchingService.instance) {
      EnhancedRoomMatchingService.instance = new EnhancedRoomMatchingService();
    }
    return EnhancedRoomMatchingService.instance;
  }

  /**
   * Create a new study room with enhanced features
   */
  async createRoom(roomData: CreateRoomFormData): Promise<StudyRoomEnhanced> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('study_rooms')
        .insert([{
          name: roomData.name,
          subject: roomData.subject,
          description: roomData.description,
          study_type: roomData.study_type,
          difficulty_level: roomData.difficulty_level,
          max_participants: roomData.max_participants,
          tags: roomData.tags,
          is_private: roomData.is_private,
          password_hash: roomData.password ? await this.hashPassword(roomData.password) : null,
          scheduled_start: roomData.scheduled_start,
          scheduled_end: roomData.scheduled_end,
          created_by: user.user.id,
          status: 'active'
        }])
        .select(`
          *,
          creator:created_by (
            id, first_name, last_name, avatar_url, major
          )
        `)
        .single();

      if (error) throw error;

      // Add creator as owner participant
      await supabase
        .from('study_room_participants')
        .insert([{
          room_id: data.id,
          user_id: user.user.id,
          role: 'owner',
          is_active: true
        }]);

      logger.info('Study room created:', { roomId: data.id, userId: user.user.id });
      return data;
    } catch (error) {
      logger.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Search study rooms with intelligent filtering and matching
   */
  async searchRooms(
    filters: StudyRoomFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchRoomsResponse> {
    try {
      const offset = (page - 1) * pageSize;
      let query = supabase
        .from('study_rooms')
        .select(`
          *,
          creator:created_by (
            id, first_name, last_name, avatar_url, major
          ),
          participant_count:study_room_participants(count)
        `)
        .eq('status', 'active');

      // Apply filters
      if (filters.subject) {
        query = query.ilike('subject', `%${filters.subject}%`);
      }

      if (filters.study_type) {
        query = query.eq('study_type', filters.study_type);
      }

      if (filters.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters.max_participants) {
        query = query.lte('max_participants', filters.max_participants);
      }

      if (filters.has_space) {
        // This would need a more complex query to check current participant count
        // For now, we'll filter this in post-processing
      }

      if (filters.scheduled_only) {
        query = query.not('scheduled_start', 'is', null);
      }

      if (!filters.scheduled_only) {
        query = query.eq('is_private', false);
      }

      const { data: rooms, error, count } = await query
        .range(offset, offset + pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredRooms = rooms || [];

      // Apply post-processing filters
      if (filters.has_space || filters.tags) {
        filteredRooms = await Promise.all(
          filteredRooms.map(async (room) => {
            // Get current participant count
            const { count: participantCount } = await supabase
              .from('study_room_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('is_active', true);

            const currentParticipants = participantCount || 0;
            
            return {
              ...room,
              participant_count: currentParticipants
            };
          })
        );

        if (filters.has_space) {
          filteredRooms = filteredRooms.filter(room => 
            (room.participant_count || 0) < room.max_participants
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filteredRooms = filteredRooms.filter(room => {
            const roomTags = room.tags || [];
            return filters.tags!.some(tag => 
              roomTags.some(roomTag => 
                roomTag.toLowerCase().includes(tag.toLowerCase())
              )
            );
          });
        }
      }

      return {
        rooms: filteredRooms,
        total_count: count || filteredRooms.length,
        page,
        page_size: pageSize,
        filters_applied: filters
      };
    } catch (error) {
      logger.error('Error searching rooms:', error);
      throw error;
    }
  }

  /**
   * Get personalized room recommendations based on user profile
   */
  async getRoomRecommendations(limit: number = 10): Promise<StudyRoomRecommendation[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get user's enhanced profile
      const { data: userProfile, error: profileError } = await supabase
        .from('enhanced_profiles')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (profileError || !userProfile) {
        // If no enhanced profile, return general recommendations
        logger.info('No enhanced profile found, returning general recommendations');
        return await this.getGeneralRecommendations(limit);
      }

      // Search for rooms matching user preferences
      const searchResults = await this.searchRooms({
        study_type: this.getPreferredStudyType(userProfile),
        has_space: true
      }, 1, limit * 2);

      // Calculate relevance scores and create recommendations
      const recommendations: StudyRoomRecommendation[] = await Promise.all(
        searchResults.rooms.map(async (room) => {
          const relevanceScore = await this.calculateRoomRelevance(room, userProfile);
          const matchingFactors = await this.analyzeMatchingFactors(room, userProfile);

          return {
            room,
            relevance_score: relevanceScore,
            matching_factors: matchingFactors
          };
        })
      );

      // Sort by relevance and return top results
      recommendations.sort((a, b) => b.relevance_score - a.relevance_score);
      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error getting room recommendations:', error);
      throw error;
    }
  }

  /**
   * Join a study room
   */
  async joinRoom(roomId: string, password?: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get room details
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError || !room) throw new Error('Room not found');

      // Check if room is private and validate password
      if (room.is_private && room.password_hash) {
        if (!password) throw new Error('Password required for private room');
        
        const isValidPassword = await this.validatePassword(password, room.password_hash);
        if (!isValidPassword) throw new Error('Invalid password');
      }

      // Check if room has space
      const { count: participantCount } = await supabase
        .from('study_room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('is_active', true);

      if ((participantCount || 0) >= room.max_participants) {
        throw new Error('Room is full');
      }

      // Check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('study_room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.user.id)
        .single();

      if (existingParticipant) {
        if (existingParticipant.is_active) {
          throw new Error('Already in this room');
        } else {
          // Reactivate participation
          await supabase
            .from('study_room_participants')
            .update({ is_active: true, joined_at: new Date().toISOString() })
            .eq('id', existingParticipant.id);
        }
      } else {
        // Add as new participant
        await supabase
          .from('study_room_participants')
          .insert([{
            room_id: roomId,
            user_id: user.user.id,
            role: 'participant',
            is_active: true
          }]);
      }

      logger.info('User joined room:', { roomId, userId: user.user.id });
    } catch (error) {
      logger.error('Error joining room:', error);
      throw error;
    }
  }

  /**
   * Leave a study room
   */
  async leaveRoom(roomId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('study_room_participants')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      logger.info('User left room:', { roomId, userId: user.user.id });
    } catch (error) {
      logger.error('Error leaving room:', error);
      throw error;
    }
  }

  /**
   * Send study room invite to friends
   */
  async inviteFriendsToRoom(roomId: string, friendIds: string[], message?: string): Promise<StudyInvite[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const invites: StudyInvite[] = [];

      for (const friendId of friendIds) {
        const { data, error } = await supabase
          .from('study_invites')
          .insert([{
            inviter_id: user.user.id,
            invitee_id: friendId,
            room_id: roomId,
            message,
            status: 'pending'
          }])
          .select(`
            *,
            inviter:inviter_id (id, first_name, last_name, avatar_url),
            invitee:invitee_id (id, first_name, last_name, avatar_url),
            room:room_id (id, name, subject, study_type)
          `)
          .single();

        if (!error && data) {
          invites.push(data);

          // Create notification
          await this.createNotification(friendId, {
            type: 'study_invite',
            title: 'Study Room Invitation',
            content: `${data.inviter.first_name} invited you to join a study room: ${data.room.name}`,
            metadata: {
              invite_id: data.id,
              room_id: roomId,
              inviter_id: user.user.id,
              room_name: data.room.name
            }
          });
        }
      }

      logger.info('Study invites sent:', { roomId, friendIds, count: invites.length });
      return invites;
    } catch (error) {
      logger.error('Error sending study invites:', error);
      throw error;
    }
  }

  /**
   * Accept study room invite
   */
  async acceptStudyInvite(inviteId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Update invite status
      const { data: invite, error } = await supabase
        .from('study_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId)
        .eq('invitee_id', user.user.id)
        .eq('status', 'pending')
        .select('room_id')
        .single();

      if (error || !invite) throw new Error('Invite not found or already processed');

      // Join the room
      await this.joinRoom(invite.room_id);

      logger.info('Study invite accepted:', { inviteId, roomId: invite.room_id });
    } catch (error) {
      logger.error('Error accepting study invite:', error);
      throw error;
    }
  }

  /**
   * Calculate room relevance score for a user
   */
  private async calculateRoomRelevance(
    room: StudyRoomEnhanced,
    userProfile: EnhancedProfile
  ): Promise<number> {
    let score = 0;
    const maxScore = 100;

    // Subject/Interest match (40 points)
    const userInterests = userProfile.interests || [];
    const roomSubject = room.subject.toLowerCase();
    const roomTags = (room.tags || []).map(tag => tag.toLowerCase());

    for (const interest of userInterests) {
      if (roomSubject.includes(interest.toLowerCase()) || 
          roomTags.some(tag => tag.includes(interest.toLowerCase()))) {
        score += 40;
        break;
      }
    }

    // Study type preference (20 points)
    const preferredStudyType = this.getPreferredStudyType(userProfile);
    if (room.study_type === preferredStudyType) {
      score += 20;
    }

    // Group size preference (15 points)
    const sizeDiff = Math.abs(room.max_participants - userProfile.preferred_group_size);
    if (sizeDiff === 0) score += 15;
    else if (sizeDiff <= 2) score += 10;
    else if (sizeDiff <= 4) score += 5;

    // Room availability (10 points)
    const currentParticipants = room.participant_count || 0;
    if (currentParticipants < room.max_participants) {
      const availabilityRatio = (room.max_participants - currentParticipants) / room.max_participants;
      score += availabilityRatio * 10;
    }

    // Recent activity (10 points)
    const roomAge = Date.now() - new Date(room.created_at).getTime();
    const hoursOld = roomAge / (1000 * 60 * 60);
    if (hoursOld < 24) score += 10;
    else if (hoursOld < 72) score += 5;

    // Scheduled time compatibility (5 points)
    if (room.scheduled_start) {
      const scheduledTime = new Date(room.scheduled_start);
      const now = new Date();
      const hoursDiff = Math.abs(scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff <= 2) score += 5;
      else if (hoursDiff <= 24) score += 3;
    } else {
      score += 5; // Immediate availability is good
    }

    return Math.min(maxScore, Math.round(score));
  }

  /**
   * Analyze matching factors between room and user
   */
  private async analyzeMatchingFactors(
    room: StudyRoomEnhanced,
    userProfile: EnhancedProfile
  ): Promise<any> {
    const userInterests = userProfile.interests || [];
    const roomTags = room.tags || [];
    
    const interestOverlap = userInterests.filter(interest =>
      room.subject.toLowerCase().includes(interest.toLowerCase()) ||
      roomTags.some(tag => tag.toLowerCase().includes(interest.toLowerCase()))
    );

    return {
      subject_match: interestOverlap.length > 0,
      difficulty_match: true, // Could add difficulty level matching logic
      size_preference_match: Math.abs(room.max_participants - userProfile.preferred_group_size) <= 2,
      time_compatibility: !room.scheduled_start || this.isTimeCompatible(room.scheduled_start, userProfile),
      interest_overlap: interestOverlap
    };
  }

  /**
   * Get general room recommendations when no user profile is available
   */
  private async getGeneralRecommendations(limit: number): Promise<StudyRoomRecommendation[]> {
    const searchResults = await this.searchRooms({ has_space: true }, 1, limit);
    
    return searchResults.rooms.map(room => ({
      room,
      relevance_score: 50, // Default score
      matching_factors: {
        subject_match: false,
        difficulty_match: true,
        size_preference_match: true,
        time_compatibility: true,
        interest_overlap: []
      }
    }));
  }

  /**
   * Determine preferred study type based on user profile
   */
  private getPreferredStudyType(userProfile: EnhancedProfile): string {
    // Logic to determine study type based on user preferences
    const preferences = userProfile.study_preferences || [];
    
    if (preferences.includes('exam_prep') || preferences.includes('testing')) {
      return 'exam_prep';
    }
    if (preferences.includes('homework') || preferences.includes('assignments')) {
      return 'homework';
    }
    if (preferences.includes('project') || preferences.includes('group_work')) {
      return 'project';
    }
    
    return 'general';
  }

  /**
   * Check if scheduled time is compatible with user availability
   */
  private isTimeCompatible(scheduledTime: string, userProfile: EnhancedProfile): boolean {
    // Simplified time compatibility check
    // In a real implementation, this would check against user's availability schedule
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    
    // Check if it's within reasonable hours (8 AM to 10 PM)
    const hour = scheduled.getHours();
    return hour >= 8 && hour <= 22;
  }

  /**
   * Hash password for private rooms
   */
  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production, use proper bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate password for private rooms
   */
  private async validatePassword(password: string, hash: string): Promise<boolean> {
    const providedHash = await this.hashPassword(password);
    return providedHash === hash;
  }

  /**
   * Create a notification
   */
  private async createNotification(
    userId: string,
    notification: any
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
}

export const enhancedRoomMatchingService = EnhancedRoomMatchingService.getInstance();