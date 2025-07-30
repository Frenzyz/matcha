import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { friendSystemService } from '../../services/friendSystem';
import { UserProfile, Friendship, FriendsListResponse } from '../../types/enhanced-study';
import { Users, Search, UserPlus, MessageCircle, Loader2, UserMinus } from 'lucide-react';
import FriendCard from './FriendCard';
import FriendRequestCard from './FriendRequestCard';

interface FriendsListProps {
  onMessageFriend?: (friendId: string) => void;
  onInviteToStudy?: (friendId: string) => void;
}

export default function FriendsList({ onMessageFriend, onInviteToStudy }: FriendsListProps) {
  const { user } = useAuth();
  const [friendsData, setFriendsData] = useState<FriendsListResponse>({
    friends: [],
    pending_requests: [],
    sent_requests: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFriends();
      // Set up real-time subscription
      const unsubscribe = friendSystemService.subscribeToFriendshipUpdates(
        user.id,
        handleFriendshipUpdate
      );
      return unsubscribe;
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await friendSystemService.getFriendsList();
      setFriendsData(data);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendshipUpdate = (friendship: Friendship) => {
    // Reload friends list when there's an update
    loadFriends();
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      await friendSystemService.acceptFriendRequest(friendshipId);
      await loadFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      setActionLoading(friendshipId);
      await friendSystemService.declineFriendRequest(friendshipId);
      await loadFriends();
    } catch (error) {
      console.error('Error declining friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      setActionLoading(friendId);
      await friendSystemService.removeFriend(friendId);
      await loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearchFriends = async (query: string) => {
    try {
      if (!query.trim()) {
        await loadFriends();
        return;
      }
      
      const searchResults = await friendSystemService.searchFriends(query);
      setFriendsData(prev => ({
        ...prev,
        friends: searchResults
      }));
    } catch (error) {
      console.error('Error searching friends:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'friends') {
        handleSearchFriends(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab]);

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'friends':
        return friendsData.friends.length;
      case 'requests':
        return friendsData.pending_requests.length;
      case 'sent':
        return friendsData.sent_requests.length;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <Users className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-semibold dark:text-white">Friends & Connections</h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Friends
            {getTabCount('friends') > 0 && (
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 
                             px-2 py-0.5 rounded-full text-xs">
                {getTabCount('friends')}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Requests
            {getTabCount('requests') > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 
                             px-2 py-0.5 rounded-full text-xs">
                {getTabCount('requests')}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Sent
            {getTabCount('sent') > 0 && (
              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 
                             px-2 py-0.5 rounded-full text-xs">
                {getTabCount('sent')}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar (only for friends tab) */}
        {activeTab === 'friends' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'friends' && (
          <>
            {friendsData.friends.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {friendsData.friends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onMessage={() => onMessageFriend?.(friend.id)}
                    onInviteToStudy={() => onInviteToStudy?.(friend.id)}
                    onRemove={() => handleRemoveFriend(friend.id)}
                    loading={actionLoading === friend.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Start by discovering and adding study partners'
                  }
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <>
            {friendsData.pending_requests.length > 0 ? (
              <div className="space-y-4">
                {friendsData.pending_requests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="received"
                    onAccept={() => handleAcceptRequest(request.id)}
                    onDecline={() => handleDeclineRequest(request.id)}
                    loading={actionLoading === request.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No pending requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  When someone sends you a friend request, it will appear here
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {friendsData.sent_requests.length > 0 ? (
              <div className="space-y-4">
                {friendsData.sent_requests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="sent"
                    loading={actionLoading === request.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No sent requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Friend requests you send will appear here while pending
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}