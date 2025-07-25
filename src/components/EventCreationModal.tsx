import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { EventType, Event } from '../types/index';

interface TimeBlock {
  id: string;
  start: Date;
  end: Date;
  type: EventType;
  available: boolean;
}

interface EventCreationModalProps {
  timeBlock: TimeBlock;
  onClose: () => void;
  onSubmit: (title: string, description: string, type: EventType) => void;
  isOpen: boolean;
  editingEvent?: Event | null;
}

export default function EventCreationModal({ timeBlock, onClose, onSubmit, isOpen, editingEvent }: EventCreationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>(timeBlock.type);

  // Update form when editing event
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setType(editingEvent.type);
    } else {
      setTitle('');
      setDescription('');
      setType(timeBlock.type);
    }
  }, [editingEvent, timeBlock.type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title, description, type);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editingEvent ? 'Edit Event' : 'Schedule New Event'}
          </h3>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="block font-medium">{format(timeBlock.start, 'EEEE, MMMM d, yyyy')}</span>
              <span className="block">
                {format(timeBlock.start, 'h:mm a')} - {format(timeBlock.end, 'h:mm a')}
              </span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., Study Session, Team Meeting"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Add details about this event..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('academic')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      type === 'academic'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Academic
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('career')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      type === 'career'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Career
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('wellness')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      type === 'wellness'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Wellness
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('social')}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      type === 'social'
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-800 dark:text-pink-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Social
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!title.trim()}
              >
                {editingEvent ? 'Update Event' : 'Schedule Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 