import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeatureStore } from '../store/featureStore';
import StudyRoomList from '../components/group-study/StudyRoomList';
import StudyRoom from '../components/group-study/StudyRoom';
import CreateRoomModal from '../components/group-study/CreateRoomModal';
import JoinRoomModal from '../components/group-study/JoinRoomModal';
import { Plus } from 'lucide-react';
import { supabase } from '../config/supabase';
import { StudyRoom as StudyRoomType } from '../types/study-room';
import { logger } from '../utils/logger';

export default function GroupStudy() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<StudyRoomType[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { groupStudyEnabled } = useFeatureStore();

  useEffect(() => {
    if (!groupStudyEnabled) {
      navigate('/settings');
    }
  }, [groupStudyEnabled, navigate]);

  useEffect(() => {
    if (user) {
      loadRooms();
      const subscription = subscribeToRoomUpdates();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      logger.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRoomUpdates = () => {
    const channel = supabase
      .channel('study_rooms_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_rooms'
        },
        async () => {
          await loadRooms();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to room updates');
        }
      });

    return channel;
  };

  const handleCreateRoom = async (roomData: Partial<StudyRoomType>) => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('study_rooms')
        .insert([{
          ...roomData,
          created_by: user.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      setSelectedRoom(data.id);
      setShowJoinModal(true);
    } catch (error) {
      logger.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    setShowJoinModal(true);
  };

  const handleJoinWithOptions = (withVideo: boolean, withAudio: boolean) => {
    setShowJoinModal(false);
    // The selected room and media preferences will be handled by the StudyRoom component
  };

  const handleRoomDeleted = (roomId: string) => {
    // Remove the deleted room from local state
    setRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
    
    // If the deleted room was selected, close it
    if (selectedRoom === roomId) {
      setSelectedRoom(null);
      setShowJoinModal(false);
    }
    
    logger.info('Room removed from list:', roomId);
  };

  if (!groupStudyEnabled) {
    return null;
  }

  if (selectedRoom && !showJoinModal) {
    return (
      <StudyRoom
        roomId={selectedRoom}
        onLeave={() => setSelectedRoom(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Group Study Rooms</h1>
            <p className="text-sm text-emerald-600 font-medium mt-1">BETA</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={20} />
            Create Room
          </button>
        </div>

        <StudyRoomList
          rooms={rooms}
          loading={loading}
          onJoinRoom={handleJoinRoom}
          onRoomDeleted={handleRoomDeleted}
        />

        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
          />
        )}

        {showJoinModal && (
          <JoinRoomModal
            onJoin={handleJoinWithOptions}
            onCancel={() => {
              setShowJoinModal(false);
              setSelectedRoom(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
