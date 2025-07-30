import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  UserSearchResult,
  UserSearchFilters,
  SearchUsersResponse,
  UserProfile,
  EnhancedProfile,
  StudyMatchRecommendation
} from '../types/enhanced-study';

export class UserSearchService {
  private static instance: UserSearchService;

  static getInstance(): UserSearchService {
    if (!UserSearchService.instance) {
      UserSearchService.instance = new UserSearchService();
    }
    return UserSearchService.instance;
  }

  /**
   * Search for users based on various filters with intelligent matching
   */
  async searchUsers(
    filters: UserSearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchUsersResponse> {
    try {
      const offset = (page - 1) * pageSize;
      let query = supabase
        .from('enhanced_profiles')
        .select(`
          *,
          profiles (
            id,
            email,
            first_name,
            last_name,
            student_id,
            major,
            avatar_url,
            theme_color,
            created_at,
            updated_at,
            last_seen
          )
        `)
        .eq('is_searchable', true)
        .neq('user_id', (await supabase.auth.getUser()).data.user?.id);

      // Apply filters
      if (filters.availability_now) {
        query = query.eq('is_available_now', true);
      }

      if (filters.study_style) {
        query = query.eq('study_style', filters.study_style);
      }

      if (filters.preferred_group_size) {
        query = query.eq('preferred_group_size', filters.preferred_group_size);
      }

      if (filters.timezone) {
        query = query.eq('timezone', filters.timezone);
      }

      // Handle text search - make it more robust
      if (filters.query) {
        const searchQuery = filters.query.trim().toLowerCase();
        if (searchQuery) {
          try {
            // First try full-text search on the search cache
            const { data: searchResults, error: searchError } = await supabase
              .from('user_search_cache')
              .select('user_id')
              .textSearch('search_vector', searchQuery);

            let userIds: string[] = [];
            
            if (!searchError && searchResults && searchResults.length > 0) {
              userIds = searchResults.map(result => result.user_id);
            } else {
              // Fallback to case-insensitive search on profiles
              const { data: profileResults, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,major.ilike.%${searchQuery}%`);
              
              if (!profileError && profileResults) {
                userIds = profileResults.map(p => p.id);
              }
            }

            if (userIds.length > 0) {
              query = query.in('user_id', userIds);
            } else {
              // If still no results, return empty result but with correct structure
              return {
                users: [],
                total_count: 0,
                page,
                page_size: pageSize,
                filters_applied: filters
              };
            }
          } catch (error) {
            logger.error('Search error, falling back to basic query:', error);
            // Continue with the base query if search fails
          }
        }
      }

      // Apply major filter after getting base results
      const { data: baseResults, error, count } = await query
        .range(offset, offset + pageSize - 1)
        .order('last_active', { ascending: false });

      if (error) throw error;

      let results = baseResults || [];

      // Filter by major if specified
      if (filters.major) {
        results = results.filter(profile => 
          profile.profiles?.major?.toLowerCase().includes(filters.major!.toLowerCase())
        );
      }

      // Filter by interests if specified
      if (filters.interests && filters.interests.length > 0) {
        results = results.filter(profile => {
          const userInterests = profile.interests || [];
          return filters.interests!.some(interest => 
            userInterests.some(userInterest => 
              userInterest.toLowerCase().includes(interest.toLowerCase())
            )
          );
        });
      }

      // Transform results and calculate compatibility scores
      const userResults: UserSearchResult[] = await Promise.all(
        results.map(async (profile) => {
          const user: UserProfile = {
            id: profile.user_id,
            email: profile.profiles.email,
            first_name: profile.profiles.first_name,
            last_name: profile.profiles.last_name,
            student_id: profile.profiles.student_id,
            major: profile.profiles.major,
            avatar_url: profile.profiles.avatar_url,
            theme_color: profile.profiles.theme_color,
            setup_completed: true,
            created_at: profile.profiles.created_at,
            updated_at: profile.profiles.updated_at,
            last_seen: profile.profiles.last_seen,
          };

          const enhanced_profile: EnhancedProfile = {
            user_id: profile.user_id,
            study_preferences: profile.study_preferences || [],
            interests: profile.interests || [],
            availability: profile.availability || {},
            study_style: profile.study_style,
            preferred_group_size: profile.preferred_group_size,
            bio: profile.bio,
            timezone: profile.timezone,
            is_available_now: profile.is_available_now,
            is_searchable: profile.is_searchable,
            last_active: profile.last_active,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          };

          const compatibility_score = await this.calculateCompatibilityScore(
            enhanced_profile,
            filters
          );

          const common_interests = this.findCommonInterests(
            enhanced_profile.interests,
            filters.interests || []
          );

          const availability_match = this.checkAvailabilityMatch(
            enhanced_profile,
            filters
          );

          return {
            user,
            enhanced_profile,
            compatibility_score,
            common_interests,
            availability_match
          };
        })
      );

      // Sort by compatibility score
      userResults.sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));

      return {
        users: userResults,
        total_count: count || results.length,
        page,
        page_size: pageSize,
        filters_applied: filters
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get personalized study match recommendations
   */
  async getStudyRecommendations(
    limit: number = 10
  ): Promise<StudyMatchRecommendation[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get current user's enhanced profile
      const { data: currentProfile, error: profileError } = await supabase
        .from('enhanced_profiles')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      let profileToUse = currentProfile;

      if (profileError || !currentProfile) {
        // Create a default enhanced profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('enhanced_profiles')
          .insert([{
            user_id: user.user.id,
            study_preferences: ['general', 'homework'],
            interests: ['Computer Science', 'Mathematics'],
            study_style: 'collaborative',
            preferred_group_size: 4,
            is_searchable: true,
            is_available_now: false
          }])
          .select()
          .single();

        if (createError || !newProfile) {
          // If we still can't create/get a profile, return general recommendations
          return await this.getGeneralRecommendations(limit);
        }
        
        profileToUse = newProfile;
      }

      // Search for compatible users
      const searchResults = await this.searchUsers({
        study_style: profileToUse.study_style,
        preferred_group_size: profileToUse.preferred_group_size,
        interests: profileToUse.interests,
        availability_now: true
      }, 1, limit * 2); // Get more results to filter from

      // Transform to recommendations with detailed matching factors
      const recommendations: StudyMatchRecommendation[] = searchResults.users.map(result => {
        const matchingFactors = {
          common_interests: result.common_interests,
          study_style_match: result.enhanced_profile?.study_style === profileToUse.study_style,
          availability_overlap: this.calculateAvailabilityOverlap(
            profileToUse.availability || {},
            result.enhanced_profile?.availability || {}
          ),
          similar_major: result.user.major === profileToUse.major,
          preferred_group_size_match: Math.abs(
            (result.enhanced_profile?.preferred_group_size || 4) - profileToUse.preferred_group_size
          ) <= 2
        };

        const suggested_study_topics = this.suggestStudyTopics(
          profileToUse.interests || [],
          result.enhanced_profile?.interests || []
        );

        return {
          user: result.user,
          compatibility_score: result.compatibility_score || 0,
          matching_factors,
          suggested_study_topics
        };
      });

      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error getting study recommendations:', error);
      throw new Error('Failed to get study recommendations');
    }
  }

  /**
   * Calculate compatibility score between users
   */
  private async calculateCompatibilityScore(
    profile: EnhancedProfile,
    filters: UserSearchFilters
  ): Promise<number> {
    let score = 0;
    const maxScore = 100;

    // Get current user's profile for comparison
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return score;

    const { data: currentProfile } = await supabase
      .from('enhanced_profiles')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (!currentProfile) return 50; // Return a default score if no profile exists

    // Study style compatibility (20 points)
    if (profile.study_style === currentProfile.study_style) {
      score += 20;
    } else if (
      (profile.study_style === 'hybrid' && currentProfile.study_style !== 'hybrid') ||
      (currentProfile.study_style === 'hybrid' && profile.study_style !== 'hybrid')
    ) {
      score += 10;
    }

    // Common interests (30 points)
    const commonInterests = this.findCommonInterests(
      profile.interests,
      currentProfile.interests || []
    );
    const interestScore = Math.min(30, (commonInterests.length / Math.max(1, currentProfile.interests?.length || 1)) * 30);
    score += interestScore;

    // Group size preference (15 points)
    const sizeDiff = Math.abs(profile.preferred_group_size - currentProfile.preferred_group_size);
    if (sizeDiff === 0) score += 15;
    else if (sizeDiff <= 2) score += 10;
    else if (sizeDiff <= 4) score += 5;

    // Availability overlap (20 points)
    const availabilityScore = this.calculateAvailabilityOverlap(
      profile.availability,
      currentProfile.availability || {}
    );
    score += availabilityScore * 20;

    // Current availability (10 points)
    if (profile.is_available_now) {
      score += 10;
    }

    // Recent activity (5 points)
    const lastActive = new Date(profile.last_active);
    const now = new Date();
    const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
    if (hoursSinceActive < 24) score += 5;
    else if (hoursSinceActive < 72) score += 3;

    return Math.min(maxScore, Math.round(score));
  }

  /**
   * Find common interests between two arrays
   */
  private findCommonInterests(interests1: string[], interests2: string[]): string[] {
    return interests1.filter(interest1 =>
      interests2.some(interest2 =>
        interest1.toLowerCase().includes(interest2.toLowerCase()) ||
        interest2.toLowerCase().includes(interest1.toLowerCase())
      )
    );
  }

  /**
   * Check if availability matches current time or specified filters
   */
  private checkAvailabilityMatch(
    profile: EnhancedProfile,
    filters: UserSearchFilters
  ): boolean {
    if (filters.availability_now) {
      return profile.is_available_now;
    }

    // Could add more sophisticated availability matching logic here
    return true;
  }

  /**
   * Calculate overlap between two availability schedules (0-1 score)
   */
  private calculateAvailabilityOverlap(
    availability1: any,
    availability2: any
  ): number {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let totalOverlap = 0;
    let totalDays = 0;

    for (const day of days) {
      const day1 = availability1[day];
      const day2 = availability2[day];

      if (day1?.available && day2?.available) {
        // Calculate time slot overlap
        const slots1 = day1.time_slots || [];
        const slots2 = day2.time_slots || [];
        
        let dayOverlap = 0;
        for (const slot1 of slots1) {
          for (const slot2 of slots2) {
            const overlap = this.calculateTimeSlotOverlap(slot1, slot2);
            dayOverlap = Math.max(dayOverlap, overlap);
          }
        }
        totalOverlap += dayOverlap;
      }
      totalDays++;
    }

    return totalDays > 0 ? totalOverlap / totalDays : 0;
  }

  /**
   * Calculate overlap between two time slots (0-1 score)
   */
  private calculateTimeSlotOverlap(slot1: any, slot2: any): number {
    const start1 = this.timeToMinutes(slot1.start);
    const end1 = this.timeToMinutes(slot1.end);
    const start2 = this.timeToMinutes(slot2.start);
    const end2 = this.timeToMinutes(slot2.end);

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapStart >= overlapEnd) return 0;

    const overlapDuration = overlapEnd - overlapStart;
    const maxDuration = Math.max(end1 - start1, end2 - start2);

    return overlapDuration / maxDuration;
  }

  /**
   * Convert HH:MM time string to minutes since midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Suggest study topics based on common interests
   */
  private suggestStudyTopics(interests1: string[], interests2: string[]): string[] {
    const commonInterests = this.findCommonInterests(interests1, interests2);
    
    // Add some related topics based on common interests
    const suggestions = new Set(commonInterests);
    
    commonInterests.forEach(interest => {
      // Add related study topics based on the interest
      if (interest.toLowerCase().includes('math')) {
        suggestions.add('Problem Solving');
        suggestions.add('Study Groups');
      }
      if (interest.toLowerCase().includes('computer') || interest.toLowerCase().includes('programming')) {
        suggestions.add('Code Review');
        suggestions.add('Algorithm Practice');
      }
      if (interest.toLowerCase().includes('science')) {
        suggestions.add('Lab Work');
        suggestions.add('Research Discussion');
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Update user's search cache for better performance
   */
  async updateSearchCache(userId: string): Promise<void> {
    try {
      // Trigger the update by updating the enhanced profile
      const { error } = await supabase
        .from('enhanced_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      logger.info('Search cache updated for user:', userId);
    } catch (error) {
      logger.error('Error updating search cache:', error);
      throw new Error('Failed to update search cache');
    }
  }

  /**
   * Get users by specific IDs (useful for friends lists, etc.)
   */
  async getUsersByIds(userIds: string[]): Promise<UserProfile[]> {
    try {
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          student_id,
          major,
          avatar_url,
          theme_color,
          created_at,
          updated_at,
          last_seen,
          enhanced_profiles (*)
        `)
        .in('id', userIds);

      if (error) throw error;

      return (data || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        student_id: profile.student_id,
        major: profile.major,
        avatar_url: profile.avatar_url,
        theme_color: profile.theme_color,
        setup_completed: true,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        last_seen: profile.last_seen,
        enhanced_profile: profile.enhanced_profiles?.[0] || undefined
      }));
    } catch (error) {
      logger.error('Error getting users by IDs:', error);
      throw new Error('Failed to get users');
    }
  }
}

export const userSearchService = UserSearchService.getInstance();