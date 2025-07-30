import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { StudyRoomEnhanced } from '../../types/enhanced-study';

interface DeleteRoomModalProps {
  room: StudyRoomEnhanced;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: string) => void;
  isAdmin?: boolean;
  isCreator?: boolean;
  isDeleting?: boolean;
}

export default function DeleteRoomModal({
  room,
  isOpen,
  onClose,
  onConfirm,
  isAdmin = false,
  isCreator = false,
  isDeleting = false
}: DeleteRoomModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'DELETE';

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmText === requiredText) {
      onConfirm(room.id);
    }
  };

  const canConfirm = confirmText === requiredText && !isDeleting;

  const getRoleText = () => {
    if (isAdmin && isCreator) return 'Admin & Creator';
    if (isAdmin) return 'Admin';
    if (isCreator) return 'Creator';
    return 'User';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Delete Study Room
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">This action cannot be undone</p>
              <p>All messages and room data will be permanently deleted.</p>
            </div>
          </div>

          {/* Room Details */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Room Details:</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium">Name:</span> {room.name}</p>
              <p><span className="font-medium">Subject:</span> {room.subject}</p>
              <p><span className="font-medium">Participants:</span> {room.participant_count || 0}</p>
              <p><span className="font-medium">Your Role:</span> {getRoleText()}</p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{requiredText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-red-500 focus:border-red-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Type DELETE to confirm"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                       rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center space-x-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete Room</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}