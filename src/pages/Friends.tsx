import React from 'react';
import FriendsList from '../components/friends/FriendsList';
import { useNavigate } from 'react-router-dom';

export default function Friends() {
  const navigate = useNavigate();

  const handleMessageFriend = (friendId: string) => {
    // In the future, this could navigate to a direct messaging interface
    // For now, we'll show a placeholder
    console.log('Opening message interface for friend:', friendId);
    // navigate(`/messages/${friendId}`);
  };

  const handleInviteToStudy = (friendId: string) => {
    // Navigate to group study with pre-selected friend to invite
    navigate('/group-study', { state: { inviteFriend: friendId } });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <FriendsList
        onMessageFriend={handleMessageFriend}
        onInviteToStudy={handleInviteToStudy}
      />
    </div>
  );
}