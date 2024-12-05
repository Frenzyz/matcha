import React, { useState } from 'react';
import { Video, Mic, X } from 'lucide-react';

interface JoinRoomModalProps {
  onJoin: (withVideo: boolean, withAudio: boolean) => void;
  onCancel: () => void;
}

export default function JoinRoomModal({ onJoin, onCancel }: JoinRoomModalProps) {
  const [withVideo, setWithVideo] = useState(true);
  const [withAudio, setWithAudio] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">Join Study Room</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <button
              onClick={() => setWithVideo(!withVideo)}
              className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                withVideo
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className={withVideo ? 'text-emerald-500' : 'text-gray-400'} />
                <span className={`font-medium ${withVideo ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  Join with Video
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 ${
                withVideo 
                  ? 'border-emerald-500 bg-emerald-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {withVideo && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setWithAudio(!withAudio)}
              className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                withAudio
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mic className={withAudio ? 'text-emerald-500' : 'text-gray-400'} />
                <span className={`font-medium ${withAudio ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  Join with Audio
                </span>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 ${
                withAudio 
                  ? 'border-emerald-500 bg-emerald-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {withAudio && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onJoin(withVideo, withAudio)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}