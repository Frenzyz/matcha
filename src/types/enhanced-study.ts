// Enhanced Types for Comprehensive Group Study Framework

export interface EnhancedProfile {
  user_id: string;
  study_preferences: string[];
  interests: string[];
  availability: WeeklyAvailability;
  study_style: 'collaborative' | 'independent' | 'hybrid';
  preferred_group_size: number;
  bio?: string;
  timezone: string;
  is_available_now: boolean;
  is_searchable: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyAvailability {
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
}

export interface DayAvailability {
  available: boolean;
  time_slots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  major?: string;
  avatar_url?: string;
  theme_color?: string;
  setup_completed?: boolean;
  created_at: string;
  updated_at: string;
  last_seen?: string;
  enhanced_profile?: EnhancedProfile;
}

export interface StudyRoomEnhanced {
  id: string;
  name: string;
  subject: string;
  description?: string;
  status: 'active' | 'ended' | 'private';
  created_by: string;
  max_participants: number;
  study_type: 'exam_prep' | 'homework' | 'project' | 'general';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  is_private: boolean;
  password_hash?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  participants?: StudyRoomParticipantEnhanced[];
  creator?: UserProfile;
}

export interface StudyRoomParticipantEnhanced {
  id: string;
  room_id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'participant';
  joined_at: string;
  is_active: boolean;
  video_enabled: boolean;
  audio_enabled: boolean;
  user?: UserProfile;
}

export interface StudyRoomMessageEnhanced {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  metadata: Record<string, any>;
  created_at: string;
  user?: UserProfile;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  requester?: UserProfile;
  addressee?: UserProfile;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'file' | 'call_invite';
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
}

export interface StudyInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  room_id: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
  inviter?: UserProfile;
  invitee?: UserProfile;
  room?: StudyRoomEnhanced;
}

export interface NotificationData {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'message' | 'study_invite' | 'room_invite';
  title: string;
  content?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface VideoCallSession {
  id: string;
  room_id: string;
  participants: string[];
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  quality_rating?: number;
}

export interface UserSearchResult {
  user: UserProfile;
  enhanced_profile?: EnhancedProfile;
  compatibility_score?: number;
  common_interests: string[];
  availability_match?: boolean;
}

export interface UserSearchFilters {
  query?: string;
  major?: string;
  interests?: string[];
  study_style?: 'collaborative' | 'independent' | 'hybrid';
  availability_now?: boolean;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  preferred_group_size?: number;
  timezone?: string;
}

export interface StudyRoomFilters {
  subject?: string;
  study_type?: 'exam_prep' | 'homework' | 'project' | 'general';
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  max_participants?: number;
  tags?: string[];
  has_space?: boolean;
  scheduled_only?: boolean;
}

export interface ChatConversation {
  participant: UserProfile;
  last_message: DirectMessage;
  unread_count: number;
  last_activity: string;
}

export interface CallInviteData {
  type: 'voice' | 'video' | 'study_room';
  caller: UserProfile;
  room_id?: string;
  timestamp: string;
}

export interface StudyMatchRecommendation {
  user: UserProfile;
  compatibility_score: number;
  matching_factors: {
    common_interests: string[];
    study_style_match: boolean;
    availability_overlap: number;
    similar_major: boolean;
    preferred_group_size_match: boolean;
  };
  suggested_study_topics: string[];
}

export interface StudyRoomRecommendation {
  room: StudyRoomEnhanced;
  relevance_score: number;
  matching_factors: {
    subject_match: boolean;
    difficulty_match: boolean;
    size_preference_match: boolean;
    time_compatibility: boolean;
    interest_overlap: string[];
  };
}

// API Response Types
export interface SearchUsersResponse {
  users: UserSearchResult[];
  total_count: number;
  page: number;
  page_size: number;
  filters_applied: UserSearchFilters;
}

export interface SearchRoomsResponse {
  rooms: StudyRoomEnhanced[];
  total_count: number;
  page: number;
  page_size: number;
  filters_applied: StudyRoomFilters;
}

export interface FriendsListResponse {
  friends: UserProfile[];
  pending_requests: Friendship[];
  sent_requests: Friendship[];
}

export interface ConversationsResponse {
  conversations: ChatConversation[];
  total_count: number;
}

// Event Types for Real-time Updates
export interface RealTimeEvent {
  type: 'friend_request' | 'friend_accepted' | 'message_received' | 'study_invite' | 'room_joined' | 'room_left' | 'user_online' | 'user_offline';
  data: any;
  timestamp: string;
}

export interface FriendRequestEvent extends RealTimeEvent {
  type: 'friend_request';
  data: Friendship;
}

export interface MessageReceivedEvent extends RealTimeEvent {
  type: 'message_received';
  data: DirectMessage;
}

export interface StudyInviteEvent extends RealTimeEvent {
  type: 'study_invite';
  data: StudyInvite;
}

// UI Component Props Types
export interface UserCardProps {
  user: UserProfile;
  enhanced_profile?: EnhancedProfile;
  show_actions?: boolean;
  is_friend?: boolean;
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  on_send_friend_request?: (user_id: string) => void;
  on_accept_friend_request?: (friendship_id: string) => void;
  on_message?: (user_id: string) => void;
  on_invite_to_study?: (user_id: string) => void;
}

export interface StudyRoomCardProps {
  room: StudyRoomEnhanced;
  show_actions?: boolean;
  can_join?: boolean;
  on_join?: (room_id: string) => void;
  on_invite_friends?: (room_id: string) => void;
}

export interface MessageBubbleProps {
  message: DirectMessage;
  is_own_message: boolean;
  show_timestamp?: boolean;
  show_avatar?: boolean;
}

// Form Types
export interface CreateRoomFormData {
  name: string;
  subject: string;
  description?: string;
  study_type: 'exam_prep' | 'homework' | 'project' | 'general';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  max_participants: number;
  tags: string[];
  is_private: boolean;
  password?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface UpdateProfileFormData {
  study_preferences: string[];
  interests: string[];
  availability: WeeklyAvailability;
  study_style: 'collaborative' | 'independent' | 'hybrid';
  preferred_group_size: number;
  bio?: string;
  timezone: string;
  is_searchable: boolean;
}

// Error Types
export interface StudyFrameworkError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError extends StudyFrameworkError {
  field: string;
  validation_type: 'required' | 'format' | 'length' | 'custom';
}

// Utility Types
export type StudyRoomStatus = StudyRoomEnhanced['status'];
export type FriendshipStatus = Friendship['status'];
export type MessageType = DirectMessage['message_type'];
export type NotificationType = NotificationData['type'];
export type StudyStyle = EnhancedProfile['study_style'];
export type DifficultyLevel = StudyRoomEnhanced['difficulty_level'];
export type StudyType = StudyRoomEnhanced['study_type'];

// Hook Return Types
export interface UseUserSearchReturn {
  results: UserSearchResult[];
  loading: boolean;
  error: string | null;
  total_count: number;
  search: (filters: UserSearchFilters, page?: number) => Promise<void>;
  clear: () => void;
}

export interface UseFriendsReturn {
  friends: UserProfile[];
  pending_requests: Friendship[];
  sent_requests: Friendship[];
  loading: boolean;
  error: string | null;
  send_friend_request: (user_id: string) => Promise<void>;
  accept_friend_request: (friendship_id: string) => Promise<void>;
  decline_friend_request: (friendship_id: string) => Promise<void>;
  remove_friend: (user_id: string) => Promise<void>;
}

export interface UseDirectMessagesReturn {
  conversations: ChatConversation[];
  current_conversation: DirectMessage[];
  loading: boolean;
  error: string | null;
  send_message: (receiver_id: string, content: string, type?: MessageType) => Promise<void>;
  load_conversation: (user_id: string) => Promise<void>;
  mark_as_read: (user_id: string) => Promise<void>;
}