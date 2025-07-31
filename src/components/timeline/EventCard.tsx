import React from 'react';
import { MapPin, Pen, Trash2, Save, X as Close } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Event } from '../../types/index';

interface EventCardProps {
  event: Event;
  position: {
    top: string;
    height: string;
    left: string;
    width: string;
    minHeight: string;
  };
  isEditing: boolean;
  isDarkMode: boolean;
  onEdit: (event: Event) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  editingEvent: Event | null;
  setEditingEvent: (event: Event | null) => void;
}

export default function EventCard({
  event,
  position,
  isEditing,
  isDarkMode,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  editingEvent,
  setEditingEvent
}: EventCardProps) {
  const getEventColor = (type: string) => {
    return isDarkMode
      ? {
          academic: 'bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/30',
          career: 'bg-blue-900/20 text-blue-300 hover:bg-blue-900/30',
          wellness: 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
        }[type] || 'bg-gray-900/20 text-gray-300 hover:bg-gray-900/30'
      : {
          academic: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
          career: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
          wellness: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }[type] || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  const formatTitle = (title: string) => {
    if (title.length <= 24) return title;
    return title.substring(0, 21) + '...';
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a clean event object without layout properties
    const cleanEvent = {
      id: event.id,
      user_id: event.user_id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: event.start_time,
      end_time: event.end_time,
      type: event.type,
      status: event.status,
      source: event.source,
      google_event_id: event.google_event_id
    };
    onEdit(cleanEvent);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(event.id);
  };

  return (
    <div
      className={`absolute rounded-lg shadow-sm transition-all cursor-pointer ${
        isEditing ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800 z-20' : ''
      } ${getEventColor(event.type)}`}
      style={position}
      onClick={handleEdit}
    >
      <div className={`p-2 h-full ${isEditing ? 'bg-white/95 dark:bg-gray-800/95 rounded-lg' : ''}`}>
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium">Title</label>
              <input
                type="text"
                value={editingEvent?.title || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent!, title: e.target.value })}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Location</label>
              <input
                type="text"
                value={editingEvent?.location || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent!, location: e.target.value })}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium">Time</label>
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
                  onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="p-1 hover:bg-black/10 rounded"
              >
                <Close size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
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
                {formatTitle(event.title)}
              </h4>
              <div className="flex gap-0.5 flex-shrink-0">
                <button
                  onClick={handleEdit}
                  className="p-0.5 hover:bg-black/10 rounded"
                >
                  <Pen size={12} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-0.5 hover:bg-black/10 rounded"
                >
                  <Trash2 size={12} />
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
                  {formatTitle(event.location)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
