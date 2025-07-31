import React, { useState, useEffect } from 'react';
import { Users, Clock, Trash2, Crown, Shield } from 'lucide-react';
import { StudyRoom } from '../../types/study-room';
import { StudyRoomEnhanced } from '../../types/enhanced-study';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { enhancedRoomMatchingService } from '../../services/enhancedRoomMatching';
import DeleteRoomModal from './DeleteRoomModal';
import { logger } from '../../utils/logger';

interface StudyRoomListProps {
  rooms: (StudyRoom | StudyRoomEnhanced)[];
  loading: boolean;
  onJoinRoom: (roomId: string) => void;
  onRoomDeleted?: (roomId: string) => void;
}

export default function StudyRoomList({ rooms, loading, onJoinRoom, onRoomDeleted }: StudyRoomListProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletePermissions, setDeletePermissions] = useState<{ [roomId: string]: boolean }>({});
  const [roomToDelete, setRoomToDelete] = useState<StudyRoomEnhanced | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check admin status and delete permissions
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;

      try {
        // Check admin status
        const adminStatus = await enhancedRoomMatchingService.isUserAdmin();
        setIsAdmin(adminStatus);

        // Check delete permissions for each room
        const permissions: { [roomId: string]: boolean } = {};
        await Promise.all(
          rooms.map(async (room) => {
            const canDelete = await enhancedRoomMatchingService.canDeleteRoom(room.id);
            permissions[room.id] = canDelete;
          })
        );
        setDeletePermissions(permissions);
      } catch (error) {
        logger.error('Error checking permissions:', error);
      }
    };

    checkPermissions();
  }, [user, rooms]);

  const handleDeleteClick = (room: StudyRoom | StudyRoomEnhanced) => {
    // Convert to StudyRoomEnhanced if needed
    const enhancedRoom: StudyRoomEnhanced = {
      ...room,
      created_by: room.created_by || '',
      max_participants: (room as any).max_participants || 10,
      study_type: (room as any).study_type || 'general',
      difficulty_level: (room as any).difficulty_level || 'beginner',
      tags: (room as any).tags || [],
      is_private: (room as any).is_private || false,
      updated_at: room.updated_at || room.created_at
    };
    setRoomToDelete(enhancedRoom);
  };

  const handleDeleteConfirm = async (roomId: string) => {
    setIsDeleting(true);
    try {
      await enhancedRoomMatchingService.deleteRoom(roomId);
      setRoomToDelete(null);
      onRoomDeleted?.(roomId);
      logger.info('Room deleted successfully:', roomId);
    } catch (error) {
      logger.error('Error deleting room:', error);
      // You could add a toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No study rooms available. Create one to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const isCreator = room.created_by === user?.id;
          const canDelete = deletePermissions[room.id];
          
          return (
            <div
              key={room.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 transform hover:scale-[1.02]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{room.name}</h3>
                    {isCreator && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {isAdmin && !isCreator && (
                      <Shield className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{room.subject}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                    {room.status}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteClick(room)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title={isAdmin && !isCreator ? "Delete as admin" : "Delete your room"}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {room.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {room.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Users size={16} />
                  <span>{room.participant_count || 0} participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock size={16} />
                  <span>Created {formatDistanceToNow(new Date(room.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              <button
                onClick={() => onJoinRoom(room.id)}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Join Room
              </button>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <DeleteRoomModal
          room={roomToDelete}
          isOpen={!!roomToDelete}
          onClose={() => setRoomToDelete(null)}
          onConfirm={handleDeleteConfirm}
          isAdmin={isAdmin}
          isCreator={roomToDelete.created_by === user?.id}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
