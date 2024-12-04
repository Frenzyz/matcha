import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MapPin, Clock, Pen, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Event } from '../../types';

interface TimelineEventProps {
  event: Event & { width: number; left: number };
  position: {
    top: string;
    height: string;
    left: string;
    width: string;
    minHeight: string;
  };
  isDarkMode: boolean;
  isEditing: boolean;
  onEdit: (event: Event) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void>;
  editingEvent: Event | null;
  setEditingEvent: (event: Event | null) => void;
  isDeleting: boolean;
  error: string | null;
}

export default function TimelineEvent({
  event,
  position,
  isDarkMode,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  editingEvent,
  setEditingEvent,
  isDeleting,
  error
}: TimelineEventProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    try {
      setIsRemoving(true);
      await onDelete(event.id);
    } catch (err) {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className={`absolute rounded-lg shadow-sm transition-all duration-300 ${
        isEditing ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800 z-20' : ''
      } ${isRemoving ? 'opacity-0 scale-95 pointer-events-none' : ''}`}
      style={{
        ...position,
        backgroundColor: event.color || '#10B981'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`p-2 h-full ${isEditing ? 'bg-white/95 dark:bg-gray-800/95 rounded-lg' : ''}`}>
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={editingEvent?.title || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent!, title: e.target.value })}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input
                type="text"
                value={editingEvent?.location || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent!, location: e.target.value })}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={format(parseISO(editingEvent?.start_time || ''), 'HH:mm')}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(editingEvent?.start_time || '');
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setEditingEvent({
                      ...editingEvent!,
                      start_time: newDate.toISOString()
                    });
                  }}
                  className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
                <span className="text-sm">to</span>
                <input
                  type="time"
                  value={format(parseISO(editingEvent?.end_time || ''), 'HH:mm')}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(editingEvent?.end_time || '');
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setEditingEvent({
                      ...editingEvent!,
                      end_time: newDate.toISOString()
                    });
                  }}
                  className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onCancel}
                className="p-1 hover:bg-black/10 rounded"
              >
                <X size={14} />
              </button>
              <button
                onClick={onSave}
                className="p-1 hover:bg-black/10 rounded"
              >
                <Save size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-start gap-1">
              <h4 className="font-medium text-sm" title={event.title}>
                {event.title}
              </h4>
              <div className="flex gap-0.5 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(event);
                  }}
                  className="p-0.5 hover:bg-black/10 rounded"
                >
                  <Pen size={12} />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`p-0.5 hover:bg-black/10 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs mt-0.5">
              {format(parseISO(event.start_time), 'h:mm a')}
            </p>
            {event.location && (
              <p className="text-xs mt-0.5 flex items-center gap-0.5">
                <MapPin size={10} />
                <span className="truncate" title={event.location}>
                  {event.location}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}