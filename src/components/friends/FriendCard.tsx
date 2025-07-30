import React, { useState } from 'react';
import { 
  MessageCircle, 
  UserPlus, 
  MoreVertical, 
  UserMinus,
  Clock,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../../types/enhanced-study';
import { formatDistanceToNow } from 'date-fns';

interface FriendCardProps {
  friend: UserProfile;
  onMessage: () => void;
  onInviteToStudy: () => void;
  onRemove: () => void;
  loading?: boolean;
}

export default function FriendCard({ 
  friend, 
  onMessage, 
  onInviteToStudy, 
  onRemove, 
  loading = false 
}: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = () => {
    if (!friend.last_seen) return 'bg-gray-400';
    
    const lastSeen = new Date(friend.last_seen);
    const now = new Date();
    const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (minutesAgo < 5) return 'bg-green-500';
    if (minutesAgo < 30) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (!friend.last_seen) return 'Unknown';
    
    const lastSeen = new Date(friend.last_seen);
    const now = new Date();
    const minutesAgo = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (minutesAgo < 5) return 'Online';
    if (minutesAgo < 30) return 'Recently active';
    return `Last seen ${formatDistanceToNow(lastSeen, { addSuffix: true })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md 
                    transition-all duration-300 p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img
            src={friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(
              `${friend.first_name || ''} ${friend.last_name || ''}`
            )}&background=10b981&color=fff`}
            alt={`${friend.first_name} ${friend.last_name}`}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} 
                          border-2 border-white dark:border-gray-800 rounded-full`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {friend.first_name} {friend.last_name}
          </h3>
          {friend.major && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {friend.major}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 border dark:border-gray-600 
                          rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={() => {
                  onRemove();
                  setShowMenu(false);
                }}
                disabled={loading}
                className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 
                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                         disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
                Remove Friend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Information */}
      {friend.student_id && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Student ID: {friend.student_id}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onMessage}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white 
                   rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-1"
        >
          <MessageCircle className="w-4 h-4" />
          Message
        </button>
        
        <button
          onClick={onInviteToStudy}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white 
                   rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex-1"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}