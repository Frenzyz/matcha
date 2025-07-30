import React, { useState } from 'react';
import { 
  MessageCircle, 
  UserPlus, 
  Star, 
  Clock, 
  BookOpen, 
  Users,
  CheckCircle,
  Hourglass,
  X
} from 'lucide-react';
import { UserProfile, EnhancedProfile } from '../../types/enhanced-study';
import { friendSystemService } from '../../services/friendSystem';
import { directMessagingService } from '../../services/directMessaging';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

interface UserCardProps {
  user: UserProfile;
  enhanced_profile?: EnhancedProfile;
  compatibility_score?: number;
  common_interests?: string[];
  availability_match?: boolean;
  show_actions?: boolean;
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  onClick?: () => void;
}

export default function UserCard({
  user,
  enhanced_profile,
  compatibility_score,
  common_interests = [],
  availability_match,
  show_actions = true,
  friendship_status = 'none',
  onClick
}: UserCardProps) {
  const { user: currentUser } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentFriendshipStatus, setCurrentFriendshipStatus] = useState(friendship_status);

  const handleSendFriendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      setActionLoading('friend_request');
      await friendSystemService.sendFriendRequest(user.id);
      setCurrentFriendshipStatus('pending_sent');
      logger.info('Friend request sent successfully');
    } catch (error) {
      logger.error('Error sending friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptFriendRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Note: This would need the friendship ID, which would come from a different component
    // For now, this is a placeholder
    try {
      setActionLoading('accept_friend');
      // await friendSystemService.acceptFriendRequest(friendshipId);
      setCurrentFriendshipStatus('friends');
    } catch (error) {
      logger.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      setActionLoading('message');
      // In a real implementation, this would open the messaging interface
      // For now, we'll just log
      logger.info('Opening message interface for user:', user.id);
    } catch (error) {
      logger.error('Error opening message interface:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const renderFriendshipButton = () => {
    switch (currentFriendshipStatus) {
      case 'friends':
        return (
          <button
            onClick={handleSendMessage}
            disabled={actionLoading === 'message'}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white 
                     rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
        );
      
      case 'pending_sent':
        return (
          <button
            disabled
            className="flex items-center gap-2 px-3 py-2 bg-gray-400 text-white 
                     rounded-lg cursor-not-allowed"
          >
            <Hourglass className="w-4 h-4" />
            Pending
          </button>
        );
      
      case 'pending_received':
        return (
          <div className="flex gap-2">
            <button
              onClick={handleAcceptFriendRequest}
              disabled={actionLoading === 'accept_friend'}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white 
                       rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </button>
            <button
              className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white 
                       rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>
        );
      
      default:
        return (
          <button
            onClick={handleSendFriendRequest}
            disabled={actionLoading === 'friend_request'}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white 
                     rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        );
    }
  };

  const getCompatibilityColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getCompatibilityLabel = (score?: number) => {
    if (!score) return 'No data';
    if (score >= 80) return 'High match';
    if (score >= 60) return 'Good match';
    return 'Fair match';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md 
                transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700
                ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img
            src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(
              `${user.first_name || ''} ${user.last_name || ''}`
            )}&background=10b981&color=fff`}
            alt={`${user.first_name} ${user.last_name}`}
            className="w-12 h-12 rounded-full object-cover"
          />
          {enhanced_profile?.is_available_now && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 
                          border-white dark:border-gray-800 rounded-full"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {user.first_name} {user.last_name}
          </h3>
          {user.major && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.major}
            </p>
          )}
          {enhanced_profile?.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
              {enhanced_profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Compatibility Score */}
      {compatibility_score !== undefined && (
        <div className="flex items-center gap-2 mb-3">
          <Star className={`w-4 h-4 ${getCompatibilityColor(compatibility_score)}`} />
          <span className={`text-sm font-medium ${getCompatibilityColor(compatibility_score)}`}>
            {compatibility_score}% - {getCompatibilityLabel(compatibility_score)}
          </span>
        </div>
      )}

      {/* Study Information */}
      {enhanced_profile && (
        <div className="space-y-2 mb-4">
          {enhanced_profile.study_style && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <BookOpen className="w-4 h-4" />
              <span className="capitalize">{enhanced_profile.study_style} learner</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Users className="w-4 h-4" />
            <span>Prefers groups of {enhanced_profile.preferred_group_size}</span>
          </div>

          {availability_match && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Clock className="w-4 h-4" />
              <span>Available now</span>
            </div>
          )}
        </div>
      )}

      {/* Common Interests */}
      {common_interests.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Common interests:
          </p>
          <div className="flex flex-wrap gap-1">
            {common_interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 
                         text-emerald-800 dark:text-emerald-300 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {common_interests.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 
                             text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{common_interests.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interests Tags */}
      {enhanced_profile?.interests && enhanced_profile.interests.length > 0 && common_interests.length === 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Interests:
          </p>
          <div className="flex flex-wrap gap-1">
            {enhanced_profile.interests.slice(0, 3).map((interest, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 
                         text-gray-600 dark:text-gray-400 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {enhanced_profile.interests.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 
                             text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{enhanced_profile.interests.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {show_actions && currentUser?.id !== user.id && (
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
          {renderFriendshipButton()}
        </div>
      )}
    </div>
  );
}