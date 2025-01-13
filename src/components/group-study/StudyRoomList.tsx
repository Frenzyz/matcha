import React from 'react';
import { Users, Clock } from 'lucide-react';
import { StudyRoom } from '../../types/study-room';
import { formatDistanceToNow } from 'date-fns';

interface StudyRoomListProps {
  rooms: StudyRoom[];
  loading: boolean;
  onJoinRoom: (roomId: string) => void;
}

export default function StudyRoomList({ rooms, loading, onJoinRoom }: StudyRoomListProps) {
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 transform hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg">{room.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{room.subject}</p>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
              {room.status}
            </span>
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
      ))}
    </div>
  );
}
