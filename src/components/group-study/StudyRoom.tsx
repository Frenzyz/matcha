import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import VideoCall from './VideoCall';
import ChatRoom from './chat/ChatRoom';
import { ArrowLeft, Users, Trash2, Loader2 } from 'lucide-react';
import { StudyRoom as StudyRoomType } from '../../types/study-room';
import { logger } from '../../utils/logger';

interface StudyRoomProps {
  roomId: string;
  onLeave: () => void;
}

const ADMIN_USER_ID = '8136b447-829e-41f7-8ade-e3a0bba52703';

export default function StudyRoom({ roomId, onLeave }: StudyRoomProps) {
  const [room, setRoom] = useState<StudyRoomType | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadRoom();
      const subscription = subscribeToRoomUpdates();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Room not found');
      setRoom(data);
    } catch (error) {
      logger.error('Error loading room:', error);
      setError('Failed to load study room');
      onLeave();
    }
  };

  const subscribeToRoomUpdates = () => {
    const channel = supabase
      .channel(`study_rooms_channel`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_rooms'
        },
        async (payload) => {
          await loadRoom();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to room updates');
        }
      });

    return channel;
  };

  const handleDeleteRoom = async () => {
    if (!user || user.id !== ADMIN_USER_ID || !room) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('study_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      onLeave();
    } catch (error) {
      logger.error('Error deleting room:', error);
      setError('Failed to delete room');
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={onLeave}
          className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeave}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold dark:text-white">{room.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{room.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-gray-500" />
              <span className="text-sm text-gray-500">{participants.length} online</span>
            </div>
            {user?.id === ADMIN_USER_ID && (
              <button
                onClick={handleDeleteRoom}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete Room'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 p-4 min-h-0">
        <div className="col-span-2 min-h-0">
          <VideoCall roomId={roomId} participants={participants} />
        </div>
        <div className="col-span-1 min-h-0 flex flex-col">
          {user && <ChatRoom roomId={roomId} userId={user.id} />}
        </div>
      </div>
    </div>
  );
}
