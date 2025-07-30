import React from 'react';
import { CheckCircle, X, Clock, Loader2 } from 'lucide-react';
import { Friendship } from '../../types/enhanced-study';
import { formatDistanceToNow } from 'date-fns';

interface FriendRequestCardProps {
  request: Friendship;
  type: 'received' | 'sent';
  onAccept?: () => void;
  onDecline?: () => void;
  loading?: boolean;
}

export default function FriendRequestCard({ 
  request, 
  type, 
  onAccept, 
  onDecline, 
  loading = false 
}: FriendRequestCardProps) {
  const user = type === 'received' ? request.requester : request.addressee;
  
  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 
                    dark:border-gray-700 p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <img
          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(
            `${user.first_name || ''} ${user.last_name || ''}`
          )}&background=10b981&color=fff`}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-12 h-12 rounded-full object-cover"
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {user.first_name} {user.last_name}
              </h3>
              {user.major && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {user.major}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {type === 'received' ? 'Received' : 'Sent'} {' '}
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Actions */}
            {type === 'received' && (
              <div className="flex gap-2">
                <button
                  onClick={onAccept}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white 
                           rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Accept
                </button>
                <button
                  onClick={onDecline}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white 
                           rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            )}

            {type === 'sent' && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
            )}
          </div>

          {/* Request Message */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {type === 'received' 
                ? `${user.first_name} wants to connect and study together`
                : `Waiting for ${user.first_name} to respond to your friend request`
              }
            </p>
          </div>

          {/* Student Information */}
          {user.student_id && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Student ID: {user.student_id}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}